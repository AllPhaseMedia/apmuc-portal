import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";
import type Stripe from "stripe";

export const maxDuration = 300;

// --- HubSpot helpers ---

async function hubspotSearchContact(
  email: string,
  token: string
): Promise<string | null> {
  const res = await fetch(
    "https://api.hubapi.com/crm/v3/objects/contacts/search",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              { propertyName: "email", operator: "EQ", value: email },
            ],
          },
        ],
        properties: ["email"],
        limit: 1,
      }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const contactId = data.results?.[0]?.id;
  return contactId ?? null;
}

async function hubspotGetCompanyName(
  contactId: string,
  token: string
): Promise<string | null> {
  // Get company associations for this contact
  const assocRes = await fetch(
    `https://api.hubapi.com/crm/v4/objects/contacts/${contactId}/associations/companies`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!assocRes.ok) return null;
  const assocData = await assocRes.json();
  const companyId = assocData.results?.[0]?.toObjectId;
  if (!companyId) return null;

  // Get company name
  const companyRes = await fetch(
    `https://api.hubapi.com/crm/v3/objects/companies/${companyId}?properties=name`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!companyRes.ok) return null;
  const companyData = await companyRes.json();
  return companyData.properties?.name || null;
}

async function resolveClientName(
  customer: Stripe.Customer,
  hubspotToken: string | undefined
): Promise<{ name: string; source: string; needsReview: boolean }> {
  const email = customer.email;

  // 1. Try HubSpot company name
  if (hubspotToken && email) {
    try {
      const contactId = await hubspotSearchContact(email, hubspotToken);
      if (contactId) {
        const companyName = await hubspotGetCompanyName(contactId, hubspotToken);
        if (companyName) {
          return { name: companyName, source: "hubspot", needsReview: false };
        }
      }
    } catch {
      // HubSpot lookup failed, fall through to fallbacks
    }
  }

  // 2. Try Stripe address.line1 if it looks like a business name
  //    (doesn't start with a digit = not a street address)
  const line1 = customer.address?.line1?.trim();
  if (line1 && !/^\d/.test(line1) && line1.length > 2) {
    return { name: line1, source: "stripe_address", needsReview: true };
  }

  // 3. Fall back to Stripe customer name
  if (customer.name) {
    return { name: customer.name, source: "stripe_name", needsReview: true };
  }

  // 4. Last resort: email
  return {
    name: email || customer.id,
    source: "email_fallback",
    needsReview: true,
  };
}

// --- Pagination helpers ---

async function fetchAllStripeCustomers(): Promise<Stripe.Customer[]> {
  const all: Stripe.Customer[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const page = await stripe.customers.list({
      limit: 100,
      ...(startingAfter && { starting_after: startingAfter }),
    });
    all.push(...page.data);
    hasMore = page.has_more;
    if (page.data.length > 0) {
      startingAfter = page.data[page.data.length - 1].id;
    }
  }
  return all;
}

type ClerkUser = { id: string; email: string; name: string };

async function fetchAllClerkUsers(): Promise<ClerkUser[]> {
  const clerk = await clerkClient();
  const all: ClerkUser[] = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const page = await clerk.users.getUserList({ limit, offset });
    for (const u of page.data) {
      const email = u.emailAddresses[0]?.emailAddress;
      if (!email) continue;
      const name =
        `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || email;
      all.push({ id: u.id, email, name });
    }
    if (page.data.length < limit) break;
    offset += limit;
  }
  return all;
}

// --- Main handler ---

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;

  // 1. Fetch all Stripe customers
  const customers = await fetchAllStripeCustomers();

  // 2. Get existing clients keyed by stripeCustomerId
  const existingClients = await prisma.client.findMany({
    where: { stripeCustomerId: { not: null } },
    select: { id: true, stripeCustomerId: true },
  });
  const existingByStripeId = new Map(
    existingClients.map((c) => [c.stripeCustomerId!, c.id])
  );

  // 3. Build Clerk user lookup by email
  const clerkUsers = await fetchAllClerkUsers();
  const clerkByEmail = new Map(
    clerkUsers.map((u) => [u.email.toLowerCase(), u])
  );

  // 4. Process each Stripe customer
  const created: object[] = [];
  const skipped: object[] = [];
  const needsReview: object[] = [];
  const errors: object[] = [];

  for (const customer of customers) {
    // Skip deleted customers
    if (customer.deleted) continue;

    const stripeId = customer.id;
    const email = customer.email?.toLowerCase() ?? null;

    // Skip if Client already exists for this Stripe ID
    if (existingByStripeId.has(stripeId)) {
      skipped.push({
        stripeId,
        email,
        stripeName: customer.name,
        reason: "client_exists",
      });
      continue;
    }

    try {
      // Resolve client name
      const resolved = await resolveClientName(customer, hubspotToken);

      // Create Client
      const client = await prisma.client.create({
        data: {
          name: resolved.name,
          stripeCustomerId: stripeId,
          isActive: true,
        },
      });

      // Try to link a Clerk user
      let linkedUser: string | null = null;
      if (email) {
        const clerkUser = clerkByEmail.get(email);
        if (clerkUser) {
          // Check if contact already exists (shouldn't, but be safe)
          const existing = await prisma.clientContact.findFirst({
            where: { clientId: client.id, clerkUserId: clerkUser.id },
          });
          if (!existing) {
            await prisma.clientContact.create({
              data: {
                clientId: client.id,
                clerkUserId: clerkUser.id,
                email: clerkUser.email,
                name: clerkUser.name,
              },
            });
            linkedUser = clerkUser.email;
          }
        }
      }

      const record = {
        stripeId,
        email,
        clientName: resolved.name,
        nameSource: resolved.source,
        clientId: client.id,
        linkedUser,
      };

      if (resolved.needsReview) {
        needsReview.push(record);
      } else {
        created.push(record);
      }
    } catch (err) {
      errors.push({
        stripeId,
        email,
        stripeName: customer.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    summary: {
      totalStripeCustomers: customers.length,
      created: created.length,
      needsReview: needsReview.length,
      skipped: skipped.length,
      errors: errors.length,
    },
    created,
    needsReview,
    skipped,
    errors,
  });
}
