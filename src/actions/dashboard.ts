"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { fetchUptimeStatus, type UptimeResult } from "@/lib/uptime-kuma";
import { fetchUmamiStats, type UmamiStats } from "@/lib/umami";
import type { Client, ClientService, SiteCheck, RecommendedService } from "@prisma/client";

export type DashboardData = {
  client: Client & { services: ClientService[] };
  siteCheck: SiteCheck | null;
  uptime: UptimeResult | null;
  analytics: UmamiStats | null;
  upsellServices: RecommendedService[];
};

export async function getDashboardData(): Promise<
  | { success: true; data: DashboardData }
  | { success: false; error: string }
> {
  try {
    const user = await requireAuth();

    let client = await prisma.client.findFirst({
      where: { clerkUserId: user.clerkUserId },
      include: {
        services: true,
        siteChecks: { orderBy: { checkedAt: "desc" }, take: 1 },
      },
    });

    // Fallback: match by email and link the Clerk user ID
    if (!client) {
      client = await prisma.client.findFirst({
        where: { email: user.email, clerkUserId: null },
        include: {
          services: true,
          siteChecks: { orderBy: { checkedAt: "desc" }, take: 1 },
        },
      });

      if (client) {
        await prisma.client.update({
          where: { id: client.id },
          data: { clerkUserId: user.clerkUserId },
        });
      }
    }

    if (!client) {
      return { success: false, error: "No client record found for your account." };
    }

    const siteCheck = client.siteChecks[0] ?? null;

    // Fetch live data in parallel (uptime + analytics)
    const [uptime, analytics] = await Promise.all([
      client.uptimeKumaMonitorId
        ? fetchUptimeStatus(client.uptimeKumaMonitorId)
        : null,
      client.umamiSiteId ? fetchUmamiStats(client.umamiSiteId, "30d") : null,
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
      data: { client, siteCheck, uptime, analytics, upsellServices },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load dashboard",
    };
  }
}
