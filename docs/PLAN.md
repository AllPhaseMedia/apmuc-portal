# APMUC Portal — Implementation Plan

## Build Order

Each phase stops for review before proceeding. Phase 1 outputs all environment variables needed upfront.

---

## All Environment Variables

Gather these before starting. Phases that need each variable are noted.

```env
# Phase 1: Database (MySQL on xCloud VPS)
DATABASE_URL="mysql://user:password@localhost:3306/apmuc_portal"

# Phase 2: Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
CLERK_WEBHOOK_SECRET="whsec_..."

# Phase 5: Client Dashboard Integrations
PAGESPEED_API_KEY="AIza..."
UPTIME_KUMA_BASE_URL="https://uptime.yourdomain.com"
UPTIME_KUMA_API_TOKEN="uk1_..."
UMAMI_BASE_URL="https://analytics.yourdomain.com"
UMAMI_API_TOKEN="..."

# Phase 7: Support Tickets (Help Scout)
HELPSCOUT_APP_ID="..."
HELPSCOUT_APP_SECRET="..."
HELPSCOUT_MAILBOX_ID="..."

# Phase 8: Billing (Stripe)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Cron Secret (for protecting cron endpoint)
CRON_SECRET="..."
```

---

## Phase 1: Project Setup

**Goal:** Scaffolded Next.js 15 project with Tailwind, shadcn/ui, Prisma 6, brand config, folder structure.

### Tasks
1. `npx create-next-app@latest apmuc-portal` (TypeScript, Tailwind, App Router, src/ dir)
2. Install deps: `@prisma/client@^6 @clerk/nextjs lucide-react sonner next-themes zod date-fns`
3. Install dev deps: `prisma@^6 shadcn tsx`
4. Init shadcn/ui (new-york style, neutral base, CSS variables)
5. Install shadcn components: button, card, input, label, dialog, dropdown-menu, avatar, badge, tabs, table, skeleton, separator, sheet, scroll-area, select, textarea, tooltip, sonner, form, checkbox, switch
6. Init Prisma with MySQL datasource
7. Create `src/lib/prisma.ts` singleton
8. Set up `globals.css` with APM|UC brand colors (dark navy, orange accents)
9. Create `.env` and `.env.example`
10. Create `CLAUDE.md`
11. Create folder structure
12. `git init` + initial commit

### Acceptance Criteria
- `npm run dev` starts without errors
- `npx prisma db push` connects to MySQL
- shadcn components install correctly
- `.env.example` has all env var placeholders

---

## Phase 2: Authentication

**Goal:** Clerk login, admin role via `publicMetadata`, protected routes, webhook sync.

### Tasks
1. Install `svix` for webhook verification
2. Wrap root layout with `<ClerkProvider>`
3. Create `src/middleware.ts` (protect all except sign-in + webhooks)
4. Create sign-in page with Clerk `<SignIn />`
5. Create `src/lib/auth.ts` helpers: `getAuthUser`, `requireAuth`, `requireAdmin`
6. Create Clerk webhook handler (`user.created`, `user.updated`)
7. Create sidebar with client + admin navigation
8. Create header with Clerk `<UserButton />`
9. Create dashboard layout (sidebar + header)
10. Create placeholder dashboard page

### Acceptance Criteria
- Unauthenticated users redirected to `/sign-in`
- Sign-in works, redirects to `/dashboard`
- Admin users see admin nav links
- Non-admin users see only client nav

---

## Phase 3: Database Schema

**Goal:** Full schema deployed to MySQL, seed script with test data.

### Models
- `Client` (clerkUserId, email, integrations IDs)
- `ClientService` (type enum, per client)
- `SiteCheck` (PageSpeed + SSL cached data)
- `KBCategory` (name, slug)
- `KBArticle` (content, status, category)
- `ArticleFeedback` (helpful boolean)
- `RecommendedService` (upsell catalog)

### Tasks
1. Write full Prisma schema
2. `npx prisma db push`
3. `npx prisma generate`
4. Create seed script with test data
5. Run seed, verify in Prisma Studio

---

## Phase 4: Admin Panel

**Goal:** Admin manages clients, KB articles/categories, recommended services.

### Tasks
1. Client CRUD (list, create, edit, delete/deactivate)
2. Client service management (toggle services)
3. KB category management (create, edit, delete)
4. KB article editor (Markdown, status toggle)
5. Recommended services management
6. All forms Zod-validated
7. Admin-only route protection

---

## Phase 5: Client Dashboard

**Goal:** PageSpeed gauges, uptime status, Umami stats, SSL check, upsell cards.

### Integration Libraries
- `src/lib/pagespeed.ts` — Google PageSpeed Insights API
- `src/lib/uptime-kuma.ts` — Uptime Kuma API
- `src/lib/umami.ts` — Umami Analytics API
- `src/lib/ssl-check.ts` — Node `tls` certificate check

### Tasks
1. Create all integration libraries
2. Create dashboard server actions
3. Build score gauge component (circular SVG)
4. Build PageSpeed card (4 gauges + refresh)
5. Build uptime card (status + percentage + response time)
6. Build analytics card (visitors, pageviews, bounce rate)
7. Build SSL card (valid/invalid, expiry, days remaining)
8. Build upsell section (services client doesn't have)
9. Create cron endpoint for PageSpeed + SSL refresh (called by system cron on VPS)
10. Handle missing integration IDs gracefully

---

## Phase 6: Knowledge Base

**Goal:** Clients browse articles by category, search, submit feedback.

### Tasks
1. Install `react-markdown`, `remark-gfm`, `@tailwindcss/typography`
2. Category grid landing page
3. Article list by category
4. Article detail page with Markdown rendering
5. Search (MySQL LIKE or FULLTEXT index)
6. Feedback widget (helpful/not helpful)
7. Breadcrumb navigation

---

## Phase 7: Support Tickets

**Goal:** Help Scout integration — view, reply, create tickets.

### Tasks
1. Help Scout API client with OAuth2 token management
2. Ticket list page (filtered by client email)
3. Ticket detail page (conversation threads)
4. Reply form (posts back to Help Scout)
5. New ticket form (creates Help Scout conversation)
6. Status badges (active, pending, closed)
7. Error handling for API failures

---

## Phase 8: Billing

**Goal:** Stripe invoices, payment method, NO cancellation.

### Tasks
1. Install `stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`
2. Stripe client initialization
3. Subscription display card
4. Invoice history table with PDF downloads
5. Payment method display + update via Stripe Elements
6. Stripe Customer Portal session (payment method only)
7. Stripe webhook handler
8. NO cancel button anywhere

---

## Phase 9: Final Polish

**Goal:** Responsive, loading states, empty states, error handling.

### Tasks
1. Responsive sidebar (Sheet on mobile)
2. Loading skeletons for every page
3. Empty state components
4. Error boundaries
5. Custom 404 and error pages
6. Accessibility review (Lighthouse 90+)
7. Security review (data isolation, admin guards, webhook verification)
8. `npm run build` passes clean

---

## Dependency Graph

```
Phase 1 → Phase 2 → Phase 3 → Phase 4
                                  ↓
                    Phase 5 (Dashboard)
                    Phase 6 (KB)
                    Phase 7 (Support)
                    Phase 8 (Billing)
                                  ↓
                          Phase 9 (Polish)
```
