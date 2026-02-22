"use server";

import { requireAuth } from "@/lib/auth";
import { resolveClientContext } from "@/lib/client-context";
import {
  fetchUmamiStats,
  fetchUmamiPageviews,
  fetchUmamiMetrics,
  type UmamiStats,
  type UmamiPageviewsEntry,
  type UmamiMetric,
} from "@/lib/umami";

export type AnalyticsData = {
  stats: UmamiStats | null;
  pageviews: UmamiPageviewsEntry[];
  topPages: UmamiMetric[];
  topReferrers: UmamiMetric[];
  umamiShareUrl: string | null;
  clientName: string;
};

export async function getAnalyticsData(
  period: "24h" | "7d" | "30d" | "90d" = "30d"
): Promise<
  | { success: true; data: AnalyticsData }
  | { success: false; error: string }
> {
  try {
    await requireAuth();

    const ctx = await resolveClientContext();
    if (!ctx) {
      return { success: false, error: "No client record found for your account." };
    }

    if (!ctx.permissions.analytics) {
      return { success: false, error: "You don't have permission to view analytics." };
    }

    const { client } = ctx;
    if (!client.umamiSiteId) {
      return { success: false, error: "Analytics not configured for this site." };
    }

    const [stats, pageviews, topPages, topReferrers] = await Promise.all([
      fetchUmamiStats(client.umamiSiteId, period),
      fetchUmamiPageviews(client.umamiSiteId, period),
      fetchUmamiMetrics(client.umamiSiteId, "path", period),
      fetchUmamiMetrics(client.umamiSiteId, "referrer", period),
    ]);

    const umamiShareUrl =
      client.umamiShareId && process.env.UMAMI_BASE_URL
        ? `${process.env.UMAMI_BASE_URL}/share/${client.umamiShareId}`
        : null;

    return {
      success: true,
      data: { stats, pageviews, topPages, topReferrers, umamiShareUrl, clientName: client.name },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load analytics",
    };
  }
}
