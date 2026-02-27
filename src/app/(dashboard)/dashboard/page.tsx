import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import { getDashboardContext } from "@/actions/dashboard";
import { getBranding, getDashboardAnnouncement } from "@/lib/branding";
import { AnnouncementBanner } from "@/components/dashboard/announcement-banner";
import { Card, CardContent } from "@/components/ui/card";
import { SSLCard } from "@/components/dashboard/ssl-card";
import { DomainCard } from "@/components/dashboard/domain-card";
import { AnalyticsCard } from "@/components/dashboard/analytics-card";
import { UptimeCard } from "@/components/dashboard/uptime-card";
import { UpsellSection } from "@/components/dashboard/upsell-section";
import { Separator } from "@/components/ui/separator";
import {
  DashboardAnalytics,
  DashboardUptime,
  DashboardSupport,
  AnalyticsSkeleton,
  UptimeSkeleton,
  SupportSkeleton,
} from "@/components/dashboard/dashboard-sections";

export default async function DashboardPage() {
  const [user, branding, announcement] = await Promise.all([
    requireAuth(),
    getBranding(),
    getDashboardAnnouncement(),
  ]);
  const result = await getDashboardContext();

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground">{branding.description}</p>
        </div>

        {announcement.message && (
          <AnnouncementBanner
            message={announcement.message}
            messageId={announcement.messageId}
          />
        )}

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

  const {
    client,
    siteCheck,
    upsellServices,
    permissions,
    userEmail,
  } = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground">{branding.description}</p>
      </div>

      {announcement.message && (
        <AnnouncementBanner
          message={announcement.message}
          messageId={announcement.messageId}
        />
      )}

      {/* Analytics — streamed */}
      {permissions.analytics && client.umamiSiteId ? (
        <Suspense fallback={<AnalyticsSkeleton />}>
          <DashboardAnalytics siteId={client.umamiSiteId} />
        </Suspense>
      ) : permissions.analytics ? (
        <AnalyticsCard analytics={null} sparkline={[]} configured={false} />
      ) : null}

      {/* Grid: Uptime (streamed), SSL + Domain (instant from DB) */}
      {(permissions.uptime || permissions.siteHealth) && (
        <div className="grid gap-4 md:grid-cols-3">
          {permissions.uptime && client.uptimeKumaMonitorId ? (
            <Suspense fallback={<UptimeSkeleton />}>
              <DashboardUptime monitorId={client.uptimeKumaMonitorId} />
            </Suspense>
          ) : permissions.uptime ? (
            <UptimeCard uptime={null} configured={false} />
          ) : null}
          {permissions.siteHealth && (
            <SSLCard siteCheck={siteCheck} websiteUrl={client.websiteUrl} />
          )}
          {permissions.siteHealth && (
            <DomainCard siteCheck={siteCheck} websiteUrl={client.websiteUrl} />
          )}
        </div>
      )}

      {/* Support — streamed */}
      {permissions.support && (
        <Suspense fallback={<SupportSkeleton />}>
          <DashboardSupport email={userEmail} />
        </Suspense>
      )}

      {/* Upsell — instant from DB */}
      {upsellServices.length > 0 && (
        <>
          <Separator />
          <UpsellSection
            services={upsellServices}
            prefill={{
              name: client.name,
              email: user.email,
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
