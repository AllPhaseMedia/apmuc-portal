/**
 * One-time WordPress → Clerk user migration script.
 *
 * Imports ALL WordPress users into Clerk with phpass password import
 * so existing WP passwords continue to work. If a matching Client or
 * ClientContact record exists, it auto-links. Otherwise, linking
 * happens automatically later when you create Clients in the admin panel
 * (via the Clerk webhook or on first login).
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
    "SELECT user_email, display_name, user_pass FROM wpno_users"
  );
  const wpUsers = rows as unknown as WPUser[];
  console.log(`Found ${wpUsers.length} WordPress users.\n`);

  let created = 0;
  let skipped = 0;
  let linked = 0;
  let errors = 0;

  for (const wpUser of wpUsers) {
    const email = wpUser.user_email.toLowerCase().trim();
    if (!email) {
      console.log(`  SKIP: empty email`);
      skipped++;
      continue;
    }

    // 3. Check if Clerk user already exists for this email
    const existingClerkUsers = await clerk.users.getUserList({
      emailAddress: [email],
    });

    if (existingClerkUsers.data.length > 0) {
      const clerkId = existingClerkUsers.data[0].id;
      console.log(`  EXISTS: ${email} — Clerk user ${clerkId}`);

      // Update cached email/name on existing ClientContact records
      const contactResult = await prisma.clientContact.updateMany({
        where: { email, clerkUserId: null },
        data: { clerkUserId: clerkId },
      });
      if (contactResult.count > 0) {
        console.log(`    → Linked to ${contactResult.count} ClientContact(s)`);
        linked++;
      }

      skipped++;
      continue;
    }

    // 4. Create Clerk user with appropriate password hasher
    try {
      const nameParts = wpUser.display_name.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Detect hash format:
      // $P$ or $H$ = phpass (older WP)
      // $wp$2y$ = WordPress bcrypt (newer WP) — strip $wp prefix for standard bcrypt
      let passwordHasher: "phpass" | "bcrypt";
      let passwordDigest: string;

      if (wpUser.user_pass.startsWith("$wp$")) {
        passwordHasher = "bcrypt";
        passwordDigest = wpUser.user_pass.replace(/^\$wp\$/, "$");
      } else {
        passwordHasher = "phpass";
        passwordDigest = wpUser.user_pass;
      }

      const clerkUser = await clerk.users.createUser({
        emailAddress: [email],
        firstName,
        lastName,
        passwordHasher,
        passwordDigest,
        skipPasswordChecks: true,
      });

      console.log(`  CREATE: ${email} → Clerk user ${clerkUser.id}`);

      // 5. Auto-link to ClientContact records if they exist
      const contactResult = await prisma.clientContact.updateMany({
        where: { email, clerkUserId: null },
        data: { clerkUserId: clerkUser.id },
      });
      if (contactResult.count > 0) {
        console.log(`    → Linked to ${contactResult.count} ClientContact(s)`);
        linked++;
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
  console.log(`  Skipped: ${skipped} (already in Clerk)`);
  console.log(`  Linked:  ${linked}`);
  console.log(`  Errors:  ${errors}`);
  console.log(`\nNext: Create Clients in the admin panel. Users will auto-link by email when they log in.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
