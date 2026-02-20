import type { UmamiStats } from "@/lib/umami";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

type Props = {
  analytics: UmamiStats | null;
  configured: boolean;
};

export function AnalyticsCard({ analytics, configured }: Props) {
  if (!configured) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Analytics</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Analytics not configured.
          </p>
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
          <p className="text-sm text-muted-foreground">
            Unable to fetch analytics data.
          </p>
        </CardContent>
      </Card>
    );
  }

  const avgTime =
    analytics.visitors > 0
      ? Math.round(analytics.totalTime / analytics.visitors)
      : 0;
  const minutes = Math.floor(avgTime / 60);
  const seconds = avgTime % 60;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          Analytics (30 days)
        </CardTitle>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-bold">
              {analytics.visitors.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Visitors</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {analytics.pageviews.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Pageviews</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{analytics.bounceRate}%</p>
            <p className="text-xs text-muted-foreground">Bounce rate</p>
          </div>
        </div>
        {avgTime > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Avg. visit: {minutes > 0 ? `${minutes}m ` : ""}
            {seconds}s
          </p>
        )}
      </CardContent>
    </Card>
  );
}
