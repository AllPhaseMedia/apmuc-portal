# Dashboard Rework Design

## Summary

Rework the client dashboard to prioritize Umami analytics as the hero card, add domain WHOIS info, add recent support requests, remove Google Analytics, and create a full `/analytics` page. Remove PageSpeed scores from the dashboard.

## Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Welcome back, Mike                                             │
│  Your website at a glance                                       │
├─────────────────────────────────────────────────────────────────┤
│  ANALYTICS (full-width hero, clickable → /analytics)            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ 1,234    │ │ 3,456    │ │ 42%      │ │ 2m 15s   │          │
│  │ Visitors │ │ Pageviews│ │ Bounce   │ │ Avg Visit│          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  [sparkline pageview trend across last 30 days]                 │
│  "View Analytics →"                                             │
├───────────────────┬───────────────────┬─────────────────────────┤
│  UPTIME            │  SSL CERTIFICATE  │  DOMAIN INFO           │
│  ● UP              │  ✓ Valid          │  Registrar: Namecheap  │
│  99.9% (24h)       │  Let's Encrypt    │  Expires: Mar 2026     │
│  145ms response    │  Exp: Aug 2026    │  (385 days)            │
├───────────────────┴───────────────────┴─────────────────────────┤
│  RECENT SUPPORT REQUESTS                          View All →    │
│  #412 - SSL certificate renewal question    [active]   Feb 18  │
│  #408 - Homepage banner update              [closed]   Feb 12  │
│  #401 - Contact form not working            [closed]   Feb 5   │
├─────────────────────────────────────────────────────────────────┤
│  UPSELL SECTION (existing, unchanged)                           │
└─────────────────────────────────────────────────────────────────┘
```

### Card Details

**Analytics Hero Card** (full-width, top)
- Shows 30-day summary: visitors, pageviews, bounce rate, avg visit time
- Sparkline chart of daily pageviews (lightweight, no chart library — SVG path or CSS)
- Entire card is a link to `/analytics`
- Subtle "View Analytics →" text in footer
- Only shown if `permissions.analytics && client.umamiSiteId`

**Uptime Card** (1/3 width)
- Existing component, no changes

**SSL Certificate Card** (1/3 width)
- Existing component, no changes

**Domain Info Card** (1/3 width, NEW)
- Shows: registrar name, domain expiry date, days remaining
- Warning badge if expiring within 30 days
- Data from WHOIS lookup, cached in `SiteCheck`
- Only shown if `permissions.siteHealth && client.websiteUrl`

**Recent Support Requests** (full-width, NEW)
- Shows last 5 tickets from Help Scout (subject, status badge, date)
- "View All →" link to `/support`
- "New Ticket" button
- Only shown if `permissions.support`

**Upsell Section** (full-width, existing)
- No changes

### Removed from Dashboard
- PageSpeed score display (component exists but won't be shown)
- Google Analytics references

## Full Analytics Page (`/analytics`)

### Layout
- Period selector: 7d / 30d / 90d (tab group)
- Summary stat cards in a row: Visitors, Pageviews, Bounce Rate, Avg Visit Time
- Area chart: daily pageviews over selected period
- Two tables side by side (2-col grid):
  - Top 10 Pages (URL + view count)
  - Top 10 Referrers (source + visit count)
- "View Full Dashboard" button → opens Umami share URL in new tab (only if `umamiShareId` is set on Client)

### Umami API Endpoints Used
- `GET /api/websites/{id}/stats` — summary stats (already implemented)
- `GET /api/websites/{id}/pageviews` — pageviews over time (NEW)
- `GET /api/websites/{id}/metrics?type=url` — top pages (NEW)
- `GET /api/websites/{id}/metrics?type=referrer` — top referrers (NEW)

## Domain WHOIS Info

### Data Source
- Node.js WHOIS library (e.g., `whois-json` or raw `whois` package)
- New `src/lib/whois.ts` module with `"server-only"` guard
- Parse WHOIS response for: registrar name, expiration date

### Storage
- Add to `SiteCheck` model: `domainRegistrar String?`, `domainExpiresAt DateTime?`
- Refreshed alongside SSL checks in the existing cron job (`/api/cron/site-checks`)

### Dashboard Card
- Shows registrar, expiry date, days remaining
- Warning state if expiring within 30 days
- Fallback if WHOIS lookup fails: "Domain info unavailable"

## Schema Changes

### Client Model
- Remove `gaPropertyId String?`
- Add `umamiShareId String?`

### SiteCheck Model
- Add `domainRegistrar String?`
- Add `domainExpiresAt DateTime?`

### Admin Form / Validations
- Remove `gaPropertyId` from `clientFormSchema` and admin form UI
- Add `umamiShareId` field to admin form (optional, under Integration IDs)

## New Files

| File | Purpose |
|------|---------|
| `src/lib/whois.ts` | WHOIS lookup module |
| `src/app/(dashboard)/analytics/page.tsx` | Full analytics page |
| `src/actions/analytics.ts` | Server actions for analytics data |
| `src/components/dashboard/domain-card.tsx` | Domain info card |
| `src/components/dashboard/recent-support-card.tsx` | Recent support requests card |
| `src/components/analytics/stats-cards.tsx` | Summary stat cards |
| `src/components/analytics/pageview-chart.tsx` | Pageviews over time chart |
| `src/components/analytics/top-pages-table.tsx` | Top pages table |
| `src/components/analytics/top-referrers-table.tsx` | Top referrers table |

## Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Remove gaPropertyId, add umamiShareId, add domain fields to SiteCheck |
| `src/lib/umami.ts` | Add pageviews-over-time, top pages, top referrers API functions |
| `src/actions/dashboard.ts` | Add recent tickets + domain data to dashboard payload |
| `src/app/(dashboard)/dashboard/page.tsx` | New layout with hero analytics, 3-col grid, support card |
| `src/components/dashboard/analytics-card.tsx` | Rework as clickable hero card with sparkline |
| `src/lib/validations.ts` | Remove gaPropertyId, add umamiShareId |
| `src/components/admin/client-form.tsx` | Remove GA field, add umamiShareId field |
| `src/app/api/cron/site-checks/route.ts` | Add WHOIS lookup alongside SSL checks |
