import "server-only";

const BASE_URL = process.env.UMAMI_BASE_URL;
const API_TOKEN = process.env.UMAMI_API_TOKEN;

export type UmamiStats = {
  visitors: number;
  visits: number;
  pageviews: number;
  bounceRate: number;
  totalTime: number;
  change: {
    visitors: number | null;
    visits: number | null;
    pageviews: number | null;
    bounceRate: number | null;
    totalTime: number | null;
  };
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

    // Umami v2 returns flat numbers; v1 used { value: N } objects
    const visitors = data.visitors?.value ?? data.visitors ?? data.uniques?.value ?? 0;
    const visits = data.visits?.value ?? data.visits ?? 0;
    const pageviews = data.pageviews?.value ?? data.pageviews ?? 0;
    const bounces = data.bounces?.value ?? data.bounces ?? 0;
    const totalTime = data.totaltime?.value ?? data.totaltime ?? 0;

    // Comparison data from previous equivalent period
    const comp = data.comparison ?? {};
    const prevVisitors = comp.visitors ?? 0;
    const prevVisits = comp.visits ?? 0;
    const prevPageviews = comp.pageviews ?? 0;
    const prevBounces = comp.bounces ?? 0;
    const prevTotalTime = comp.totaltime ?? 0;

    const pct = (curr: number, prev: number): number | null => {
      if (prev === 0) return curr > 0 ? 100 : null;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const bounceRate = visitors > 0 ? Math.round((bounces / visitors) * 100) : 0;
    const prevBounceRate = prevVisitors > 0 ? Math.round((prevBounces / prevVisitors) * 100) : 0;

    return {
      visitors,
      visits,
      pageviews,
      bounceRate,
      totalTime,
      change: {
        visitors: pct(visitors, prevVisitors),
        visits: pct(visits, prevVisits),
        pageviews: pct(pageviews, prevPageviews),
        bounceRate: prevVisitors > 0 ? pct(bounceRate, prevBounceRate) : null,
        totalTime: pct(totalTime, prevTotalTime),
      },
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
  period: "24h" | "7d" | "30d" | "90d" = "30d"
): Promise<UmamiPageviewsEntry[]> {
  if (!BASE_URL || !API_TOKEN) return [];

  try {
    const now = Date.now();
    const ms = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 }[period] * 86400000;
    const startAt = now - ms;
    const unit = period === "24h" ? "hour" : "day";

    const params = new URLSearchParams({
      startAt: startAt.toString(),
      endAt: now.toString(),
      unit,
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
  type: "path" | "referrer",
  period: "24h" | "7d" | "30d" | "90d" = "30d",
  limit = 10
): Promise<UmamiMetric[]> {
  if (!BASE_URL || !API_TOKEN) return [];

  try {
    const now = Date.now();
    const ms = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 }[period] * 86400000;
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
