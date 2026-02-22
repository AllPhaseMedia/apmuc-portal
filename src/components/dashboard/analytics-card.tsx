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
