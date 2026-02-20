import "server-only";

const API_KEY = process.env.PAGESPEED_API_KEY;
const BASE_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export type PageSpeedResult = {
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
};

export async function fetchPageSpeedScores(
  url: string
): Promise<PageSpeedResult | null> {
  if (!API_KEY) return null;

  try {
    const params = new URLSearchParams({
      url,
      key: API_KEY,
      category: "PERFORMANCE",
      strategy: "mobile",
    });

    // Fetch all categories in parallel
    const categories = [
      "performance",
      "accessibility",
      "best-practices",
      "seo",
    ] as const;

    const allParams = new URLSearchParams({
      url,
      key: API_KEY,
      strategy: "mobile",
    });
    for (const cat of categories) {
      allParams.append("category", cat.toUpperCase());
    }

    const res = await fetch(`${BASE_URL}?${allParams.toString()}`, {
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.error(`PageSpeed API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    const cats = data.lighthouseResult?.categories;
    if (!cats) return null;

    return {
      performanceScore: Math.round((cats.performance?.score ?? 0) * 100),
      accessibilityScore: Math.round((cats.accessibility?.score ?? 0) * 100),
      bestPracticesScore: Math.round(
        (cats["best-practices"]?.score ?? 0) * 100
      ),
      seoScore: Math.round((cats.seo?.score ?? 0) * 100),
    };
  } catch (error) {
    console.error("PageSpeed fetch failed:", error);
    return null;
  }
}
