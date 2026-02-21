/**
 * One-time migration: copy Client.clerkUserId/email into ClientContact records.
 *
 * For each Client that has clerkUserId set, creates a ClientContact with
 * isPrimary: true (if one doesn't already exist for that clientId + clerkUserId).
 *
 * For each ClientContact with clerkUserId = null, attempts to find the Clerk user
 * by email and set the clerkUserId.
 *
 * Run BEFORE the schema migration that removes Client.email/clerkUserId.
 *
 * Usage:
 *   npx tsx scripts/migrate-to-contacts.ts
 */

import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";

const prisma = new PrismaClient();
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

async function main() {
  console.log("=== Migrate Client → ClientContact ===\n");

  let created = 0;
  let skipped = 0;
  let linked = 0;
  let warnings = 0;

  // Step 1: For each Client with clerkUserId, ensure a primary ClientContact exists
  const clientsWithClerk = await prisma.client.findMany({
    where: { clerkUserId: { not: null } },
  });

  console.log(`Found ${clientsWithClerk.length} clients with clerkUserId.\n`);

  for (const client of clientsWithClerk) {
    const clerkUserId = client.clerkUserId!;

    // Check if a contact already exists for this client + clerkUserId
    const existing = await prisma.clientContact.findFirst({
      where: { clientId: client.id, clerkUserId },
    });

    if (existing) {
      console.log(`  SKIP: ${client.name} — contact already exists (${existing.id})`);
      skipped++;
      continue;
    }

    // Look up Clerk user for name
    let name = client.name;
    try {
      const clerkUser = await clerk.users.getUser(clerkUserId);
      const fullName = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim();
      if (fullName) name = fullName;
    } catch {
      // Use client name as fallback
    }

    await prisma.clientContact.create({
      data: {
        clientId: client.id,
        clerkUserId,
        email: client.email,
        name,
        isPrimary: true,
        canDashboard: true,
        canBilling: true,
        canAnalytics: true,
        canUptime: true,
        canSupport: true,
        canSiteHealth: true,
        isActive: true,
      },
    });

    console.log(`  CREATE: ${client.name} → primary contact (${clerkUserId})`);
    created++;
  }

  // Step 2: For each ClientContact without clerkUserId, try to find by email in Clerk
  const unlinkedContacts = await prisma.clientContact.findMany({
    where: { clerkUserId: null },
  });

  console.log(`\nFound ${unlinkedContacts.length} unlinked contacts.\n`);

  for (const contact of unlinkedContacts) {
    try {
      const users = await clerk.users.getUserList({
        emailAddress: [contact.email],
      });

      if (users.data.length > 0) {
        await prisma.clientContact.update({
          where: { id: contact.id },
          data: { clerkUserId: users.data[0].id },
        });
        console.log(`  LINK: ${contact.email} → ${users.data[0].id}`);
        linked++;
      } else {
        console.log(`  WARN: ${contact.email} — no Clerk user found`);
        warnings++;
      }
    } catch (err) {
      console.log(`  WARN: ${contact.email} — Clerk lookup failed: ${err instanceof Error ? err.message : err}`);
      warnings++;
    }
  }

  await prisma.$disconnect();

  console.log(`\n=== Migration Complete ===`);
  console.log(`  Created:  ${created}`);
  console.log(`  Skipped:  ${skipped} (already existed)`);
  console.log(`  Linked:   ${linked}`);
  console.log(`  Warnings: ${warnings}`);
  console.log(`\nNext: Run schema migration to remove Client.email/clerkUserId.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
