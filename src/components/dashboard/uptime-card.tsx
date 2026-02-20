import type { UptimeResult } from "@/lib/uptime-kuma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

type Props = {
  uptime: UptimeResult | null;
  configured: boolean;
};

export function UptimeCard({ uptime, configured }: Props) {
  if (!configured) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Uptime</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Uptime monitoring not configured.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!uptime) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Uptime</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to fetch uptime data.
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusColor =
    uptime.status === "up"
      ? "bg-green-500"
      : uptime.status === "down"
        ? "bg-red-500"
        : "bg-yellow-500";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Uptime</CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${statusColor}`} />
          <Badge variant={uptime.status === "up" ? "default" : "destructive"}>
            {uptime.status.toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {uptime.uptime24h != null && (
            <div>
              <p className="text-2xl font-bold">{uptime.uptime24h}%</p>
              <p className="text-xs text-muted-foreground">Last 24h</p>
            </div>
          )}
          {uptime.responseTime != null && (
            <div>
              <p className="text-2xl font-bold">{uptime.responseTime}ms</p>
              <p className="text-xs text-muted-foreground">Response time</p>
            </div>
          )}
        </div>

        {uptime.uptime30d != null && (
          <p className="text-xs text-muted-foreground">
            30-day uptime: {uptime.uptime30d}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}
