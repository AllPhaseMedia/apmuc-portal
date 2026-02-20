import "server-only";

const BASE_URL = process.env.UPTIME_KUMA_BASE_URL;
const API_TOKEN = process.env.UPTIME_KUMA_API_TOKEN;

export type UptimeResult = {
  status: "up" | "down" | "pending" | "unknown";
  uptime24h: number | null;
  uptime30d: number | null;
  responseTime: number | null;
  lastCheck: string | null;
};

export async function fetchUptimeStatus(
  monitorId: string
): Promise<UptimeResult | null> {
  if (!BASE_URL || !API_TOKEN) return null;

  try {
    // Uptime Kuma API v1 - get monitor status
    const res = await fetch(
      `${BASE_URL}/api/status-page/heartbeat/${monitorId}`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      // Try the push monitor status endpoint instead
      const statusRes = await fetch(`${BASE_URL}/api/push/${monitorId}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!statusRes.ok) return null;
    }

    const data = await res.json();

    // Uptime Kuma's API structure varies by version
    // Try to extract common fields
    const heartbeats = data.heartbeatList?.[monitorId] ?? [];
    const latestBeat = heartbeats[heartbeats.length - 1];

    if (!latestBeat) {
      return {
        status: "unknown",
        uptime24h: null,
        uptime30d: null,
        responseTime: null,
        lastCheck: null,
      };
    }

    const upBeats24h = heartbeats.filter(
      (b: { status: number }) => b.status === 1
    );
    const uptime24h =
      heartbeats.length > 0
        ? Math.round((upBeats24h.length / heartbeats.length) * 10000) / 100
        : null;

    return {
      status: latestBeat.status === 1 ? "up" : "down",
      uptime24h,
      uptime30d: data.uptime?.[monitorId + "_720"] ?? null,
      responseTime: latestBeat.ping ?? null,
      lastCheck: latestBeat.time ?? null,
    };
  } catch (error) {
    console.error("Uptime Kuma fetch failed:", error);
    return null;
  }
}
