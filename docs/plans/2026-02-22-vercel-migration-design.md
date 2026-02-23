# Vercel Migration Design

## Goal

Migrate the apmuc-portal Next.js app from a self-hosted xCloud VPS (PM2 + Nginx) to Vercel. Switch the database from MySQL to Vercel Postgres (Neon). Keep Umami and Uptime Kuma on the VPS.

## Why

- PM2 caches env vars, requiring a custom inject-env-loader.js hack after every build
- Server user permissions prevent direct .env edits (requires GitHub Actions workaround workflows)
- No preview deployments, no instant rollbacks, no env var dashboard
- Vercel is purpose-built for Next.js — zero-config deploys, env management, cron, blob storage

## Architecture

```
                  Vercel
            ┌──────────────────┐
            │  Next.js App     │
            │  (auto-deploy)   │
            └──┬───┬───┬───┬──┘
               │   │   │   │
    ┌──────────┘   │   │   └──────────┐
    ▼              ▼   ▼              ▼
Vercel          Clerk  Stripe     Help Scout
Postgres                          (tickets)
(Neon)
               Hetzner VPS
            ┌──────────────────┐
            │  Umami Analytics  │ ← API calls from Vercel
            │  Uptime Kuma     │ ← MariaDB queries from Vercel
            │  MariaDB         │ ← port open to Vercel IPs
            └──────────────────┘
```

## Database: MySQL → Vercel Postgres

### Schema Changes

- Prisma provider: `mysql` → `postgresql`
- Remove MySQL-specific annotations:
  - `@db.Text` → plain `String` (Postgres text is unlimited)
  - `@db.LongText` → plain `String`
  - `@db.MediumText` → plain `String`
- Everything else (enums, relations, indexes, `@default(uuid())`, `Json` fields) works identically

### Data Migration

- One-time Node.js script that reads from MySQL (VPS) and writes to Postgres (Vercel)
- Run locally — can reach both databases
- Tables to migrate: Client, ClientContact, ClientService, SiteCheck, KBCategory, KBArticle, ArticleFeedback, RecommendedService, Form, FormSubmission, SystemSetting

### Uptime Kuma

- Stays as a separate mysql2 connection to VPS MariaDB
- Open MariaDB port on VPS firewall, restricted to Vercel's IP ranges
- No code changes — just update `UPTIME_KUMA_DB_HOST` env var from `localhost` to VPS public IP

## Vercel Project Setup

- Connect GitHub repo → Vercel auto-deploys on push to master
- Remove VPS-specific files:
  - `.github/workflows/deploy.yml`
  - `scripts/inject-env-loader.js`
  - `ecosystem.config.js`
- Remove from `next.config.ts`:
  - `output: "standalone"` (Vercel handles build output)
  - `serverExternalPackages` (not needed on Vercel)
- Set all env vars in Vercel dashboard (no more .env file management)

## Cron Jobs

- Current: external cron hits `/api/cron/site-checks` with bearer token
- Vercel: built-in cron via `vercel.json` config
- WHOIS (port 43 TCP): may not work on Vercel serverless — add HTTP-based fallback or degrade gracefully (code already handles errors)

## File Storage

- Current: files are Base64 in-memory, forwarded to Help Scout, only metadata in DB
- No change needed — works perfectly in serverless
- Future: Vercel Blob available when client file storage is needed ($0 for first 1GB)

## SSL Checks

- Node.js `tls` module works on Vercel — outbound TCP connections allowed

## What Gets Deleted

| File | Reason |
|------|--------|
| `.github/workflows/deploy.yml` | Replaced by Vercel auto-deploy |
| `scripts/inject-env-loader.js` | PM2 env caching workaround |
| `ecosystem.config.js` | PM2 config |

## What Stays on VPS

| Service | How Vercel Reaches It |
|---------|----------------------|
| Umami Analytics | HTTPS API (existing `UMAMI_BASE_URL`) |
| Uptime Kuma MariaDB | mysql2 over public IP (firewall-restricted) |

## Env Vars (Vercel Dashboard)

All current env vars move to Vercel dashboard:
- `DATABASE_URL` → Vercel Postgres connection string (auto-provisioned)
- `CLERK_*` / `STRIPE_*` / `HELPSCOUT_*` → same values
- `UMAMI_*` → same values (points to VPS)
- `UPTIME_KUMA_DB_HOST` → VPS public IP (was `localhost`)
- `PAGESPEED_API_KEY` → same value
- `CRON_SECRET` → same value (or use Vercel's built-in cron auth)
