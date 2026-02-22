import type { UmamiStats } from "@/lib/umami";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";

type Props = {
  stats: UmamiStats;
};

function formatTime(totalSeconds: number, visitors: number): string {
  const avg = visitors > 0 ? Math.round(totalSeconds / visitors) : 0;
  const m = Math.floor(avg / 60);
  const s = avg % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function ChangeIndicator({ value, invert }: { value: number | null; invert?: boolean }) {
  if (value === null) return null;
  // For bounce rate, down is good (invert colors)
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

export function StatsCards({ stats }: Props) {
  const items = [
    { label: "Visitors", value: stats.visitors.toLocaleString(), change: stats.change.visitors },
    { label: "Visits", value: stats.visits.toLocaleString(), change: stats.change.visits },
    { label: "Views", value: stats.pageviews.toLocaleString(), change: stats.change.pageviews },
    { label: "Bounce Rate", value: `${stats.bounceRate}%`, change: stats.change.bounceRate, invert: true },
    { label: "Visit Duration", value: formatTime(stats.totalTime, stats.visitors), change: stats.change.totalTime },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      {items.map(({ label, value, change, invert }) => (
        <Card key={label}>
          <CardContent className="pt-6 pb-4">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            <div className="mt-1">
              <ChangeIndicator value={change} invert={invert} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
