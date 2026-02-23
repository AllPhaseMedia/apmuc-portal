# Dashboard Rework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework the client dashboard with Umami analytics as hero card, add domain WHOIS info, add recent support requests, remove Google Analytics, and create a full `/analytics` page.

**Architecture:** Analytics hero card at top links to a full `/analytics` page. Below: 3-col grid (uptime, SSL, domain). Then recent support requests. Then upsell. WHOIS data cached in SiteCheck alongside SSL. Umami API extended for pageviews-over-time and top pages/referrers. Charts rendered with lightweight SVG (no chart library).

**Tech Stack:** Next.js 15, Prisma, Umami REST API v2, Node.js `whois` package, SVG sparklines/charts.

---

### Task 1: Schema Changes

**Files:**
- Modify: `prisma/schema.prisma` — Client model (lines 43-62) and SiteCheck model (lines 112-129)
- Modify: `src/lib/validations.ts` — clientFormSchema (lines 7-18)
- Modify: `src/components/admin/client-form.tsx` — Integration IDs card (lines 102-128)

**Step 1: Update Prisma schema**

In `prisma/schema.prisma`, Client model:
- Remove `gaPropertyId        String?`
- Add `umamiShareId        String?` after `umamiSiteId`

In `prisma/schema.prisma`, SiteCheck model, add after `sslExpiresAt`:
```prisma
  domainRegistrar    String?
  domainExpiresAt    DateTime?
```

**Step 2: Update validations**

In `src/lib/validations.ts`, in `clientFormSchema`:
- Remove `gaPropertyId: z.string().optional().or(z.literal("")),`
- Add `umamiShareId: z.string().optional().or(z.literal("")),` after `umamiSiteId`

**Step 3: Update admin client form**

In `src/components/admin/client-form.tsx`:
- Remove the `gaPropertyId` Input + Label block (the "Google Analytics Property ID" div)
- Add `umamiShareId` field after the `umamiSiteId` field:
```tsx
<div className="space-y-2">
  <Label htmlFor="umamiShareId">Umami Share ID</Label>
  <Input id="umamiShareId" name="umamiShareId" placeholder="abc123..." defaultValue={client?.umamiShareId ?? ""} />
</div>
```
- In `onSubmit`, remove `gaPropertyId` from values, add `umamiShareId: formData.get("umamiShareId") as string,`

**Step 4: Update admin client actions**

In `src/actions/admin/clients.ts`, `createClient()` and `updateClient()`:
- Remove `gaPropertyId: data.gaPropertyId || null,`
- Add `umamiShareId: data.umamiShareId || null,`

**Step 5: Generate Prisma client and push schema**

Run: `npx prisma generate`
Run: `npx prisma db push` (via SSH tunnel or let deploy handle it)

**Step 6: Commit**
```
feat: schema — add umamiShareId, domain WHOIS fields, remove gaPropertyId
```

---

### Task 2: WHOIS Lookup Module

**Files:**
- Create: `src/lib/whois.ts`
- Modify: `src/app/api/cron/site-checks/route.ts`

**Step 1: Install whois package**

Run: `npm install whois-json`

**Step 2: Create WHOIS module**

Create `src/lib/whois.ts`:
```typescript
import "server-only";

type WhoisResult = {
  registrar: string | null;
  expiresAt: Date | null;
};

export async function lookupDomain(hostname: string): Promise<WhoisResult> {
  try {
    const whois = await import("whois-json");
    const result = await whois.default(hostname);

    const data = Array.isArray(result) ? result[0] : result;

    const registrar =
      data?.registrar ??
      data?.registrarName ??
      data?.Registrar ??
      null;

    const expiryRaw =
      data?.expirationDate ??
      data?.registryExpiryDate ??
      data?.registrarRegistrationExpirationDate ??
      data?.["Registry Expiry Date"] ??
      null;

    let expiresAt: Date | null = null;
    if (expiryRaw) {
      const parsed = new Date(expiryRaw);
      if (!isNaN(parsed.getTime())) {
        expiresAt = parsed;
      }
    }

    return { registrar, expiresAt };
  } catch (error) {
    console.error(`WHOIS lookup failed for ${hostname}:`, error);
    return { registrar: null, expiresAt: null };
  }
}
```

**Step 3: Add WHOIS to cron job**

In `src/app/api/cron/site-checks/route.ts`, add import:
```typescript
import { lookupDomain } from "@/lib/whois";
```

In the `for` loop, add WHOIS to the parallel fetch (alongside pagespeed and ssl):
```typescript
const [pagespeed, ssl, domain] = await Promise.all([
  fetchPageSpeedScores(client.websiteUrl),
  checkSSL(hostname),
  lookupDomain(hostname),
]);
```

Add to the `prisma.siteCheck.create` data:
```typescript
domainRegistrar: domain.registrar,
domainExpiresAt: domain.expiresAt,
```

**Step 4: Commit**
```
feat: WHOIS domain lookup module + cron integration
```

---

### Task 3: Extended Umami API

**Files:**
- Modify: `src/lib/umami.ts`

**Step 1: Add pageviews-over-time function**

Append to `src/lib/umami.ts`:
```typescript
export type UmamiPageviewsEntry = {
  date: string;
  visitors: number;
  pageviews: number;
};

export async function fetchUmamiPageviews(
  siteId: string,
  period: "7d" | "30d" | "90d" = "30d"
): Promise<UmamiPageviewsEntry[]> {
  if (!BASE_URL || !API_TOKEN) return [];

  try {
    const now = Date.now();
    const ms = { "7d": 7, "30d": 30, "90d": 90 }[period] * 86400000;
    const startAt = now - ms;

    const params = new URLSearchParams({
      startAt: startAt.toString(),
      endAt: now.toString(),
      unit: "day",
      timezone: "America/New_York",
    });

    const res = await fetch(
      `${BASE_URL}/api/websites/${siteId}/pageviews?${params}`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const pageviews = data.pageviews ?? [];
    const sessions = data.sessions ?? [];

    return pageviews.map((p: { x: string; y: number }, i: number) => ({
      date: p.x,
      pageviews: p.y,
      visitors: sessions[i]?.y ?? 0,
    }));
  } catch (error) {
    console.error("Umami pageviews fetch failed:", error);
    return [];
  }
}
```

**Step 2: Add top pages/referrers function**

Append to `src/lib/umami.ts`:
```typescript
export type UmamiMetric = {
  name: string;
  value: number;
};

export async function fetchUmamiMetrics(
  siteId: string,
  type: "url" | "referrer",
  period: "7d" | "30d" | "90d" = "30d",
  limit = 10
): Promise<UmamiMetric[]> {
  if (!BASE_URL || !API_TOKEN) return [];

  try {
    const now = Date.now();
    const ms = { "7d": 7, "30d": 30, "90d": 90 }[period] * 86400000;
    const startAt = now - ms;

    const params = new URLSearchParams({
      startAt: startAt.toString(),
      endAt: now.toString(),
      type,
      limit: limit.toString(),
    });

    const res = await fetch(
      `${BASE_URL}/api/websites/${siteId}/metrics?${params}`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    return (data ?? []).map((d: { x: string; y: number }) => ({
      name: d.x,
      value: d.y,
    }));
  } catch (error) {
    console.error(`Umami ${type} metrics fetch failed:`, error);
    return [];
  }
}
```

**Step 3: Commit**
```
feat: Umami API — pageviews over time + top pages/referrers
```

---

### Task 4: Analytics Server Actions

**Files:**
- Create: `src/actions/analytics.ts`

**Step 1: Create analytics action**

```typescript
"use server";

import { requireAuth } from "@/lib/auth";
import { resolveClientContext } from "@/lib/client-context";
import {
  fetchUmamiStats,
  fetchUmamiPageviews,
  fetchUmamiMetrics,
  type UmamiStats,
  type UmamiPageviewsEntry,
  type UmamiMetric,
} from "@/lib/umami";

export type AnalyticsData = {
  stats: UmamiStats | null;
  pageviews: UmamiPageviewsEntry[];
  topPages: UmamiMetric[];
  topReferrers: UmamiMetric[];
  umamiShareUrl: string | null;
  clientName: string;
};

export async function getAnalyticsData(
  period: "7d" | "30d" | "90d" = "30d"
): Promise<
  | { success: true; data: AnalyticsData }
  | { success: false; error: string }
> {
  try {
    await requireAuth();

    const ctx = await resolveClientContext();
    if (!ctx) {
      return { success: false, error: "No client record found for your account." };
    }

    if (!ctx.permissions.analytics) {
      return { success: false, error: "You don't have permission to view analytics." };
    }

    const { client } = ctx;
    if (!client.umamiSiteId) {
      return { success: false, error: "Analytics not configured for this site." };
    }

    const [stats, pageviews, topPages, topReferrers] = await Promise.all([
      fetchUmamiStats(client.umamiSiteId, period),
      fetchUmamiPageviews(client.umamiSiteId, period),
      fetchUmamiMetrics(client.umamiSiteId, "url", period),
      fetchUmamiMetrics(client.umamiSiteId, "referrer", period),
    ]);

    const umamiShareUrl =
      client.umamiShareId && process.env.UMAMI_BASE_URL
        ? `${process.env.UMAMI_BASE_URL}/share/${client.umamiShareId}`
        : null;

    return {
      success: true,
      data: { stats, pageviews, topPages, topReferrers, umamiShareUrl, clientName: client.name },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load analytics",
    };
  }
}
```

**Step 2: Commit**
```
feat: analytics server action with full Umami data
```

---

### Task 5: Analytics Page Components

**Files:**
- Create: `src/components/analytics/stats-cards.tsx`
- Create: `src/components/analytics/pageview-chart.tsx`
- Create: `src/components/analytics/top-pages-table.tsx`
- Create: `src/components/analytics/top-referrers-table.tsx`

**Step 1: Stats cards component**

Create `src/components/analytics/stats-cards.tsx`:
```tsx
import type { UmamiStats } from "@/lib/umami";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Eye, ArrowDownUp, Clock } from "lucide-react";

type Props = {
  stats: UmamiStats;
};

function formatTime(totalSeconds: number, visitors: number): string {
  const avg = visitors > 0 ? Math.round(totalSeconds / visitors) : 0;
  const m = Math.floor(avg / 60);
  const s = avg % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const items = [
  { key: "visitors", label: "Visitors", icon: Users, format: (v: number) => v.toLocaleString() },
  { key: "pageviews", label: "Pageviews", icon: Eye, format: (v: number) => v.toLocaleString() },
  { key: "bounceRate", label: "Bounce Rate", icon: ArrowDownUp, format: (v: number) => `${v}%` },
] as const;

export function StatsCards({ stats }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ key, label, icon: Icon, format }) => (
        <Card key={key}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{format(stats[key])}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{formatTime(stats.totalTime, stats.visitors)}</p>
              <p className="text-sm text-muted-foreground">Avg. Visit</p>
            </div>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Pageview chart (SVG area chart)**

Create `src/components/analytics/pageview-chart.tsx`:
```tsx
"use client";

import type { UmamiPageviewsEntry } from "@/lib/umami";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

type Props = {
  data: UmamiPageviewsEntry[];
};

export function PageviewChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Pageviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data available.</p>
        </CardContent>
      </Card>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.pageviews), 1);
  const w = 800;
  const h = 200;
  const px = 0;
  const py = 10;
  const chartW = w - px * 2;
  const chartH = h - py * 2;

  const points = data.map((d, i) => ({
    x: px + (i / (data.length - 1)) * chartW,
    y: py + chartH - (d.pageviews / maxVal) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${py + chartH} L ${points[0].x} ${py + chartH} Z`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Pageviews</CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none">
          <path d={areaPath} className="fill-primary/10" />
          <path d={linePath} className="fill-none stroke-primary stroke-2" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2.5" className="fill-primary" />
          ))}
        </svg>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{data.length > 0 ? format(new Date(data[0].date), "MMM d") : ""}</span>
          <span>{data.length > 0 ? format(new Date(data[data.length - 1].date), "MMM d") : ""}</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 3: Top pages table**

Create `src/components/analytics/top-pages-table.tsx`:
```tsx
import type { UmamiMetric } from "@/lib/umami";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  pages: UmamiMetric[];
};

export function TopPagesTable({ pages }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Top Pages</CardTitle>
      </CardHeader>
      <CardContent>
        {pages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No page data available.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead className="text-right w-24">Views</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.name}>
                  <TableCell className="font-mono text-sm truncate max-w-[300px]">
                    {page.name}
                  </TableCell>
                  <TableCell className="text-right">{page.value.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 4: Top referrers table**

Create `src/components/analytics/top-referrers-table.tsx`:
```tsx
import type { UmamiMetric } from "@/lib/umami";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  referrers: UmamiMetric[];
};

export function TopReferrersTable({ referrers }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Top Referrers</CardTitle>
      </CardHeader>
      <CardContent>
        {referrers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No referrer data available.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead className="text-right w-24">Visits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrers.map((ref) => (
                <TableRow key={ref.name}>
                  <TableCell className="text-sm truncate max-w-[300px]">
                    {ref.name || "(direct)"}
                  </TableCell>
                  <TableCell className="text-right">{ref.value.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 5: Commit**
```
feat: analytics page components — stats cards, chart, tables
```

---

### Task 6: Full Analytics Page

**Files:**
- Create: `src/app/(dashboard)/analytics/page.tsx`
- Modify: `src/components/layout/app-sidebar.tsx` — add Analytics to clientNav (line 58-63)

**Step 1: Create analytics page**

Create `src/app/(dashboard)/analytics/page.tsx`:
```tsx
import { requireAuth } from "@/lib/auth";
import { getAnalyticsData } from "@/actions/analytics";
import { StatsCards } from "@/components/analytics/stats-cards";
import { PageviewChart } from "@/components/analytics/pageview-chart";
import { TopPagesTable } from "@/components/analytics/top-pages-table";
import { TopReferrersTable } from "@/components/analytics/top-referrers-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

const PERIODS = ["7d", "30d", "90d"] as const;
type Period = (typeof PERIODS)[number];

function isPeriod(v: string | undefined): v is Period {
  return PERIODS.includes(v as Period);
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  await requireAuth();
  const params = await searchParams;
  const period: Period = isPeriod(params.period) ? params.period : "30d";
  const result = await getAnalyticsData(period);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { stats, pageviews, topPages, topReferrers, umamiShareUrl, clientName } = result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">{clientName} — website traffic</p>
        </div>
        {umamiShareUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={umamiShareUrl} target="_blank" rel="noopener noreferrer">
              View Full Dashboard
              <ExternalLink className="ml-2 h-3 w-3" />
            </a>
          </Button>
        )}
      </div>

      <div className="flex gap-1">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={`/analytics?period=${p}`}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              p === period
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
          </Link>
        ))}
      </div>

      {stats && <StatsCards stats={stats} />}

      <PageviewChart data={pageviews} />

      <div className="grid gap-4 md:grid-cols-2">
        <TopPagesTable pages={topPages} />
        <TopReferrersTable referrers={topReferrers} />
      </div>
    </div>
  );
}
```

**Step 2: Add Analytics to sidebar**

In `src/components/layout/app-sidebar.tsx`, update the `clientNav` array (line 58-63):
```typescript
const clientNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", permission: "dashboard" },
  { label: "Analytics", href: "/analytics", icon: "BarChart3", permission: "analytics" },
  { label: "Support", href: "/support", icon: "MessageSquare", permission: "support" },
  { label: "Billing", href: "/billing", icon: "CreditCard", permission: "billing" },
  { label: "Knowledge Base", href: "/knowledge-base", icon: "BookOpen" },
];
```

**Step 3: Commit**
```
feat: full analytics page with period selector + sidebar nav
```

---

### Task 7: Dashboard Components (Domain Card + Support Card)

**Files:**
- Create: `src/components/dashboard/domain-card.tsx`
- Create: `src/components/dashboard/recent-support-card.tsx`

**Step 1: Domain info card**

Create `src/components/dashboard/domain-card.tsx`:
```tsx
import type { SiteCheck } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";
import { differenceInDays, format } from "date-fns";

type Props = {
  siteCheck: SiteCheck | null;
  websiteUrl: string | null;
};

export function DomainCard({ siteCheck, websiteUrl }: Props) {
  if (!websiteUrl) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Domain</CardTitle>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No website URL configured.</p>
        </CardContent>
      </Card>
    );
  }

  if (!siteCheck?.domainRegistrar && !siteCheck?.domainExpiresAt) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Domain</CardTitle>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Domain info will be available after the next scan.
          </p>
        </CardContent>
      </Card>
    );
  }

  const daysRemaining = siteCheck.domainExpiresAt
    ? differenceInDays(new Date(siteCheck.domainExpiresAt), new Date())
    : null;
  const expiryWarning = daysRemaining != null && daysRemaining <= 30;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Domain</CardTitle>
        <Globe className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        {siteCheck.domainRegistrar && (
          <p className="text-sm text-muted-foreground">
            Registrar: {siteCheck.domainRegistrar}
          </p>
        )}
        {siteCheck.domainExpiresAt && (
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Expires: {format(new Date(siteCheck.domainExpiresAt), "MMM d, yyyy")}
              {daysRemaining != null && ` (${daysRemaining} days)`}
            </p>
            {expiryWarning && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                Expires soon
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Recent support requests card**

Create `src/components/dashboard/recent-support-card.tsx`:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Inbox } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import type { HelpScoutConversation } from "@/lib/helpscout";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  pending: "secondary",
  closed: "outline",
  spam: "destructive",
};

type Props = {
  tickets: HelpScoutConversation[];
};

export function RecentSupportCard({ tickets }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="h-4 w-4" />
          Recent Support Requests
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/support/new">
              <Plus className="mr-1 h-3 w-3" />
              New Ticket
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/support">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center py-6">
            <Inbox className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No support tickets yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/support/${ticket.id}`}
                className="flex items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:border-primary/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    #{ticket.number}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={STATUS_VARIANT[ticket.status] ?? "secondary"} className="text-xs">
                    {ticket.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(ticket.userUpdatedAt), "MMM d")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 3: Commit**
```
feat: domain info card + recent support requests card
```

---

### Task 8: Rework Dashboard Page + Analytics Hero Card

**Files:**
- Modify: `src/components/dashboard/analytics-card.tsx` — complete rewrite as clickable hero
- Modify: `src/actions/dashboard.ts` — add recent tickets, domain data, sparkline data
- Modify: `src/app/(dashboard)/dashboard/page.tsx` — new layout

**Step 1: Rework analytics card as hero**

Rewrite `src/components/dashboard/analytics-card.tsx`:
```tsx
import type { UmamiStats, UmamiPageviewsEntry } from "@/lib/umami";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import Link from "next/link";

type Props = {
  analytics: UmamiStats | null;
  sparkline: UmamiPageviewsEntry[];
  configured: boolean;
};

function Sparkline({ data }: { data: UmamiPageviewsEntry[] }) {
  if (data.length < 2) return null;

  const maxVal = Math.max(...data.map((d) => d.pageviews), 1);
  const w = 600;
  const h = 60;

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - (d.pageviews / maxVal) * (h - 4),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16 mt-3" preserveAspectRatio="none">
      <path d={areaPath} className="fill-primary/10" />
      <path d={linePath} className="fill-none stroke-primary stroke-[1.5]" />
    </svg>
  );
}

export function AnalyticsCard({ analytics, sparkline, configured }: Props) {
  if (!configured) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Analytics</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Analytics not configured.</p>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Analytics</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unable to fetch analytics data.</p>
        </CardContent>
      </Card>
    );
  }

  const avgTime = analytics.visitors > 0 ? Math.round(analytics.totalTime / analytics.visitors) : 0;
  const minutes = Math.floor(avgTime / 60);
  const seconds = avgTime % 60;

  return (
    <Link href="/analytics" className="block">
      <Card className="transition-colors hover:border-primary/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Analytics (30 days)</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold">{analytics.visitors.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Visitors</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.pageviews.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Pageviews</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.bounceRate}%</p>
              <p className="text-xs text-muted-foreground">Bounce Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {minutes > 0 ? `${minutes}m ` : ""}{seconds}s
              </p>
              <p className="text-xs text-muted-foreground">Avg. Visit</p>
            </div>
          </div>
          <Sparkline data={sparkline} />
          <p className="text-xs text-muted-foreground mt-2 text-right">View Analytics →</p>
        </CardContent>
      </Card>
    </Link>
  );
}
```

**Step 2: Update dashboard action**

Rewrite `src/actions/dashboard.ts` to add recent tickets, sparkline data, and domain info:
```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { resolveClientContext } from "@/lib/client-context";
import { fetchUptimeStatus, type UptimeResult } from "@/lib/uptime-kuma";
import { fetchUmamiStats, fetchUmamiPageviews, type UmamiStats, type UmamiPageviewsEntry } from "@/lib/umami";
import * as helpscout from "@/lib/helpscout";
import type { Client, ClientService, SiteCheck, RecommendedService } from "@prisma/client";
import type { ContactPermissions } from "@/types";
import type { HelpScoutConversation } from "@/lib/helpscout";

export type DashboardData = {
  client: Client & { services: ClientService[] };
  siteCheck: SiteCheck | null;
  uptime: UptimeResult | null;
  analytics: UmamiStats | null;
  sparkline: UmamiPageviewsEntry[];
  recentTickets: HelpScoutConversation[];
  upsellServices: RecommendedService[];
  permissions: ContactPermissions;
};

export async function getDashboardData(): Promise<
  | { success: true; data: DashboardData }
  | { success: false; error: string }
> {
  try {
    await requireAuth();

    const ctx = await resolveClientContext();
    if (!ctx) {
      return { success: false, error: "No client record found for your account." };
    }

    const { client, permissions, userEmail } = ctx;

    // Fetch site check
    const siteChecks = await prisma.siteCheck.findMany({
      where: { clientId: client.id },
      orderBy: { checkedAt: "desc" },
      take: 1,
    });
    const siteCheck = siteChecks[0] ?? null;

    // Fetch live data in parallel
    const [uptime, analytics, sparkline, recentTickets] = await Promise.all([
      permissions.uptime && client.uptimeKumaMonitorId
        ? fetchUptimeStatus(client.uptimeKumaMonitorId)
        : null,
      permissions.analytics && client.umamiSiteId
        ? fetchUmamiStats(client.umamiSiteId, "30d")
        : null,
      permissions.analytics && client.umamiSiteId
        ? fetchUmamiPageviews(client.umamiSiteId, "30d")
        : Promise.resolve([]),
      permissions.support && helpscout.isConfigured()
        ? helpscout.getConversationsByEmail(userEmail).then((convos) => {
            const emailLower = userEmail.toLowerCase();
            return (convos ?? [])
              .filter((c) => {
                const custEmail = (c.primaryCustomer?.email ?? c.customer?.email ?? "").toLowerCase();
                return custEmail === emailLower;
              })
              .slice(0, 5);
          })
        : Promise.resolve([]),
    ]);

    // Upsell: active recommended services the client doesn't already have
    const clientServiceTypes = client.services.map((s) => s.type);
    const upsellServices = await prisma.recommendedService.findMany({
      where: {
        isActive: true,
        type: { notIn: clientServiceTypes },
      },
      include: {
        form: {
          select: { id: true, name: true, fields: true, settings: true, isActive: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return {
      success: true,
      data: {
        client,
        siteCheck,
        uptime,
        analytics,
        sparkline: sparkline ?? [],
        recentTickets: recentTickets ?? [],
        upsellServices,
        permissions,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load dashboard",
    };
  }
}
```

**Step 3: Rework dashboard page layout**

Rewrite `src/app/(dashboard)/dashboard/page.tsx`:
```tsx
import { requireAuth } from "@/lib/auth";
import { getDashboardData } from "@/actions/dashboard";
import { getBranding } from "@/lib/branding";
import { Card, CardContent } from "@/components/ui/card";
import { UptimeCard } from "@/components/dashboard/uptime-card";
import { AnalyticsCard } from "@/components/dashboard/analytics-card";
import { SSLCard } from "@/components/dashboard/ssl-card";
import { DomainCard } from "@/components/dashboard/domain-card";
import { RecentSupportCard } from "@/components/dashboard/recent-support-card";
import { UpsellSection } from "@/components/dashboard/upsell-section";
import { Separator } from "@/components/ui/separator";

export default async function DashboardPage() {
  const [user, branding] = await Promise.all([requireAuth(), getBranding()]);
  const result = await getDashboardData();

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground">{branding.description}</p>
        </div>

        {user.isAdmin ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <p className="text-sm font-medium">
                You&apos;re signed in as an admin. Your account isn&apos;t
                linked to a client record. Use the admin panel in the sidebar to
                manage clients and content.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{result.error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const {
    client,
    siteCheck,
    uptime,
    analytics,
    sparkline,
    recentTickets,
    upsellServices,
    permissions,
  } = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground">{branding.description}</p>
      </div>

      {/* Analytics Hero — full width */}
      {permissions.analytics && (
        <AnalyticsCard
          analytics={analytics}
          sparkline={sparkline}
          configured={!!client.umamiSiteId}
        />
      )}

      {/* 3-column grid: Uptime, SSL, Domain */}
      {(permissions.uptime || permissions.siteHealth) && (
        <div className="grid gap-4 md:grid-cols-3">
          {permissions.uptime && (
            <UptimeCard
              uptime={uptime}
              configured={!!client.uptimeKumaMonitorId}
            />
          )}
          {permissions.siteHealth && (
            <SSLCard siteCheck={siteCheck} websiteUrl={client.websiteUrl} />
          )}
          {permissions.siteHealth && (
            <DomainCard siteCheck={siteCheck} websiteUrl={client.websiteUrl} />
          )}
        </div>
      )}

      {/* Recent Support Requests */}
      {permissions.support && (
        <RecentSupportCard tickets={recentTickets} />
      )}

      {/* Upsell */}
      {upsellServices.length > 0 && (
        <>
          <Separator />
          <UpsellSection
            services={upsellServices}
            prefill={{
              name: client.name,
              email: user.email,
              website: client.websiteUrl || undefined,
            }}
          />
        </>
      )}

      {user.isAdmin && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-sm font-medium">
              You&apos;re signed in as an admin. Admin panel is available in the
              sidebar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**Step 4: Commit**
```
feat: rework dashboard — analytics hero, 3-col grid, support card
```

---

### Task 9: Export HelpScoutConversation Type

**Files:**
- Modify: `src/lib/helpscout.ts` — export the `HelpScoutConversation` type

The `HelpScoutConversation` type is currently defined but not exported. The new `RecentSupportCard` and `dashboard.ts` need it.

**Step 1:** In `src/lib/helpscout.ts`, change the type definition line from:
```typescript
type HelpScoutConversation = {
```
to:
```typescript
export type HelpScoutConversation = {
```

This should be done early (or first verified as needed) since both `src/actions/dashboard.ts` and `src/components/dashboard/recent-support-card.tsx` import it.

**Step 2: Commit** (can be squashed with Task 8)
```
fix: export HelpScoutConversation type for dashboard use
```

---

### Task 10: Build Verification + Cleanup

**Step 1:** Run `npx prisma generate`
**Step 2:** Run `npm run build` — fix any TypeScript errors
**Step 3:** Verify all routes compile
**Step 4:** Commit any fixes
```
chore: build verification and cleanup
```

---

## File Summary

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Remove gaPropertyId, add umamiShareId + domain fields |
| `src/lib/validations.ts` | Remove gaPropertyId, add umamiShareId |
| `src/lib/whois.ts` | NEW — WHOIS lookup module |
| `src/lib/umami.ts` | Add pageviews + metrics API functions |
| `src/lib/helpscout.ts` | Export HelpScoutConversation type |
| `src/actions/analytics.ts` | NEW — full analytics data action |
| `src/actions/dashboard.ts` | Add sparkline, recent tickets, domain data |
| `src/actions/admin/clients.ts` | Remove gaPropertyId, add umamiShareId |
| `src/components/admin/client-form.tsx` | Remove GA field, add umamiShareId |
| `src/components/dashboard/analytics-card.tsx` | Rewrite as clickable hero with sparkline |
| `src/components/dashboard/domain-card.tsx` | NEW — domain WHOIS info card |
| `src/components/dashboard/recent-support-card.tsx` | NEW — recent support tickets |
| `src/components/analytics/stats-cards.tsx` | NEW — analytics page stats |
| `src/components/analytics/pageview-chart.tsx` | NEW — SVG area chart |
| `src/components/analytics/top-pages-table.tsx` | NEW — top pages table |
| `src/components/analytics/top-referrers-table.tsx` | NEW — top referrers table |
| `src/app/(dashboard)/analytics/page.tsx` | NEW — full analytics page |
| `src/app/(dashboard)/dashboard/page.tsx` | Rework layout |
| `src/components/layout/app-sidebar.tsx` | Add Analytics nav item |
| `src/app/api/cron/site-checks/route.ts` | Add WHOIS to cron |
