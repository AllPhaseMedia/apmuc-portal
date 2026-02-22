import type { UmamiStats, UmamiPageviewsEntry } from "@/lib/umami";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";

type Props = {
  analytics: UmamiStats | null;
  sparkline: UmamiPageviewsEntry[];
  configured: boolean;
};

function ChangeIndicator({ value, invert }: { value: number | null; invert?: boolean }) {
  if (value === null) return null;
  const isPositive = invert ? value < 0 : value > 0;
  const isNegative = invert ? value > 0 : value < 0;
  const Icon = value >= 0 ? ArrowUp : ArrowDown;
  const absVal = Math.abs(value);

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isPositive ? "text-emerald-600 dark:text-emerald-400" :
        isNegative ? "text-red-600 dark:text-red-400" :
        "text-muted-foreground"
      }`}
    >
      <Icon className="h-3 w-3" />
      {absVal}%
    </span>
  );
}

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

function formatTime(totalSeconds: number, visitors: number): string {
  const avg = visitors > 0 ? Math.round(totalSeconds / visitors) : 0;
  const m = Math.floor(avg / 60);
  const s = avg % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
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

  const items = [
    { label: "Visitors", value: analytics.visitors.toLocaleString(), change: analytics.change.visitors },
    { label: "Views", value: analytics.pageviews.toLocaleString(), change: analytics.change.pageviews },
    { label: "Bounce Rate", value: `${analytics.bounceRate}%`, change: analytics.change.bounceRate, invert: true },
    { label: "Avg. Visit", value: formatTime(analytics.totalTime, analytics.visitors), change: analytics.change.totalTime },
  ];

  return (
    <Link href="/analytics" className="block">
      <Card className="transition-colors hover:border-primary/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Analytics (30 days)</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {items.map(({ label, value, change, invert }) => (
              <div key={label}>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
                <ChangeIndicator value={change} invert={invert} />
              </div>
            ))}
          </div>
          <Sparkline data={sparkline} />
          <p className="text-xs text-muted-foreground mt-2 text-right">View Analytics →</p>
        </CardContent>
      </Card>
    </Link>
  );
}
