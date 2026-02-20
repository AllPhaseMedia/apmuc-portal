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
  period: "24h" | "7d" | "30d" = "30d"
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
