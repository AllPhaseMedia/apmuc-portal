import { requireAuth } from "@/lib/auth";
import { getDashboardData } from "@/actions/dashboard";
import { getBranding } from "@/lib/branding";
import { Card, CardContent } from "@/components/ui/card";
import { UptimeCard } from "@/components/dashboard/uptime-card";
import { AnalyticsCard } from "@/components/dashboard/analytics-card";
import { SSLCard } from "@/components/dashboard/ssl-card";
import { UpsellSection } from "@/components/dashboard/upsell-section";
import { Separator } from "@/components/ui/separator";

export default async function DashboardPage() {
  const [user, branding] = await Promise.all([requireAuth(), getBranding()]);
  const result = await getDashboardData();

  // Admin without a client record sees admin notice
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

  const { client, siteCheck, uptime, analytics, upsellServices, permissions } =
    result.data;

  const showSiteHealth = permissions.siteHealth;
  const showUptime = permissions.uptime;
  const showAnalytics = permissions.analytics;
  const showAnyCard = showSiteHealth || showUptime || showAnalytics;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground">{branding.description}</p>
      </div>

      {showAnyCard && (
        <div className="grid gap-4 md:grid-cols-2">
          {showSiteHealth && (
            <SSLCard siteCheck={siteCheck} websiteUrl={client.websiteUrl} />
          )}
          {showUptime && (
            <UptimeCard
              uptime={uptime}
              configured={!!client.uptimeKumaMonitorId}
            />
          )}
          {showAnalytics && (
            <AnalyticsCard
              analytics={analytics}
              configured={!!client.umamiSiteId}
            />
          )}
        </div>
      )}

      {upsellServices.length > 0 && (
        <>
          <Separator />
          <UpsellSection
            services={upsellServices}
            prefill={{
              name: client.name,
              email: client.email,
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
