/**
 * Create Clerk accounts for Stripe customers with active subscriptions
 * who don't yet have portal accounts.
 * Usage: node scripts/create-missing-users.mjs
 */
import Stripe from "stripe";
import { createClerkClient } from "@clerk/backend";
import { randomBytes } from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const DRY_RUN = process.argv.includes("--dry-run");

async function getActiveSubscriptionCustomers() {
  const customerEmails = new Map();
  let startingAfter;

  for (;;) {
    const page = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.customer"],
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const sub of page.data) {
      const customer = sub.customer;
      if (typeof customer === "object" && customer.email) {
        customerEmails.set(customer.id, {
          email: customer.email.toLowerCase(),
          name: customer.name || customer.email,
        });
      }
    }

    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1].id;
  }

  return customerEmails;
}

async function getAllClerkEmails() {
  const emails = new Set();
  let offset = 0;

  for (;;) {
    const users = await clerk.users.getUserList({ limit: 100, offset });
    for (const u of users.data) {
      for (const e of u.emailAddresses) {
        emails.add(e.emailAddress.toLowerCase());
      }
    }
    if (users.data.length < 100) break;
    offset += 100;
  }

  return emails;
}

const [stripeCustomers, clerkEmails] = await Promise.all([
  getActiveSubscriptionCustomers(),
  getAllClerkEmails(),
]);

const missing = [];
for (const [custId, { email, name }] of stripeCustomers) {
  if (!clerkEmails.has(email)) {
    missing.push({ email, name, custId });
  }
}

console.log(`Missing users to create: ${missing.length}`);
if (DRY_RUN) console.log("(DRY RUN — no accounts will be created)\n");

// Manual name corrections for business names from Stripe
const nameOverrides = {
  "angelolax3@aol.com": { firstName: "Angelo", lastName: "" },
  "catieringhoff@gmail.com": { firstName: "Catie", lastName: "Ringhoff" },
  "imperialpartyrentalsli@gmail.com": { firstName: "Imperial", lastName: "Party Rentals" },
  "invoices@sansonefoods.com": { firstName: "La Marca", lastName: "Sansone" },
  "katg.local338@outlook.com": { firstName: "Kat", lastName: "G" },
  "kcobb@ll1943.org": { firstName: "K", lastName: "Cobb" },
  "melissa.scheid@mmamn.org": { firstName: "Melissa", lastName: "Scheid" },
  "nalcbranch30@sbcglobal.net": { firstName: "NALC", lastName: "Branch 30" },
  "rsint@sachemsoccer.org": { firstName: "Sachem", lastName: "Soccer" },
  "sbrayton@ufcw496.org": { firstName: "S", lastName: "Brayton" },
  "smiller579@bill.com": { firstName: "S", lastName: "Miller" },
  "treasurer.c238@gmail.com": { firstName: "Kyle", lastName: "Walters" },
  "treasurer@afgelocal704.org": { firstName: "AFGE", lastName: "Local 704" },
};

for (const { email, name, custId } of missing.sort((a, b) => a.email.localeCompare(b.email))) {
  const override = nameOverrides[email];
  let firstName, lastName;
  if (override) {
    firstName = override.firstName;
    lastName = override.lastName;
  } else {
    const parts = name.trim().split(/\s+/);
    firstName = parts[0] || name;
    lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
  }
  const password = randomBytes(16).toString("base64url");

  if (DRY_RUN) {
    console.log(`  Would create: ${email} (${firstName} ${lastName}) [${custId}]`);
    continue;
  }

  try {
    const user = await clerk.users.createUser({
      emailAddress: [email],
      firstName,
      lastName,
      password,
      skipPasswordChecks: true,
    });
    console.log(`  Created: ${email} (${user.id})`);
  } catch (err) {
    const msg = err.errors?.[0]?.message || err.message;
    console.error(`  FAILED: ${email} — ${msg}`);
  }
}

console.log("\nDone.");
