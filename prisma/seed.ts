import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ============================================================
  // CLIENTS
  // ============================================================

  const client1 = await prisma.client.upsert({
    where: { id: "seed-client-demo" },
    update: {},
    create: {
      id: "seed-client-demo",
      name: "Demo Agency",
      websiteUrl: "https://example.com",
      stripeCustomerId: null,
      umamiSiteId: null,
      uptimeKumaMonitorId: null,
      isActive: true,
    },
  });

  const client2 = await prisma.client.upsert({
    where: { id: "seed-client-acme" },
    update: {},
    create: {
      id: "seed-client-acme",
      name: "Acme Corporation",
      websiteUrl: "https://acme-example.com",
      isActive: true,
    },
  });

  console.log(`Created clients: ${client1.name}, ${client2.name}`);

  // ============================================================
  // CLIENT SERVICES
  // ============================================================

  await prisma.clientService.upsert({
    where: { clientId_type: { clientId: client1.id, type: "HOSTING" } },
    update: {},
    create: { clientId: client1.id, type: "HOSTING" },
  });

  await prisma.clientService.upsert({
    where: { clientId_type: { clientId: client1.id, type: "MAINTENANCE" } },
    update: {},
    create: { clientId: client1.id, type: "MAINTENANCE" },
  });

  await prisma.clientService.upsert({
    where: { clientId_type: { clientId: client1.id, type: "SEO" } },
    update: {},
    create: { clientId: client1.id, type: "SEO" },
  });

  await prisma.clientService.upsert({
    where: { clientId_type: { clientId: client2.id, type: "HOSTING" } },
    update: {},
    create: { clientId: client2.id, type: "HOSTING" },
  });

  await prisma.clientService.upsert({
    where: { clientId_type: { clientId: client2.id, type: "WEB_DESIGN" } },
    update: {},
    create: { clientId: client2.id, type: "WEB_DESIGN" },
  });

  console.log("Created client services");

  // ============================================================
  // SITE CHECKS (cached PageSpeed + SSL data)
  // ============================================================

  await prisma.siteCheck.deleteMany({});

  await prisma.siteCheck.create({
    data: {
      clientId: client1.id,
      url: "https://example.com",
      performanceScore: 87,
      accessibilityScore: 95,
      bestPracticesScore: 92,
      seoScore: 90,
      sslValid: true,
      sslIssuer: "Let's Encrypt",
      sslExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    },
  });

  await prisma.siteCheck.create({
    data: {
      clientId: client2.id,
      url: "https://acme-example.com",
      performanceScore: 72,
      accessibilityScore: 88,
      bestPracticesScore: 85,
      seoScore: 78,
      sslValid: true,
      sslIssuer: "Let's Encrypt",
      sslExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  console.log("Created site checks");

  // ============================================================
  // KNOWLEDGE BASE CATEGORIES
  // ============================================================

  const catGettingStarted = await prisma.kBCategory.upsert({
    where: { slug: "getting-started" },
    update: {},
    create: {
      name: "Getting Started",
      slug: "getting-started",
      description: "Everything you need to know to get up and running",
      sortOrder: 0,
    },
  });

  const catWordPress = await prisma.kBCategory.upsert({
    where: { slug: "wordpress" },
    update: {},
    create: {
      name: "WordPress",
      slug: "wordpress",
      description: "WordPress tips, guides, and troubleshooting",
      sortOrder: 1,
    },
  });

  const catSEO = await prisma.kBCategory.upsert({
    where: { slug: "seo" },
    update: {},
    create: {
      name: "SEO",
      slug: "seo",
      description: "Search engine optimization best practices",
      sortOrder: 2,
    },
  });

  const catBilling = await prisma.kBCategory.upsert({
    where: { slug: "billing" },
    update: {},
    create: {
      name: "Billing & Account",
      slug: "billing",
      description: "Invoices, payments, and account management",
      sortOrder: 3,
    },
  });

  console.log("Created KB categories");

  // ============================================================
  // KNOWLEDGE BASE ARTICLES
  // ============================================================

  await prisma.kBArticle.upsert({
    where: { slug: "welcome-to-your-portal" },
    update: {},
    create: {
      categoryId: catGettingStarted.id,
      title: "Welcome to Your Client Portal",
      slug: "welcome-to-your-portal",
      excerpt: "A quick overview of everything available in your APM | UC Support portal.",
      content: `# Welcome to Your Client Portal

Your APM | UC Support portal is your one-stop hub for managing your website and services.

## What You Can Do Here

- **Dashboard** — View your website's performance scores, uptime status, traffic analytics, and SSL certificate status at a glance.
- **Support** — Submit and track support requests. Our team typically responds within 4 business hours.
- **Billing** — View your invoices, download PDF receipts, and update your payment method.
- **Knowledge Base** — Browse helpful articles about WordPress, SEO, and managing your online presence.

## Need Help?

If you have any questions, submit a support request and we'll get back to you shortly.`,
      status: "PUBLISHED",
      publishedAt: new Date(),
      sortOrder: 0,
    },
  });

  await prisma.kBArticle.upsert({
    where: { slug: "how-to-submit-support-request" },
    update: {},
    create: {
      categoryId: catGettingStarted.id,
      title: "How to Submit a Support Request",
      slug: "how-to-submit-support-request",
      excerpt: "Step-by-step guide to creating and tracking support tickets.",
      content: `# How to Submit a Support Request

## Creating a New Request

1. Click **Support** in the sidebar
2. Click the **New Request** button
3. Enter a descriptive subject line
4. Describe your issue or question in detail
5. Click **Submit**

## Tips for Faster Resolution

- Be specific about what page or feature is affected
- Include screenshots if possible
- Mention any error messages you see
- Note when the issue started

## Tracking Your Request

All your requests appear in the Support section. You can see the status of each one and reply to add more information.`,
      status: "PUBLISHED",
      publishedAt: new Date(),
      sortOrder: 1,
    },
  });

  await prisma.kBArticle.upsert({
    where: { slug: "understanding-pagespeed-scores" },
    update: {},
    create: {
      categoryId: catWordPress.id,
      title: "Understanding Your PageSpeed Scores",
      slug: "understanding-pagespeed-scores",
      excerpt: "What your PageSpeed Insights scores mean and how to improve them.",
      content: `# Understanding Your PageSpeed Scores

Your dashboard shows four scores from Google PageSpeed Insights:

## Performance (0-100)
How fast your site loads. Factors include server response time, image sizes, and JavaScript execution.

- **90-100**: Excellent
- **50-89**: Needs improvement
- **0-49**: Poor

## Accessibility (0-100)
How usable your site is for people with disabilities. Includes proper heading structure, alt text, and color contrast.

## Best Practices (0-100)
General web development best practices like HTTPS usage, safe JavaScript, and proper image formats.

## SEO (0-100)
Basic search engine optimization checks like meta tags, crawlability, and mobile-friendliness.

## How We Help

As part of your maintenance plan, we continuously work to improve these scores. If you see a score drop, don't worry — we monitor these and address issues proactively.`,
      status: "PUBLISHED",
      publishedAt: new Date(),
      sortOrder: 0,
    },
  });

  await prisma.kBArticle.upsert({
    where: { slug: "wordpress-security-basics" },
    update: {},
    create: {
      categoryId: catWordPress.id,
      title: "WordPress Security Basics",
      slug: "wordpress-security-basics",
      excerpt: "Essential security practices we handle as part of your maintenance plan.",
      content: `# WordPress Security Basics

Security is a top priority. Here's what we do to keep your site safe:

## What's Included in Your Plan

- **Core Updates** — We keep WordPress core up to date
- **Plugin Updates** — All plugins are tested and updated regularly
- **Security Monitoring** — 24/7 monitoring for malware and vulnerabilities
- **SSL Certificate** — Your site runs on HTTPS with a valid SSL certificate
- **Backups** — Daily automated backups with 30-day retention

## What You Can Do

- Use a strong, unique password for your WordPress login
- Don't share login credentials via email
- Let us know if you notice anything suspicious on your site`,
      status: "PUBLISHED",
      publishedAt: new Date(),
      sortOrder: 1,
    },
  });

  await prisma.kBArticle.upsert({
    where: { slug: "seo-basics-for-small-business" },
    update: {},
    create: {
      categoryId: catSEO.id,
      title: "SEO Basics for Small Business",
      slug: "seo-basics-for-small-business",
      excerpt: "A beginner-friendly guide to understanding search engine optimization.",
      content: `# SEO Basics for Small Business

Search engine optimization helps your website appear in Google search results when potential customers look for your services.

## Key Factors

- **Content** — Regular, helpful content that answers your customers' questions
- **Technical SEO** — Fast loading, mobile-friendly, proper HTML structure
- **Local SEO** — Google Business Profile, consistent NAP (Name, Address, Phone)
- **Backlinks** — Links from other reputable websites to yours

## What We Monitor

If you have an SEO package, we track your keyword rankings, organic traffic, and technical health. Check your dashboard for the latest metrics.`,
      status: "PUBLISHED",
      publishedAt: new Date(),
      sortOrder: 0,
    },
  });

  await prisma.kBArticle.upsert({
    where: { slug: "understanding-your-invoice" },
    update: {},
    create: {
      categoryId: catBilling.id,
      title: "Understanding Your Invoice",
      slug: "understanding-your-invoice",
      excerpt: "How to read your invoice and download PDF receipts.",
      content: `# Understanding Your Invoice

## Viewing Invoices

Navigate to **Billing** in the sidebar to see all your invoices. Each shows:

- **Date** — When the invoice was created
- **Amount** — The total charged
- **Status** — Paid, Open, or Past Due
- **PDF** — Click to download a PDF receipt

## Updating Payment Method

Click **Manage Payment Method** to update your credit card on file. We accept all major credit cards.

## Questions About Billing?

Submit a support request and we'll be happy to help clarify any charges.`,
      status: "PUBLISHED",
      publishedAt: new Date(),
      sortOrder: 0,
    },
  });

  console.log("Created KB articles");

  // ============================================================
  // RECOMMENDED SERVICES
  // ============================================================

  await prisma.recommendedService.deleteMany({});

  await prisma.recommendedService.create({
    data: {
      type: "SEO",
      title: "Search Engine Optimization",
      description: "Get found on Google. We'll optimize your site and build your online visibility.",
      features: JSON.parse(JSON.stringify([
        "Keyword research & strategy",
        "On-page optimization",
        "Monthly ranking reports",
        "Google Business Profile management",
      ])),
      ctaUrl: "mailto:support@allphasemedia.com?subject=SEO%20Inquiry",
      ctaLabel: "Learn More",
      sortOrder: 0,
    },
  });

  await prisma.recommendedService.create({
    data: {
      type: "GOOGLE_ADS",
      title: "Google Ads Management",
      description: "Drive targeted traffic with professionally managed Google Ads campaigns.",
      features: JSON.parse(JSON.stringify([
        "Campaign setup & optimization",
        "Keyword targeting",
        "Monthly performance reports",
        "Ad copy writing",
      ])),
      ctaUrl: "mailto:support@allphasemedia.com?subject=Google%20Ads%20Inquiry",
      ctaLabel: "Learn More",
      sortOrder: 1,
    },
  });

  await prisma.recommendedService.create({
    data: {
      type: "SOCIAL_MEDIA",
      title: "Social Media Management",
      description: "Build your brand presence across social platforms with consistent, engaging content.",
      features: JSON.parse(JSON.stringify([
        "Content creation & scheduling",
        "Platform management",
        "Community engagement",
        "Monthly analytics",
      ])),
      ctaUrl: "mailto:support@allphasemedia.com?subject=Social%20Media%20Inquiry",
      ctaLabel: "Learn More",
      sortOrder: 2,
    },
  });

  console.log("Created recommended services");

  console.log("Seeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
