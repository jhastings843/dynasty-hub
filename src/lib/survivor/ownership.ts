import "server-only";
import { cached } from "@/lib/redis/cached";
import { parseYahoo } from "./yahoo";
import type { Ownership, OwnershipSnapshot } from "./types";

// Yahoo's Survival Football pick distribution is public and unauthenticated,
// and carries every team for every week of the season in one response.
//
// Yahoo's millions of free entries are not this pool's 500, but a 500-entry
// field tracks public behaviour closely enough to be the best available prior,
// and it is the only free source that publishes real submitted picks rather
// than a model's forecast of them. Override it on the page when the pool shows
// its own distribution.
const YAHOO_URL =
  "https://football.fantasysports.yahoo.com/survival/pickdistribution/";

async function fetchYahoo(): Promise<Record<string, Ownership>> {
  const res = await fetch(YAHOO_URL, {
    cache: "no-store",
    headers: {
      // Yahoo serves a stub to unrecognised clients.
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`Yahoo pick distribution: ${res.status}`);
  const byWeek = parseYahoo(await res.text());
  return Object.fromEntries([...byWeek].map(([w, p]) => [String(w), p]));
}

/**
 * Public pick percentages for the week. Cached 15 minutes: the distribution
 * moves all week as entries lock in, and the last read before kickoff is the
 * one that matters.
 */
export async function getOwnership(week: number): Promise<OwnershipSnapshot> {
  const all = await cached("survivor:yahoo:v1", 60 * 15, fetchYahoo).catch(
    () => ({}) as Record<string, Ownership>,
  );
  return {
    week,
    source: "yahoo",
    picks: all[String(week)] ?? {},
    pulledAt: new Date().toISOString(),
  };
}

export { normalizeOwnership, ownershipCoverage, canonYahoo, parseYahoo } from "./yahoo";
