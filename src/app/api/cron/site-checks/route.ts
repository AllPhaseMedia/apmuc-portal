import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSiteCheck } from "@/lib/site-checks";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await prisma.client.findMany({
    where: { isActive: true, websiteUrl: { not: null } },
    select: { id: true, websiteUrl: true },
  });

  const results: { clientId: string; status: string }[] = [];

  for (const client of clients) {
    if (!client.websiteUrl) continue;

    try {
      const status = await runSiteCheck(client.id, client.websiteUrl);
      results.push({ clientId: client.id, status });
    } catch (error) {
      results.push({
        clientId: client.id,
        status: error instanceof Error ? error.message : "failed",
      });
    }
  }

  return NextResponse.json({
    checked: results.length,
    results,
  });
}
