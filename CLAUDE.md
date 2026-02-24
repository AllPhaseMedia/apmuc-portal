# APMUC Portal

## Project Overview
**apmuc-portal** — Combined client portal for All Phase Media & UnionCoded (APM | UC Support). Replaces the existing clientsupport.app with an expanded dashboard experience for hosting and maintenance retainer clients.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui (new-york style) + Lucide icons
- **Auth**: Clerk (admin role via `publicMetadata.role === "admin"`)
- **Database**: Neon PostgreSQL + Prisma 6
- **Hosting**: Vercel (auto-deploys on push to `master`)

## Integrations
- **Stripe** — billing, invoices, customer portal (cancellation disabled)
- **Help Scout** — support tickets via REST API (OAuth2 client credentials)
- **Umami** — self-hosted analytics REST API
- **Uptime Kuma** — self-hosted uptime monitoring API
- **Google PageSpeed Insights** — free API for performance scores
- **SSL Check** — Node.js `tls` module for certificate validation

## Branding
- **Brand**: APM | UC Support (single unified brand, no per-client switching)
- **Colors**: Dark navy sidebar, light content area, orange accents
- **Theme**: Light mode default with dark mode toggle
- **Fonts**: Inter (sans), JetBrains Mono (mono)

## Architecture
- Server-first: all external API calls happen server-side (React Server Components + Server Actions)
- Server Actions in `src/actions/` for all mutations
- API Routes only for webhooks (Clerk, Stripe) and cron
- Integration clients in `src/lib/` with `"server-only"` import guards
- PageSpeed + SSL results cached in DB, refreshed via system cron or node-cron every 6h
- Help Scout + Stripe queried in real-time (no local cache)

## Key Patterns
- **Auth helpers**: `getAuthUser()`, `requireAuth()`, `requireAdmin()` in `src/lib/auth.ts`
- **Prisma singleton**: `src/lib/prisma.ts` (same pattern as apm-portal)
- **Server action pattern**: `"use server"` → auth check → Zod validate → business logic → return `{ success, data/error }`
- **Route groups**: `(auth)` for sign-in, `(dashboard)` for main app
- **Admin routes**: `/admin/*` protected by middleware + server action checks

## Database
- Prisma 6 with PostgreSQL provider (Neon)
- Models: Client, ClientService, SiteCheck, KBCategory, KBArticle, ArticleFeedback, RecommendedService
- See `prisma/schema.prisma` for full schema

## Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npx prisma studio    # Database GUI
npx prisma db push   # Push schema to DB
npx prisma generate  # Generate Prisma Client
npx prisma db seed   # Seed test data
```

## Important Rules
- NEVER expose API keys to the client (all integration modules use `"server-only"`)
- NEVER allow subscription cancellation in the portal (Stripe Customer Portal configured to disable it)
- ALL client data queries must filter by the authenticated user's `clerkUserId`
- Admin role is checked in BOTH middleware AND server actions (defense in depth)
- Help Scout conversations filtered server-side by client email (never trust client input)

## Docs
- `docs/ARCHITECTURE.md` — Full system design, data models, API structure
- `docs/PLAN.md` — Implementation plan with 9 phases
