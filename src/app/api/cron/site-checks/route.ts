import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchPageSpeedScores } from "@/lib/pagespeed";
import { checkSSL } from "@/lib/ssl-check";
import { lookupDomain } from "@/lib/whois";

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
      let hostname: string;
      try {
        hostname = new URL(client.websiteUrl).hostname;
      } catch {
        results.push({ clientId: client.id, status: "invalid_url" });
        continue;
      }

      // Run PageSpeed, SSL, and WHOIS checks in parallel
      const [pagespeed, ssl, domain] = await Promise.all([
        fetchPageSpeedScores(client.websiteUrl),
        checkSSL(hostname),
        lookupDomain(hostname),
      ]);

      await prisma.siteCheck.create({
        data: {
          clientId: client.id,
          url: client.websiteUrl,
          performanceScore: pagespeed?.performanceScore ?? null,
          accessibilityScore: pagespeed?.accessibilityScore ?? null,
          bestPracticesScore: pagespeed?.bestPracticesScore ?? null,
          seoScore: pagespeed?.seoScore ?? null,
          sslValid: ssl.valid,
          sslIssuer: ssl.issuer,
          sslExpiresAt: ssl.expiresAt,
          domainRegistrar: domain.registrar,
          domainExpiresAt: domain.expiresAt,
        },
      });

      results.push({ clientId: client.id, status: "ok" });
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
