"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function getAdminOverview() {
  try {
    await requireStaff();

    const [totalClients, activeClients, totalArticles, publishedArticles] =
      await Promise.all([
        prisma.client.count(),
        prisma.client.count({ where: { isActive: true } }),
        prisma.kBArticle.count(),
        prisma.kBArticle.count({ where: { status: "PUBLISHED" } }),
      ]);

    return {
      success: true as const,
      data: {
        totalClients,
        activeClients,
        totalArticles,
        publishedArticles,
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch overview",
    };
  }
}
