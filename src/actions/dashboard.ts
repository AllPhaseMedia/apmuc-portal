"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { resolveClientContext } from "@/lib/client-context";
import { fetchUptimeStatus, type UptimeResult } from "@/lib/uptime-kuma";
import { fetchUmamiStats, fetchUmamiPageviews, type UmamiStats, type UmamiPageviewsEntry } from "@/lib/umami";
import * as helpscout from "@/lib/helpscout";
import type { Client, ClientService, SiteCheck, RecommendedService } from "@prisma/client";
import type { ContactPermissions } from "@/types";
import type { HelpScoutConversation } from "@/lib/helpscout";

export type DashboardData = {
  client: Client & { services: ClientService[] };
  siteCheck: SiteCheck | null;
  uptime: UptimeResult | null;
  analytics: UmamiStats | null;
  sparkline: UmamiPageviewsEntry[];
  recentTickets: HelpScoutConversation[];
  upsellServices: RecommendedService[];
  permissions: ContactPermissions;
};

export async function getDashboardData(): Promise<
  | { success: true; data: DashboardData }
  | { success: false; error: string }
> {
  try {
    await requireAuth();

    const ctx = await resolveClientContext();
    if (!ctx) {
      return { success: false, error: "No client record found for your account." };
    }

    const { client, permissions, userEmail } = ctx;

    // Fetch site check
    const siteChecks = await prisma.siteCheck.findMany({
      where: { clientId: client.id },
      orderBy: { checkedAt: "desc" },
      take: 1,
    });
    const siteCheck = siteChecks[0] ?? null;

    // Fetch live data in parallel
    const [uptime, analytics, sparkline, recentTickets] = await Promise.all([
      permissions.uptime && client.uptimeKumaMonitorId
        ? fetchUptimeStatus(client.uptimeKumaMonitorId)
        : null,
      permissions.analytics && client.umamiSiteId
        ? fetchUmamiStats(client.umamiSiteId, "30d")
        : null,
      permissions.analytics && client.umamiSiteId
        ? fetchUmamiPageviews(client.umamiSiteId, "30d")
        : Promise.resolve([]),
      permissions.support && helpscout.isConfigured()
        ? helpscout.getConversationsByEmail(userEmail).then((convos) => {
            const emailLower = userEmail.toLowerCase();
            return (convos ?? [])
              .filter((c) => {
                const custEmail = (c.primaryCustomer?.email ?? c.customer?.email ?? "").toLowerCase();
                return custEmail === emailLower;
              })
              .slice(0, 5);
          })
        : Promise.resolve([]),
    ]);

    // Upsell: active recommended services the client doesn't already have
    const clientServiceTypes = client.services.map((s) => s.type);
    const upsellServices = await prisma.recommendedService.findMany({
      where: {
        isActive: true,
        type: { notIn: clientServiceTypes },
      },
      include: {
        form: {
          select: { id: true, name: true, fields: true, settings: true, isActive: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return {
      success: true,
      data: {
        client,
        siteCheck,
        uptime,
        analytics,
        sparkline: sparkline ?? [],
        recentTickets: recentTickets ?? [],
        upsellServices,
        permissions,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load dashboard",
    };
  }
}
