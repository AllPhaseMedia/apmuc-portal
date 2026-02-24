"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { resolveClientContext } from "@/lib/client-context";
import { fetchUptimeStatus, type UptimeResult } from "@/lib/uptime-kuma";
import { fetchUmamiStats, fetchUmamiPageviews, type UmamiStats, type UmamiPageviewsEntry } from "@/lib/umami";
import * as helpscout from "@/lib/helpscout";
import type { Client, ClientService, SiteCheck, RecommendedService, Form } from "@prisma/client";
import type { ContactPermissions } from "@/types";
import type { HelpScoutConversation } from "@/lib/helpscout";

// ── Fast context (DB only, renders immediately) ─────────────

type UpsellService = RecommendedService & {
  form: Pick<Form, "id" | "name" | "fields" | "settings" | "isActive"> | null;
};

export type DashboardContext = {
  client: Client & { services: ClientService[] };
  siteCheck: SiteCheck | null;
  upsellServices: UpsellService[];
  permissions: ContactPermissions;
  userEmail: string;
};

export async function getDashboardContext(): Promise<
  | { success: true; data: DashboardContext }
  | { success: false; error: string }
> {
  try {
    await requireAuth();

    const ctx = await resolveClientContext();
    if (!ctx) {
      return { success: false, error: "No client record found for your account." };
    }

    const { client, permissions, userEmail } = ctx;

    const [siteChecks, upsellServices] = await Promise.all([
      prisma.siteCheck.findMany({
        where: { clientId: client.id },
        orderBy: { checkedAt: "desc" },
        take: 1,
      }),
      prisma.recommendedService.findMany({
        where: {
          isActive: true,
          type: { notIn: client.services.map((s) => s.type) },
        },
        include: {
          form: {
            select: { id: true, name: true, fields: true, settings: true, isActive: true },
          },
        },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return {
      success: true,
      data: {
        client,
        siteCheck: siteChecks[0] ?? null,
        upsellServices,
        permissions,
        userEmail,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load dashboard",
    };
  }
}

// ── Slow fetchers (external APIs, streamed via Suspense) ────

export async function fetchDashboardAnalytics(
  siteId: string
): Promise<{ stats: UmamiStats | null; sparkline: UmamiPageviewsEntry[] }> {
  const [stats, sparkline] = await Promise.all([
    fetchUmamiStats(siteId, "30d"),
    fetchUmamiPageviews(siteId, "30d"),
  ]);
  return { stats, sparkline: sparkline ?? [] };
}

export async function fetchDashboardUptime(
  monitorId: string
): Promise<UptimeResult | null> {
  return fetchUptimeStatus(monitorId);
}

export async function fetchDashboardTickets(
  email: string
): Promise<HelpScoutConversation[]> {
  if (!helpscout.isConfigured()) return [];
  const convos = await helpscout.getConversationsByEmail(email);
  const emailLower = email.toLowerCase();
  return (convos ?? [])
    .filter((c) => {
      const custEmail = (c.primaryCustomer?.email ?? c.customer?.email ?? "").toLowerCase();
      return custEmail === emailLower;
    })
    .slice(0, 5);
}

// ── Legacy combined fetch (kept for backward compat) ────────

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
