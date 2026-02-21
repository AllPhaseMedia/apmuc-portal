"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { resolveClientContext } from "@/lib/client-context";
import { fetchUptimeStatus, type UptimeResult } from "@/lib/uptime-kuma";
import { fetchUmamiStats, type UmamiStats } from "@/lib/umami";
import type { Client, ClientService, SiteCheck, RecommendedService } from "@prisma/client";
import type { ContactPermissions } from "@/types";

export type DashboardData = {
  client: Client & { services: ClientService[] };
  siteCheck: SiteCheck | null;
  uptime: UptimeResult | null;
  analytics: UmamiStats | null;
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

    const { client, permissions } = ctx;

    // Fetch site check
    const siteChecks = await prisma.siteCheck.findMany({
      where: { clientId: client.id },
      orderBy: { checkedAt: "desc" },
      take: 1,
    });
    const siteCheck = siteChecks[0] ?? null;

    // Fetch live data in parallel — only if permissions allow
    const [uptime, analytics] = await Promise.all([
      permissions.uptime && client.uptimeKumaMonitorId
        ? fetchUptimeStatus(client.uptimeKumaMonitorId)
        : null,
      permissions.analytics && client.umamiSiteId
        ? fetchUmamiStats(client.umamiSiteId, "30d")
        : null,
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
      data: { client, siteCheck, uptime, analytics, upsellServices, permissions },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load dashboard",
    };
  }
}
