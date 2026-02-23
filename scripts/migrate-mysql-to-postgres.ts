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
  console.log(`  done`);

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
  console.log(`  done`);

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
  console.log(`  done`);

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
  console.log(`  done`);

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
  console.log(`  done`);

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
  console.log(`  done`);

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
  console.log(`  done`);

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
  console.log(`  done`);

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
  console.log(`  done`);

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
  console.log(`  done`);

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
  console.log(`  done`);

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
