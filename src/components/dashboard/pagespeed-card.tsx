import type { SiteCheck } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreGauge } from "./score-gauge";
import { Gauge } from "lucide-react";
import { format } from "date-fns";

type Props = {
  siteCheck: SiteCheck | null;
  websiteUrl: string | null;
};

export function PageSpeedCard({ siteCheck, websiteUrl }: Props) {
  if (!websiteUrl) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Performance</CardTitle>
          <Gauge className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No website URL configured.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!siteCheck || siteCheck.performanceScore == null) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Performance</CardTitle>
          <Gauge className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Performance data will be available after the next scan.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">PageSpeed Scores</CardTitle>
        <Gauge className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          <ScoreGauge
            score={siteCheck.performanceScore}
            label="Performance"
          />
          <ScoreGauge
            score={siteCheck.accessibilityScore ?? 0}
            label="Accessibility"
          />
          <ScoreGauge
            score={siteCheck.bestPracticesScore ?? 0}
            label="Best Practices"
          />
          <ScoreGauge score={siteCheck.seoScore ?? 0} label="SEO" />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Last checked {format(new Date(siteCheck.checkedAt), "MMM d, h:mm a")}
        </p>
      </CardContent>
    </Card>
  );
}
