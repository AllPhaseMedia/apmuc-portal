/**
 * Recreates WordPress users in the production Clerk instance.
 *
 * Reads users from the WordPress database, creates them in Clerk
 * with their original password hashes (so WP passwords still work),
 * and creates/updates ClientContact records to link them.
 *
 * Required env vars:
 *   WP_DB_HOST, WP_DB_PORT, WP_DB_USER, WP_DB_PASS, WP_DB_NAME
 *   CLERK_SECRET_KEY  (production)
 *   DATABASE_URL      (Neon Postgres)
 *   ADMIN_CLERK_ID    (skip this email — already set up)
 */

import mysql from "mysql2/promise";
import { createClerkClient } from "@clerk/backend";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

const ADMIN_CLERK_ID = process.env.ADMIN_CLERK_ID || "";

type WPUser = {
  user_email: string;
  display_name: string;
  user_pass: string;
};

async function main() {
  console.log("=== WordPress → Production Clerk Migration ===\n");

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

  // 3. Get existing ClientContact records
  const existingContacts = await prisma.clientContact.findMany();
  console.log(`Existing ClientContact records: ${existingContacts.length}`);

  // Find admin email to skip
  const adminContact = existingContacts.find(c => c.clerkUserId === ADMIN_CLERK_ID);
  const adminEmail = adminContact?.email.toLowerCase() || "";
  console.log(`Admin email (will skip): ${adminEmail}\n`);

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

    // Skip admin user
    if (email === adminEmail) {
      console.log(`  SKIP (admin): ${email}`);
      skipped++;
      continue;
    }

    try {
      // Check if user already exists in production Clerk
      const existingClerkUsers = await clerk.users.getUserList({
        emailAddress: [email],
      });

      let clerkUserId: string;

      if (existingClerkUsers.data.length > 0) {
        clerkUserId = existingClerkUsers.data[0].id;
        console.log(`  EXISTS: ${email} → ${clerkUserId}`);
      } else {
        // Create user in Clerk with WP password hash
        const nameParts = wpUser.display_name.split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        // Detect hash format
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

        clerkUserId = clerkUser.id;
        console.log(`  CREATE: ${email} → ${clerkUserId} (${firstName} ${lastName})`);
        created++;
      }

      // Update any existing ClientContact records for this email
      const contactResult = await prisma.clientContact.updateMany({
        where: { email },
        data: { clerkUserId },
      });
      if (contactResult.count > 0) {
        console.log(`    → Updated ${contactResult.count} ClientContact(s)`);
        linked += contactResult.count;
      }
    } catch (err) {
      console.error(
        `  ERROR: ${email} —`,
        err instanceof Error ? err.message : err
      );
      errors++;
    }
  }

  await wpDb.end();
  await prisma.$disconnect();

  console.log(`\n=== Migration Complete ===`);
  console.log(`  Created in Clerk: ${created}`);
  console.log(`  Skipped:          ${skipped}`);
  console.log(`  Contacts linked:  ${linked}`);
  console.log(`  Errors:           ${errors}`);
  console.log(
    `\nUsers can sign in with their WordPress passwords or use "Forgot Password".`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
