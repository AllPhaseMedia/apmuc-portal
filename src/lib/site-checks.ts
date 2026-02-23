import "server-only";

import { prisma } from "@/lib/prisma";
import { fetchPageSpeedScores } from "@/lib/pagespeed";
import { checkSSL } from "@/lib/ssl-check";
import { lookupDomain } from "@/lib/whois";

/**
 * Run a site check for a single client and store the result.
 * Returns "ok" on success or an error message string.
 */
export async function runSiteCheck(clientId: string, websiteUrl: string): Promise<string> {
  let hostname: string;
  try {
    hostname = new URL(websiteUrl).hostname;
  } catch {
    return "invalid_url";
  }

  const [pagespeed, ssl, domain] = await Promise.all([
    fetchPageSpeedScores(websiteUrl),
    checkSSL(hostname),
    lookupDomain(hostname),
  ]);

  await prisma.siteCheck.create({
    data: {
      clientId,
      url: websiteUrl,
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

  return "ok";
}
