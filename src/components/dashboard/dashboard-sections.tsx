import {
  fetchDashboardAnalytics,
  fetchDashboardUptime,
  fetchDashboardTickets,
} from "@/actions/dashboard";
import { AnalyticsCard } from "./analytics-card";
import { UptimeCard } from "./uptime-card";
import { RecentSupportCard } from "./recent-support-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ── Async server components (used inside Suspense) ──────────

export async function DashboardAnalytics({ siteId }: { siteId: string }) {
  const { stats, sparkline } = await fetchDashboardAnalytics(siteId);
  return <AnalyticsCard analytics={stats} sparkline={sparkline} configured />;
}

export async function DashboardUptime({ monitorId }: { monitorId: string }) {
  const uptime = await fetchDashboardUptime(monitorId);
  return <UptimeCard uptime={uptime} configured />;
}

export async function DashboardSupport({ email }: { email: string }) {
  const tickets = await fetchDashboardTickets(email);
  return <RecentSupportCard tickets={tickets} />;
}

// ── Skeleton fallbacks ──────────────────────────────────────

export function AnalyticsSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-1 h-3 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-3 h-16 w-full" />
      </CardContent>
    </Card>
  );
}

export function UptimeSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-6 w-12" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-1 h-3 w-14" />
          </div>
          <div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-1 h-3 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SupportSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <Skeleton className="h-4 w-44" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </CardContent>
    </Card>
  );
}
