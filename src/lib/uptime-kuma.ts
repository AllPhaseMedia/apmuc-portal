import "server-only";

const KUMA_PROXY_URL = process.env.KUMA_PROXY_URL;
const KUMA_PROXY_API_KEY = process.env.KUMA_PROXY_API_KEY;

export type UptimeResult = {
  status: "up" | "down" | "pending" | "unknown";
  uptime24h: number | null;
  uptime30d: number | null;
  responseTime: number | null;
  lastCheck: string | null;
};

function isConfigured(): boolean {
  return !!(KUMA_PROXY_URL && KUMA_PROXY_API_KEY);
}

export async function fetchUptimeStatus(
  monitorId: string
): Promise<UptimeResult | null> {
  if (!isConfigured()) return null;

  try {
    const res = await fetch(
      `${KUMA_PROXY_URL}/status?monitorId=${encodeURIComponent(monitorId)}`,
      {
        headers: { Authorization: `Bearer ${KUMA_PROXY_API_KEY}` },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) {
      console.error(`Uptime Kuma proxy returned ${res.status}`);
      return null;
    }

    return (await res.json()) as UptimeResult;
  } catch (error) {
    console.error("Uptime Kuma fetch failed:", error);
    return null;
  }
}
