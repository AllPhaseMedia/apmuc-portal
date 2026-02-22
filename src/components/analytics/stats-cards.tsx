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
