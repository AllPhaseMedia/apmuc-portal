import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const timings: Record<string, number> = {};
  const errors: Record<string, string> = {};

  // 1. Database (Neon)
  let t = Date.now();
  try {
    await prisma.client.count();
    timings.db = Date.now() - t;
  } catch (e) {
    timings.db = Date.now() - t;
    errors.db = e instanceof Error ? e.message : String(e);
  }

  // 2. Umami
  const umamiBase = process.env.UMAMI_BASE_URL;
  const umamiToken = process.env.UMAMI_API_TOKEN;
  if (umamiBase && umamiToken) {
    t = Date.now();
    try {
      await fetch(`${umamiBase}/api/heartbeat`, {
        headers: { Authorization: `Bearer ${umamiToken}` },
        signal: AbortSignal.timeout(10000),
      });
      timings.umami = Date.now() - t;
    } catch (e) {
      timings.umami = Date.now() - t;
      errors.umami = e instanceof Error ? e.message : String(e);
    }
  }

  // 3. Uptime Kuma proxy
  const kumaUrl = process.env.KUMA_PROXY_URL;
  const kumaKey = process.env.KUMA_PROXY_API_KEY;
  if (kumaUrl && kumaKey) {
    t = Date.now();
    try {
      await fetch(`${kumaUrl}/health`, {
        headers: { Authorization: `Bearer ${kumaKey}` },
        signal: AbortSignal.timeout(10000),
      });
      timings.kuma = Date.now() - t;
    } catch (e) {
      timings.kuma = Date.now() - t;
      errors.kuma = e instanceof Error ? e.message : String(e);
    }
  }

  // 4. Help Scout
  const hsId = process.env.HELPSCOUT_APP_ID;
  const hsSecret = process.env.HELPSCOUT_APP_SECRET;
  if (hsId && hsSecret) {
    t = Date.now();
    try {
      await fetch("https://api.helpscout.net/v2/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "client_credentials", client_id: hsId, client_secret: hsSecret }),
        signal: AbortSignal.timeout(10000),
      });
      timings.helpscout = Date.now() - t;
    } catch (e) {
      timings.helpscout = Date.now() - t;
      errors.helpscout = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    region: process.env.VERCEL_REGION ?? "unknown",
    timings,
    ...(Object.keys(errors).length > 0 && { errors }),
  });
}
