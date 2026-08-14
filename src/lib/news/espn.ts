import "server-only";
import { cached } from "@/lib/redis/cached";

// Sleeper's public REST API does not expose the news feed that shows
// up inside the Sleeper mobile app (those endpoints are private). The
// next best free, no-auth alternative is ESPN's site news API, which
// returns recent NFL articles with headline, description, publish time,
// and a web link. We pull the top ~100 articles, cache them, and
// filter per-player by substring matching the player's name.

const ESPN_NEWS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=100";
const NEWS_KEY = "espn:v1:nfl-news:100";
const NEWS_TTL = 15 * 60; // 15 minutes

export interface NewsArticle {
  id: string;
  headline: string;
  description: string;
  publishedAt: string; // ISO
  url: string | null;
  imageUrl: string | null;
  /** Human-readable age, resolved at fetch time. Null when undated. */
  relativeTime?: string | null;
}

interface RawArticle {
  id?: number | string;
  headline?: string;
  description?: string;
  published?: string;
  lastModified?: string;
  links?: {
    web?: { href?: string };
  };
  images?: Array<{ url?: string }>;
}

interface NewsResponse {
  articles?: RawArticle[];
}

function slim(raw: RawArticle): NewsArticle | null {
  const headline = (raw.headline ?? "").trim();
  if (!headline) return null;
  return {
    id: String(raw.id ?? headline),
    headline,
    description: (raw.description ?? "").trim(),
    publishedAt: raw.published ?? raw.lastModified ?? "",
    url: raw.links?.web?.href ?? null,
    imageUrl: raw.images?.[0]?.url ?? null,
  };
}

export function getRecentNFLNews(): Promise<NewsArticle[]> {
  return cached(NEWS_KEY, NEWS_TTL, async () => {
    const res = await fetch(ESPN_NEWS_URL, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`ESPN news fetch failed: ${res.status}`);
    }
    const data = (await res.json()) as NewsResponse;
    const arts = (data.articles ?? [])
      .map(slim)
      .filter((a): a is NewsArticle => a !== null);
    return arts;
  });
}

// Filter the pooled NFL news to articles that mention the player by
// name. Crude substring match, case-insensitive, requires both a first
// initial + last name OR the full name. Last-name-only is rejected
// because of false positives (every "Allen" article would hit Josh
// Allen). Returns up to `limit` ordered by recency.
export async function getPlayerNews(
  fullName: string,
  limit = 3,
): Promise<NewsArticle[]> {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return [];
  const first = parts[0];
  const last = parts[parts.length - 1];
  const full = fullName.toLowerCase();
  const firstInitialLast = `${first[0]}. ${last}`.toLowerCase();
  const lastOnly = last.toLowerCase();

  const all = await getRecentNFLNews().catch(() => [] as NewsArticle[]);
  const matches: Array<{ a: NewsArticle; score: number }> = [];
  for (const a of all) {
    const hay = `${a.headline} ${a.description}`.toLowerCase();
    let score = 0;
    if (hay.includes(full)) score = 3;
    else if (hay.includes(firstInitialLast)) score = 2;
    else if (
      // Require last name AND first name presence (in any order, allowing
      // a middle word between them) to avoid surname collisions.
      hay.includes(lastOnly) &&
      hay.includes(first.toLowerCase())
    )
      score = 1;
    if (score > 0) matches.push({ a, score });
  }

  matches.sort((x, y) => {
    if (x.score !== y.score) return y.score - x.score;
    return (
      new Date(y.a.publishedAt).getTime() -
      new Date(x.a.publishedAt).getTime()
    );
  });

  // Stamp the relative age here rather than in the page. Reading the clock
  // during a component's render is impure; this function is data fetching, so
  // it is the right place to resolve "how long ago".
  const now = Date.now();
  return matches
    .slice(0, limit)
    .map((m) => ({ ...m.a, relativeTime: relativeTime(m.a.publishedAt, now) }));
}

function relativeTime(publishedAt: string, now: number): string | null {
  if (!publishedAt) return null;
  const then = new Date(publishedAt).getTime();
  if (Number.isNaN(then)) return null;

  const ageMs = now - then;
  if (ageMs < 60 * 60 * 1000) {
    return `${Math.max(1, Math.round(ageMs / (60 * 1000)))}m ago`;
  }
  if (ageMs < 24 * 60 * 60 * 1000) {
    return `${Math.round(ageMs / (60 * 60 * 1000))}h ago`;
  }
  if (ageMs < 7 * 24 * 60 * 60 * 1000) {
    return `${Math.round(ageMs / (24 * 60 * 60 * 1000))}d ago`;
  }
  return new Date(publishedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
