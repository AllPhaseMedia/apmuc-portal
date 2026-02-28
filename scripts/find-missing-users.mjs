/**
 * Find Stripe customers with active subscriptions who don't have portal (Clerk) accounts.
 * Usage: node scripts/find-missing-users.mjs
 */
import Stripe from "stripe";
import { createClerkClient } from "@clerk/backend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// 1. Get all active subscriptions from Stripe
async function getActiveSubscriptionCustomers() {
  const customerEmails = new Map(); // customerId -> email
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

// 2. Get all Clerk users
async function getAllClerkUsers() {
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

// Run
const [stripeCustomers, clerkEmails] = await Promise.all([
  getActiveSubscriptionCustomers(),
  getAllClerkUsers(),
]);

console.log(`Stripe customers with active subscriptions: ${stripeCustomers.size}`);
console.log(`Clerk users: ${clerkEmails.size}`);
console.log("");

const missing = [];
const matched = [];

for (const [custId, { email, name }] of stripeCustomers) {
  if (clerkEmails.has(email)) {
    matched.push({ email, name, custId });
  } else {
    missing.push({ email, name, custId });
  }
}

console.log(`Matched (have portal account): ${matched.length}`);
console.log(`Missing (need portal account): ${missing.length}`);
console.log("");

if (missing.length > 0) {
  console.log("Missing users:");
  for (const m of missing.sort((a, b) => a.email.localeCompare(b.email))) {
    console.log(`  ${m.email} (${m.name}) [${m.custId}]`);
  }
}
