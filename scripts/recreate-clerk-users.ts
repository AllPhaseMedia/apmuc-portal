/**
 * Re-creates Clerk users in the production instance from existing
 * ClientContact records and updates clerkUserId references.
 *
 * Users will need to use "Forgot Password" or Google OAuth to sign in
 * since original password hashes are not available.
 *
 * Required env vars:
 *   CLERK_SECRET_KEY  (production Clerk key)
 *   DATABASE_URL      (Neon Postgres)
 *   ADMIN_CLERK_ID    (skip this user — already exists)
 *
 * Usage:
 *   CLERK_SECRET_KEY="sk_live_..." \
 *   DATABASE_URL="postgresql://..." \
 *   ADMIN_CLERK_ID="user_3A3QAf11lF9oyoVvBmZOf1e2txD" \
 *   npx tsx scripts/recreate-clerk-users.ts
 */

import { createClerkClient } from "@clerk/backend";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

const ADMIN_CLERK_ID = process.env.ADMIN_CLERK_ID || "";

async function main() {
  console.log("=== Recreate Clerk Users for Production ===\n");

  // 1. Get all ClientContact records
  const contacts = await prisma.clientContact.findMany({
    include: { client: true },
  });

  console.log(`Found ${contacts.length} ClientContact records.\n`);

  let created = 0;
  let linked = 0;
  let skipped = 0;
  let errors = 0;

  // Group by email to avoid creating duplicate Clerk users
  const emailMap = new Map<string, typeof contacts>();
  for (const c of contacts) {
    const email = c.email.toLowerCase().trim();
    if (!emailMap.has(email)) {
      emailMap.set(email, []);
    }
    emailMap.get(email)!.push(c);
  }

  console.log(`Unique emails: ${emailMap.size}\n`);

  for (const [email, contactGroup] of emailMap) {
    // Skip admin user
    if (contactGroup.some(c => c.clerkUserId === ADMIN_CLERK_ID)) {
      console.log(`  SKIP (admin): ${email}`);
      skipped++;
      continue;
    }

    try {
      // Check if user already exists in production Clerk
      const existing = await clerk.users.getUserList({
        emailAddress: [email],
      });

      let clerkUserId: string;

      if (existing.data.length > 0) {
        clerkUserId = existing.data[0].id;
        console.log(`  EXISTS: ${email} → ${clerkUserId}`);
      } else {
        // Create user in production Clerk (no password — will use reset/OAuth)
        const nameParts = contactGroup[0].name.split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        const clerkUser = await clerk.users.createUser({
          emailAddress: [email],
          firstName,
          lastName,
          skipPasswordChecks: true,
          skipPasswordRequirement: true,
        });

        clerkUserId = clerkUser.id;
        console.log(`  CREATE: ${email} → ${clerkUserId} (${firstName} ${lastName})`);
        created++;
      }

      // Update all ClientContact records for this email
      for (const contact of contactGroup) {
        if (contact.clerkUserId !== clerkUserId) {
          await prisma.clientContact.update({
            where: { id: contact.id },
            data: { clerkUserId },
          });
          console.log(`    → Updated contact ${contact.id} (client: ${contact.client.name})`);
          linked++;
        }
      }
    } catch (err) {
      console.error(`  ERROR: ${email} —`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  await prisma.$disconnect();

  console.log(`\n=== Migration Complete ===`);
  console.log(`  Created: ${created}`);
  console.log(`  Linked:  ${linked}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors:  ${errors}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
