"use server";

import { cookies } from "next/headers";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, isConfigured as stripeConfigured } from "@/lib/stripe";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const IMPERSONATE_COOKIE = "apmuc_impersonate";

export async function startImpersonation(clerkUserId: string) {
  await requireAdmin();

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_COOKIE, clerkUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4, // 4 hours
  });

  revalidatePath("/");
  return { success: true };
}

export async function stopImpersonation() {
  await requireAdmin();

  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATE_COOKIE);

  revalidatePath("/");
  return { success: true };
}

export type ClerkUserInfo = {
  id: string;
  email: string;
  name: string;
  role: string;
  tags: string[];
  imageUrl: string;
  lastSignInAt: number | null;
  linkedClients: { id: string; name: string }[];
  isStripeCustomer: boolean;
};

async function getActiveSubscriptionEmails(): Promise<Set<string>> {
  if (!stripeConfigured()) return new Set();

  const emails = new Set<string>();
  let startingAfter: string | undefined;

  for (;;) {
    const page = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.customer"],
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const sub of page.data) {
      const customer = sub.customer;
      if (typeof customer === "object" && "email" in customer && customer.email) {
        emails.add(customer.email.toLowerCase());
      }
    }

    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1].id;
  }

  return emails;
}

export async function listClerkUsers(): Promise<ClerkUserInfo[]> {
  await requireStaff();

  const clerk = await clerkClient();
  const users = [];
  let offset = 0;
  for (;;) {
    const { data } = await clerk.users.getUserList({
      limit: 100,
      orderBy: "-last_sign_in_at",
      offset,
    });
    users.push(...data);
    if (data.length < 100) break;
    offset += 100;
  }

  // Batch-fetch client contacts and Stripe emails in parallel
  const clerkIds = users.map((u) => u.id);
  const [contacts, stripeEmails] = await Promise.all([
    prisma.clientContact.findMany({
      where: { clerkUserId: { in: clerkIds }, isActive: true },
      select: {
        clerkUserId: true,
        client: { select: { id: true, name: true } },
      },
    }),
    getActiveSubscriptionEmails(),
  ]);

  // Group by clerkUserId
  const contactsByUser = new Map<string, { id: string; name: string }[]>();
  for (const c of contacts) {
    const list = contactsByUser.get(c.clerkUserId) ?? [];
    list.push({ id: c.client.id, name: c.client.name });
    contactsByUser.set(c.clerkUserId, list);
  }

  return users.map((u) => {
    const meta = u.publicMetadata as Record<string, unknown>;
    const rawRole = (meta?.role as string) ?? "client";
    // Normalize legacy "employee" metadata to "team_member"
    const role = rawRole === "employee" ? "team_member" : rawRole;
    const tags = Array.isArray(meta?.tags) ? (meta.tags as string[]) : [];
    const email = u.emailAddresses[0]?.emailAddress ?? "";
    return {
      id: u.id,
      email,
      name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || (email || "Unknown"),
      role,
      tags,
      imageUrl: u.imageUrl,
      lastSignInAt: u.lastSignInAt,
      linkedClients: contactsByUser.get(u.id) ?? [],
      isStripeCustomer: stripeEmails.has(email.toLowerCase()),
    };
  });
}

export async function setUserTags(clerkUserId: string, tags: string[]) {
  await requireStaff();

  // Persist any new tag names to the Tag dictionary
  const trimmed = tags.map((t) => t.trim()).filter(Boolean);
  if (trimmed.length > 0) {
    await Promise.all(
      trimmed.map((name) =>
        prisma.tag.upsert({
          where: { name },
          create: { name },
          update: {},
        })
      )
    );
  }

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(clerkUserId, {
    publicMetadata: { tags: trimmed },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function setUserRole(clerkUserId: string, role: "admin" | "team_member" | "client") {
  await requireAdmin();

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(clerkUserId, {
    publicMetadata: { role: role === "client" ? undefined : role },
  });

  revalidatePath("/admin/users");
  return { success: true };
}
