import "server-only";

const BASE_URL = process.env.UMAMI_BASE_URL;
const API_TOKEN = process.env.UMAMI_API_TOKEN;

export type UmamiStats = {
  visitors: number;
  pageviews: number;
  bounceRate: number;
  totalTime: number;
};

export async function fetchUmamiStats(
  siteId: string,
  period: "24h" | "7d" | "30d" | "90d" = "30d"
): Promise<UmamiStats | null> {
  if (!BASE_URL || !API_TOKEN) return null;

  try {
    const now = Date.now();
    let startAt: number;

    switch (period) {
      case "24h":
        startAt = now - 24 * 60 * 60 * 1000;
        break;
      case "7d":
        startAt = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "30d":
        startAt = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "90d":
        startAt = now - 90 * 24 * 60 * 60 * 1000;
        break;
    }

    const params = new URLSearchParams({
      startAt: startAt.toString(),
      endAt: now.toString(),
    });

    const res = await fetch(
      `${BASE_URL}/api/websites/${siteId}/stats?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      console.error(`Umami API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();

    return {
      visitors: data.visitors?.value ?? data.uniques?.value ?? 0,
      pageviews: data.pageviews?.value ?? 0,
      bounceRate: data.bounces?.value
        ? Math.round(
            (data.bounces.value / (data.visitors?.value || 1)) * 100
          )
        : 0,
      totalTime: data.totaltime?.value ?? 0,
    };
  } catch (error) {
    console.error("Umami fetch failed:", error);
    return null;
  }
}

export type UmamiPageviewsEntry = {
  date: string;
  visitors: number;
  pageviews: number;
};

export async function fetchUmamiPageviews(
  siteId: string,
  period: "7d" | "30d" | "90d" = "30d"
): Promise<UmamiPageviewsEntry[]> {
  if (!BASE_URL || !API_TOKEN) return [];

  try {
    const now = Date.now();
    const ms = { "7d": 7, "30d": 30, "90d": 90 }[period] * 86400000;
    const startAt = now - ms;

    const params = new URLSearchParams({
      startAt: startAt.toString(),
      endAt: now.toString(),
      unit: "day",
      timezone: "America/New_York",
    });

    const res = await fetch(
      `${BASE_URL}/api/websites/${siteId}/pageviews?${params}`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const pageviews = data.pageviews ?? [];
    const sessions = data.sessions ?? [];

    return pageviews.map((p: { x: string; y: number }, i: number) => ({
      date: p.x,
      pageviews: p.y,
      visitors: sessions[i]?.y ?? 0,
    }));
  } catch (error) {
    console.error("Umami pageviews fetch failed:", error);
    return [];
  }
}

export type UmamiMetric = {
  name: string;
  value: number;
};

export async function fetchUmamiMetrics(
  siteId: string,
  type: "url" | "referrer",
  period: "7d" | "30d" | "90d" = "30d",
  limit = 10
): Promise<UmamiMetric[]> {
  if (!BASE_URL || !API_TOKEN) return [];

  try {
    const now = Date.now();
    const ms = { "7d": 7, "30d": 30, "90d": 90 }[period] * 86400000;
    const startAt = now - ms;

    const params = new URLSearchParams({
      startAt: startAt.toString(),
      endAt: now.toString(),
      type,
      limit: limit.toString(),
    });

    const res = await fetch(
      `${BASE_URL}/api/websites/${siteId}/metrics?${params}`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    return (data ?? []).map((d: { x: string; y: number }) => ({
      name: d.x,
      value: d.y,
    }));
  } catch (error) {
    console.error(`Umami ${type} metrics fetch failed:`, error);
    return [];
  }
}
