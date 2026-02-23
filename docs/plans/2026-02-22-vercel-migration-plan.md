# Vercel Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate apmuc-portal from self-hosted VPS (PM2 + Nginx) to Vercel, switching the database from MySQL to Vercel Postgres (Neon).

**Architecture:** The Next.js app moves to Vercel with Vercel Postgres as the primary database. Uptime Kuma stays on the VPS, accessed via mysql2 over the public IP. Umami stays on the VPS, accessed via its HTTP API. VPS-specific deploy infrastructure (PM2, inject-env-loader, GitHub Actions SSH deploy) is removed.

**Tech Stack:** Next.js 16, Vercel, Vercel Postgres (Neon), Prisma 6 (postgresql provider), mysql2 (Uptime Kuma only)

---

### Task 1: Update Prisma Schema for PostgreSQL

**Files:**
- Modify: `prisma/schema.prisma`

**Context:** The schema uses `provider = "mysql"` and MySQL-specific column type annotations (`@db.Text`, `@db.LongText`, `@db.MediumText`). PostgreSQL handles unlimited-length strings natively with `String`, so all these annotations are simply removed. Everything else (enums, relations, indexes, `@default(uuid())`, `Json` fields) works identically in PostgreSQL.

**Step 1: Change the datasource provider**

In `prisma/schema.prisma`, change line 6:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Step 2: Remove all MySQL-specific `@db.*` annotations**

Remove these annotations from the following fields (leave the field, just remove the annotation):

| Model | Field | Remove |
|-------|-------|--------|
| Client | notes | `@db.Text` |
| KBArticle | content | `@db.LongText` |
| KBArticle | excerpt | `@db.Text` |
| ArticleFeedback | comment | `@db.Text` |
| RecommendedService | description | `@db.Text` |
| Form | description | `@db.Text` |
| SystemSetting | value | `@db.MediumText` |

After removal, each field should just be `String` or `String?` with no `@db.*` suffix.

**Step 3: Verify Prisma validates the schema**

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid."

**Step 4: Generate the Prisma client**

Run: `npx prisma generate`
Expected: Success (generates client for postgresql provider)

**Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: switch Prisma schema from MySQL to PostgreSQL"
```

---

### Task 2: Move mysql2 to Dependencies and Update next.config.ts

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts`

**Context:** `mysql2` is currently a devDependency but is imported by production code (`src/lib/uptime-kuma.ts`). On the VPS this worked because `npm install` installs everything. On Vercel, devDependencies are not installed in production builds. Also, `output: "standalone"` and `serverExternalPackages` in next.config.ts are VPS/PM2-specific and must be removed for Vercel.

**Step 1: Move mysql2 from devDependencies to dependencies**

In `package.json`, remove `"mysql2": "^3.17.4"` from `devDependencies` and add it to `dependencies`.

**Step 2: Simplify next.config.ts**

Replace the entire file with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
```

Removed:
- `output: "standalone"` — Vercel handles its own build output
- `serverExternalPackages: ["@prisma/client", "prisma"]` — not needed on Vercel
- `import path from "path"` and `turbopack.root` — only needed for standalone output

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (or only pre-existing errors unrelated to this change)

**Step 4: Commit**

```bash
git add package.json next.config.ts
git commit -m "feat: move mysql2 to deps, simplify next.config for Vercel"
```

---

### Task 3: Add vercel.json for Cron Configuration

**Files:**
- Create: `vercel.json`

**Context:** The site-checks cron job currently requires an external cron service to hit `/api/cron/site-checks`. Vercel has built-in cron support via `vercel.json`. The cron endpoint already has bearer token auth, which Vercel cron uses automatically via the `CRON_SECRET` env var.

**Step 1: Create vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron/site-checks",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

This runs site checks every 6 hours (at minute 0 of hours 0, 6, 12, 18).

**Step 2: Update the cron route to accept Vercel's auth header**

Vercel cron jobs send an `Authorization: Bearer <CRON_SECRET>` header automatically. The current code at `src/app/api/cron/site-checks/route.ts` already checks for this exact pattern (line 8-10), so **no code change is needed**.

**Step 3: Commit**

```bash
git add vercel.json
git commit -m "feat: add vercel.json with cron configuration"
```

---

### Task 4: Remove VPS-Specific Deploy Infrastructure

**Files:**
- Delete: `.github/workflows/deploy.yml`
- Delete: `scripts/inject-env-loader.js`
- Delete: `ecosystem.config.js`

**Context:** These files are only needed for the VPS + PM2 deployment:
- `deploy.yml` — GitHub Actions workflow that SSHes into VPS, pulls code, builds, restarts PM2
- `inject-env-loader.js` — Hack to inject .env loading into standalone server.js (bypasses PM2 env caching)
- `ecosystem.config.js` — PM2 process manager configuration

**Step 1: Delete the three files**

```bash
rm .github/workflows/deploy.yml
rm scripts/inject-env-loader.js
rm ecosystem.config.js
```

**Step 2: Check if .github/workflows/ directory is empty and remove if so**

```bash
ls .github/workflows/
# If empty:
rmdir .github/workflows
ls .github/
# If empty:
rmdir .github
```

**Step 3: Check if scripts/ directory has other files**

```bash
ls scripts/
```

If `scripts/` only contains migration scripts (migrate-wordpress-users.ts, migrate-to-contacts.ts), leave it — those are useful for reference. Only `inject-env-loader.js` should be deleted.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove VPS deploy infrastructure (PM2, inject-env-loader, deploy.yml)"
```

---

### Task 5: Update .env.example and Documentation

**Files:**
- Modify: `.env.example`

**Context:** The `.env.example` should reflect the new PostgreSQL connection string format and note that Vercel Postgres auto-provisions `DATABASE_URL`. Also update the Uptime Kuma host comment to reflect it's now a remote connection.

**Step 1: Update .env.example**

```env
# ===========================================
# APMUC Portal — Environment Variables
# ===========================================
# Copy this file to .env and fill in your values.
# NEVER commit the .env file to git.
#
# On Vercel: set these in the Vercel dashboard (Settings > Environment Variables).
# DATABASE_URL is auto-provisioned by Vercel Postgres.

# -------------------------------------------
# Database (Vercel Postgres / Neon)
# -------------------------------------------
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# -------------------------------------------
# Clerk Authentication
# -------------------------------------------
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
CLERK_WEBHOOK_SECRET="whsec_..."

# -------------------------------------------
# Stripe (Billing)
# -------------------------------------------
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# -------------------------------------------
# Help Scout (Support Tickets)
# -------------------------------------------
HELPSCOUT_APP_ID=""
HELPSCOUT_APP_SECRET=""
HELPSCOUT_MAILBOX_ID=""

# -------------------------------------------
# Umami Analytics (Self-hosted on VPS)
# -------------------------------------------
UMAMI_BASE_URL="https://analytics.yourdomain.com"
UMAMI_API_TOKEN=""

# -------------------------------------------
# Uptime Kuma (MariaDB on VPS, remote access)
# -------------------------------------------
UPTIME_KUMA_DB_HOST="your-vps-ip"
UPTIME_KUMA_DB_PORT="3306"
UPTIME_KUMA_DB_NAME=""
UPTIME_KUMA_DB_USER=""
UPTIME_KUMA_DB_PASS=""

# -------------------------------------------
# Google PageSpeed Insights
# -------------------------------------------
PAGESPEED_API_KEY="AIza..."

# -------------------------------------------
# Cron Secret (Vercel cron uses this automatically)
# -------------------------------------------
CRON_SECRET=""
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: update .env.example for Vercel Postgres and remote Uptime Kuma"
```

---

### Task 6: Create Data Migration Script (MySQL → PostgreSQL)

**Files:**
- Create: `scripts/migrate-mysql-to-postgres.ts`

**Context:** This script reads all data from the existing MySQL database on the VPS and writes it to the new Vercel Postgres database. It's run locally once — the developer's machine can reach both databases. The script handles all 11 tables in dependency order (parents before children).

**Step 1: Create the migration script**

```typescript
import mysql from "mysql2/promise";
import { PrismaClient } from "@prisma/client";

// Usage:
//   MYSQL_URL="mysql://user:pass@vps-ip:3306/apmuc_portal" \
//   DATABASE_URL="postgresql://..." \
//   npx tsx scripts/migrate-mysql-to-postgres.ts

const MYSQL_URL = process.env.MYSQL_URL;
if (!MYSQL_URL) {
  console.error("Missing MYSQL_URL env var");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const mysql_conn = await mysql.createConnection(MYSQL_URL!);
  console.log("Connected to MySQL");

  // Helper to query MySQL
  async function query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
    const [rows] = await mysql_conn.execute(sql);
    return rows as T[];
  }

  // 1. Clients (no FK dependencies)
  const clients = await query<{
    id: string; name: string; websiteUrl: string | null;
    stripeCustomerId: string | null; umamiSiteId: string | null;
    umamiShareId: string | null; uptimeKumaMonitorId: string | null;
    searchConsoleUrl: string | null; isActive: number; notes: string | null;
    createdAt: Date; updatedAt: Date;
  }>("SELECT * FROM Client");

  console.log(`Migrating ${clients.length} clients...`);
  for (const c of clients) {
    await prisma.client.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        name: c.name,
        websiteUrl: c.websiteUrl,
        stripeCustomerId: c.stripeCustomerId,
        umamiSiteId: c.umamiSiteId,
        umamiShareId: c.umamiShareId,
        uptimeKumaMonitorId: c.uptimeKumaMonitorId,
        searchConsoleUrl: c.searchConsoleUrl,
        isActive: !!c.isActive,
        notes: c.notes,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      },
    });
  }
  console.log(`  ✓ ${clients.length} clients`);

  // 2. ClientContacts (depends on Client)
  const contacts = await query<{
    id: string; clientId: string; clerkUserId: string; email: string;
    name: string; roleLabel: string | null; isPrimary: number;
    canDashboard: number; canBilling: number; canAnalytics: number;
    canUptime: number; canSupport: number; canSiteHealth: number;
    isActive: number; createdAt: Date; updatedAt: Date;
  }>("SELECT * FROM ClientContact");

  console.log(`Migrating ${contacts.length} contacts...`);
  for (const c of contacts) {
    await prisma.clientContact.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        clientId: c.clientId,
        clerkUserId: c.clerkUserId,
        email: c.email,
        name: c.name,
        roleLabel: c.roleLabel,
        isPrimary: !!c.isPrimary,
        canDashboard: !!c.canDashboard,
        canBilling: !!c.canBilling,
        canAnalytics: !!c.canAnalytics,
        canUptime: !!c.canUptime,
        canSupport: !!c.canSupport,
        canSiteHealth: !!c.canSiteHealth,
        isActive: !!c.isActive,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      },
    });
  }
  console.log(`  ✓ ${contacts.length} contacts`);

  // 3. ClientServices (depends on Client)
  const services = await query<{
    id: string; clientId: string; type: string; label: string | null;
    isActive: number; createdAt: Date; updatedAt: Date;
  }>("SELECT * FROM ClientService");

  console.log(`Migrating ${services.length} client services...`);
  for (const s of services) {
    await prisma.clientService.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        clientId: s.clientId,
        type: s.type as any,
        label: s.label,
        isActive: !!s.isActive,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      },
    });
  }
  console.log(`  ✓ ${services.length} services`);

  // 4. SiteChecks (depends on Client)
  const checks = await query<{
    id: string; clientId: string; url: string;
    performanceScore: number | null; accessibilityScore: number | null;
    bestPracticesScore: number | null; seoScore: number | null;
    sslValid: number | null; sslIssuer: string | null;
    sslExpiresAt: Date | null; domainRegistrar: string | null;
    domainExpiresAt: Date | null; checkedAt: Date;
  }>("SELECT * FROM SiteCheck");

  console.log(`Migrating ${checks.length} site checks...`);
  for (const c of checks) {
    await prisma.siteCheck.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        clientId: c.clientId,
        url: c.url,
        performanceScore: c.performanceScore,
        accessibilityScore: c.accessibilityScore,
        bestPracticesScore: c.bestPracticesScore,
        seoScore: c.seoScore,
        sslValid: c.sslValid == null ? null : !!c.sslValid,
        sslIssuer: c.sslIssuer,
        sslExpiresAt: c.sslExpiresAt ? new Date(c.sslExpiresAt) : null,
        domainRegistrar: c.domainRegistrar,
        domainExpiresAt: c.domainExpiresAt ? new Date(c.domainExpiresAt) : null,
        checkedAt: new Date(c.checkedAt),
      },
    });
  }
  console.log(`  ✓ ${checks.length} site checks`);

  // 5. KBCategories (no FK dependencies)
  const categories = await query<{
    id: string; name: string; slug: string; description: string | null;
    sortOrder: number; createdAt: Date; updatedAt: Date;
  }>("SELECT * FROM KBCategory");

  console.log(`Migrating ${categories.length} KB categories...`);
  for (const c of categories) {
    await prisma.kBCategory.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        sortOrder: c.sortOrder,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      },
    });
  }
  console.log(`  ✓ ${categories.length} categories`);

  // 6. KBArticles (depends on KBCategory)
  const articles = await query<{
    id: string; categoryId: string; title: string; slug: string;
    content: string; excerpt: string | null; status: string;
    sortOrder: number; createdAt: Date; updatedAt: Date;
    publishedAt: Date | null;
  }>("SELECT * FROM KBArticle");

  console.log(`Migrating ${articles.length} KB articles...`);
  for (const a of articles) {
    await prisma.kBArticle.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        categoryId: a.categoryId,
        title: a.title,
        slug: a.slug,
        content: a.content,
        excerpt: a.excerpt,
        status: a.status as any,
        sortOrder: a.sortOrder,
        createdAt: new Date(a.createdAt),
        updatedAt: new Date(a.updatedAt),
        publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
      },
    });
  }
  console.log(`  ✓ ${articles.length} articles`);

  // 7. ArticleFeedback (depends on KBArticle)
  const feedback = await query<{
    id: string; articleId: string; helpful: number;
    comment: string | null; clientId: string | null; createdAt: Date;
  }>("SELECT * FROM ArticleFeedback");

  console.log(`Migrating ${feedback.length} article feedback entries...`);
  for (const f of feedback) {
    await prisma.articleFeedback.upsert({
      where: { id: f.id },
      update: {},
      create: {
        id: f.id,
        articleId: f.articleId,
        helpful: !!f.helpful,
        comment: f.comment,
        clientId: f.clientId,
        createdAt: new Date(f.createdAt),
      },
    });
  }
  console.log(`  ✓ ${feedback.length} feedback entries`);

  // 8. Forms (no FK dependencies)
  const forms = await query<{
    id: string; name: string; slug: string; description: string | null;
    fields: string; settings: string; isActive: number; isPublic: number;
    createdAt: Date; updatedAt: Date;
  }>("SELECT * FROM Form");

  console.log(`Migrating ${forms.length} forms...`);
  for (const f of forms) {
    await prisma.form.upsert({
      where: { id: f.id },
      update: {},
      create: {
        id: f.id,
        name: f.name,
        slug: f.slug,
        description: f.description,
        fields: typeof f.fields === "string" ? JSON.parse(f.fields) : f.fields,
        settings: typeof f.settings === "string" ? JSON.parse(f.settings) : f.settings,
        isActive: !!f.isActive,
        isPublic: !!f.isPublic,
        createdAt: new Date(f.createdAt),
        updatedAt: new Date(f.updatedAt),
      },
    });
  }
  console.log(`  ✓ ${forms.length} forms`);

  // 9. FormSubmissions (depends on Form)
  const submissions = await query<{
    id: string; formId: string; data: string; metadata: string;
    status: string; createdAt: Date;
  }>("SELECT * FROM FormSubmission");

  console.log(`Migrating ${submissions.length} form submissions...`);
  for (const s of submissions) {
    await prisma.formSubmission.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        formId: s.formId,
        data: typeof s.data === "string" ? JSON.parse(s.data) : s.data,
        metadata: typeof s.metadata === "string" ? JSON.parse(s.metadata) : s.metadata,
        status: s.status as any,
        createdAt: new Date(s.createdAt),
      },
    });
  }
  console.log(`  ✓ ${submissions.length} submissions`);

  // 10. RecommendedServices (depends on Form via formId)
  const recServices = await query<{
    id: string; type: string; title: string; description: string;
    features: string; ctaUrl: string | null; ctaLabel: string;
    formId: string | null; sortOrder: number; isActive: number;
    createdAt: Date; updatedAt: Date;
  }>("SELECT * FROM RecommendedService");

  console.log(`Migrating ${recServices.length} recommended services...`);
  for (const r of recServices) {
    await prisma.recommendedService.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        type: r.type as any,
        title: r.title,
        description: r.description,
        features: typeof r.features === "string" ? JSON.parse(r.features) : r.features,
        ctaUrl: r.ctaUrl,
        ctaLabel: r.ctaLabel,
        formId: r.formId,
        sortOrder: r.sortOrder,
        isActive: !!r.isActive,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
    });
  }
  console.log(`  ✓ ${recServices.length} recommended services`);

  // 11. SystemSettings (standalone)
  const settings = await query<{
    key: string; value: string; updatedAt: Date;
  }>("SELECT * FROM SystemSetting");

  console.log(`Migrating ${settings.length} system settings...`);
  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: {
        key: s.key,
        value: s.value,
      },
    });
  }
  console.log(`  ✓ ${settings.length} settings`);

  // Summary
  console.log("\n=== Migration Complete ===");
  console.log(`Clients: ${clients.length}`);
  console.log(`Contacts: ${contacts.length}`);
  console.log(`Services: ${services.length}`);
  console.log(`Site Checks: ${checks.length}`);
  console.log(`KB Categories: ${categories.length}`);
  console.log(`KB Articles: ${articles.length}`);
  console.log(`Article Feedback: ${feedback.length}`);
  console.log(`Forms: ${forms.length}`);
  console.log(`Form Submissions: ${submissions.length}`);
  console.log(`Recommended Services: ${recServices.length}`);
  console.log(`System Settings: ${settings.length}`);

  await mysql_conn.end();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
git add scripts/migrate-mysql-to-postgres.ts
git commit -m "feat: add MySQL to PostgreSQL data migration script"
```

**Note:** This script is run manually during cutover (Task 8). It is NOT run during this implementation phase.

---

### Task 7: Build Verification

**Files:** None (verification only)

**Context:** Before deploying to Vercel, verify the project builds successfully with the PostgreSQL schema.

**Step 1: Install dependencies**

Run: `npm install`
Expected: Success (mysql2 now in dependencies)

**Step 2: Generate Prisma client**

Run: `npx prisma generate`
Expected: Success (postgresql provider)

**Step 3: Run the build**

Run: `npm run build`
Expected: Build succeeds with no errors.

If there are TypeScript errors related to the schema changes, fix them before proceeding.

**Step 4: Push all changes**

```bash
git push origin master
```

---

### Task 8: Vercel Project Setup and Data Migration (Manual Steps)

**Context:** These are infrastructure steps performed in the Vercel dashboard and terminal. They cannot be automated in code.

**Step 1: Create Vercel project**

1. Go to https://vercel.com/new
2. Import the `apmuc-portal` GitHub repo
3. Framework preset: Next.js (auto-detected)
4. Click "Deploy" (initial deploy will fail — no database yet, that's OK)

**Step 2: Provision Vercel Postgres**

1. In the Vercel project dashboard → Storage → Create Database → Postgres
2. Name: `apmuc-portal-db`
3. Region: choose closest to your users (e.g., `iad1` for US East)
4. This auto-sets `DATABASE_URL`, `POSTGRES_URL`, etc. in env vars

**Step 3: Push schema to Vercel Postgres**

Grab the `DATABASE_URL` from Vercel dashboard (Settings → Environment Variables), then:

```bash
DATABASE_URL="postgresql://..." npx prisma db push
```

Expected: All tables created in Postgres.

**Step 4: Run data migration**

```bash
MYSQL_URL="mysql://apmuc-portal:y8I4Lb-iAjHo0ya!@5.161.211.68:3306/apmuc_portal" \
DATABASE_URL="postgresql://..." \
npx tsx scripts/migrate-mysql-to-postgres.ts
```

Expected: All rows migrated with counts printed.

**Step 5: Set remaining env vars in Vercel dashboard**

Go to Settings → Environment Variables and add all non-database env vars:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` = `/sign-in`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` = `/dashboard`
- `CLERK_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `HELPSCOUT_APP_ID`
- `HELPSCOUT_APP_SECRET`
- `HELPSCOUT_MAILBOX_ID`
- `UMAMI_BASE_URL`
- `UMAMI_API_TOKEN`
- `UPTIME_KUMA_DB_HOST` (VPS public IP)
- `UPTIME_KUMA_DB_PORT` = `3306`
- `UPTIME_KUMA_DB_NAME`
- `UPTIME_KUMA_DB_USER`
- `UPTIME_KUMA_DB_PASS`
- `PAGESPEED_API_KEY`
- `CRON_SECRET`

**Step 6: Open MariaDB port on VPS firewall**

SSH into VPS and allow Vercel's IP ranges to access MariaDB:

```bash
# Allow Vercel to reach MariaDB (port 3306)
# Vercel serverless functions use dynamic IPs — simplest approach is to
# allow 3306 from any IP but require strong DB credentials.
# Alternatively, use Vercel's static IP add-on or a VPN tunnel.
sudo ufw allow 3306/tcp
```

**Step 7: Redeploy on Vercel**

Trigger a redeploy in the Vercel dashboard (or push a commit). With all env vars set and the database populated, the app should start successfully.

**Step 8: Update Clerk webhook URL**

In the Clerk dashboard, update the webhook endpoint from the VPS URL to the Vercel URL:
- Old: `https://new.clientsupport.app/api/webhooks/clerk`
- New: `https://your-vercel-domain.vercel.app/api/webhooks/clerk` (or custom domain)

**Step 9: Update Stripe webhook URL**

In the Stripe dashboard (Developers → Webhooks), add a new endpoint pointing to the Vercel URL:
- `https://your-vercel-domain.vercel.app/api/webhooks/stripe`
- Generate a new webhook secret and update `STRIPE_WEBHOOK_SECRET` in Vercel env vars

**Step 10: DNS cutover (when ready)**

Point your domain to Vercel:
1. In Vercel: Settings → Domains → Add `new.clientsupport.app`
2. Update DNS records as Vercel instructs (CNAME or A record)
3. Update Clerk/Stripe webhook URLs to use the custom domain

---

## Verification Checklist

After deployment, verify each feature works:

- [ ] Sign in via Clerk
- [ ] Dashboard loads with client data
- [ ] Analytics page shows Umami data
- [ ] Uptime monitoring shows status (MariaDB remote access)
- [ ] Billing page shows Stripe invoices
- [ ] Support page shows Help Scout tickets
- [ ] Knowledge base loads articles
- [ ] Admin panel: CRUD clients, contacts, services
- [ ] Site checks cron runs (check Vercel cron logs)
- [ ] Form submissions work
- [ ] Clerk webhook processes user events
- [ ] Stripe webhook processes payment events
