/**
 * One-time WordPress → Clerk user migration script.
 *
 * Reads WordPress users, matches them to Client/ClientContact records,
 * and creates Clerk users with phpass password import so existing
 * WP passwords continue to work.
 *
 * Required env vars:
 *   WP_DB_HOST, WP_DB_PORT, WP_DB_USER, WP_DB_PASS, WP_DB_NAME
 *   CLERK_SECRET_KEY (already used by the app)
 *   DATABASE_URL     (already used by Prisma)
 *
 * Usage:
 *   npx tsx scripts/migrate-wordpress-users.ts
 */

import mysql from "mysql2/promise";
import { createClerkClient } from "@clerk/backend";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

type WPUser = {
  user_email: string;
  display_name: string;
  user_pass: string;
};

async function main() {
  console.log("=== WordPress → Clerk User Migration ===\n");

  // 1. Connect to WordPress MySQL
  const wpDb = await mysql.createConnection({
    host: process.env.WP_DB_HOST || "localhost",
    port: Number(process.env.WP_DB_PORT) || 3306,
    user: process.env.WP_DB_USER,
    password: process.env.WP_DB_PASS,
    database: process.env.WP_DB_NAME,
  });

  console.log("Connected to WordPress database.");

  // 2. Read WP users
  const [rows] = await wpDb.execute<mysql.RowDataPacket[]>(
    "SELECT user_email, display_name, user_pass FROM wp_users"
  );
  const wpUsers = rows as unknown as WPUser[];
  console.log(`Found ${wpUsers.length} WordPress users.\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const wpUser of wpUsers) {
    const email = wpUser.user_email.toLowerCase().trim();
    if (!email) {
      console.log(`  SKIP: empty email`);
      skipped++;
      continue;
    }

    // 3. Check if email matches a Client or ClientContact
    const client = await prisma.client.findUnique({ where: { email } });
    const contacts = await prisma.clientContact.findMany({ where: { email } });

    if (!client && contacts.length === 0) {
      console.log(`  SKIP: ${email} — no matching Client or ClientContact`);
      skipped++;
      continue;
    }

    // 4. Check if Clerk user already exists for this email
    const existingClerkUsers = await clerk.users.getUserList({
      emailAddress: [email],
    });

    if (existingClerkUsers.data.length > 0) {
      const clerkId = existingClerkUsers.data[0].id;
      console.log(`  SKIP: ${email} — Clerk user already exists (${clerkId})`);

      // Still link if not linked
      if (client && !client.clerkUserId) {
        await prisma.client.update({
          where: { id: client.id },
          data: { clerkUserId: clerkId },
        });
        console.log(`    → Linked to Client ${client.id}`);
      }
      if (contacts.length > 0) {
        await prisma.clientContact.updateMany({
          where: { email, clerkUserId: null },
          data: { clerkUserId: clerkId },
        });
        console.log(`    → Linked to ${contacts.length} ClientContact(s)`);
      }

      skipped++;
      continue;
    }

    // 5. Create Clerk user with phpass password import
    try {
      const nameParts = wpUser.display_name.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const clerkUser = await clerk.users.createUser({
        emailAddress: [email],
        firstName,
        lastName,
        passwordHasher: "phpass",
        passwordDigest: wpUser.user_pass,
        skipPasswordChecks: true,
      });

      console.log(`  CREATE: ${email} → Clerk user ${clerkUser.id}`);

      // 6. Link to Client record
      if (client && !client.clerkUserId) {
        await prisma.client.update({
          where: { id: client.id },
          data: { clerkUserId: clerkUser.id },
        });
        console.log(`    → Linked to Client ${client.id}`);
      }

      // 7. Link to ClientContact records
      if (contacts.length > 0) {
        await prisma.clientContact.updateMany({
          where: { email, clerkUserId: null },
          data: { clerkUserId: clerkUser.id },
        });
        console.log(`    → Linked to ${contacts.length} ClientContact(s)`);
      }

      created++;
    } catch (err) {
      console.error(`  ERROR: ${email} —`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  await wpDb.end();
  await prisma.$disconnect();

  console.log(`\n=== Migration Complete ===`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors:  ${errors}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
