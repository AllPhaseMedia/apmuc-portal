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

const PERIODS = ["24h", "7d", "30d", "90d"] as const;
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
            {p === "24h" ? "24 Hours" : p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
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
