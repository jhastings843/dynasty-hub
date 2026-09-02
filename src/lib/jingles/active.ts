import "server-only";
import type { LeagueProfile } from "@/lib/league/types";
import {
  LAB_300,
  LAB_300_POSTED,
  LAB_300_TIERS,
  LAB_300_URL,
  LAB_300_VERSION,
  lab300Tier,
  type Lab300Entry,
} from "./data";
import { readRankings, type StoredEntry } from "./ingest";
import type { Scoring } from "./parse";

// Which of his lists a league should be reading.
//
// This is the reason the ingestion was worth building. He publishes half PPR
// and has said full PPR is coming, and Dah Chopped is a full-PPR league that
// has spent the whole preseason being advised off the half-PPR list. Today the
// draft board apologises for that in a footnote. Once he posts the full-PPR
// list, the right one is simply here and the footnote goes away on its own.
//
// The hand-curated data.ts stays as the floor. If ingestion has never run, or
// the feed is down, or a post failed to parse, the app falls back to the list
// it shipped with rather than to nothing.

export interface LabIndex {
  list: Lab300Entry[];
  byId: Record<string, Lab300Entry>;
  tierFor: (sleeperId: string) => string | null;
  /** Where these rankings came from. */
  source: "ingested" | "curated";
  scoring: Scoring;
  title: string;
  url: string;
  postedAt: string;
  /** False when the only list available is for different scoring than the league. */
  matchesLeagueScoring: boolean;
}

/** The scoring a league's rankings should be drawn from. */
export function scoringForLeague(profile: LeagueProfile): Scoring {
  if (profile.ppr >= 1) return "full_ppr";
  if (profile.ppr === 0) return "standard";
  return "half_ppr";
}

const CURATED_INDEX_BASE = {
  source: "curated" as const,
  // Everything shipped in data.ts is his half-PPR research.
  scoring: "half_ppr" as Scoring,
  title: `The Lab 300 v${LAB_300_VERSION}`,
  url: LAB_300_URL,
  postedAt: LAB_300_POSTED,
};

function curatedIndex(matchesLeagueScoring: boolean): LabIndex {
  return {
    ...CURATED_INDEX_BASE,
    list: LAB_300,
    byId: Object.fromEntries(LAB_300.map((e) => [e.sleeperId, e])),
    tierFor: lab300Tier,
    matchesLeagueScoring,
  };
}

function toEntry(stored: StoredEntry): Lab300Entry {
  // Tier labels are carried as text; map back to an index where the shipped
  // tier table recognises the label, so anything reading tierIndex keeps
  // working. An unrecognised tier is -1 rather than a wrong index.
  const tierIndex = LAB_300_TIERS.findIndex((t) => t.label === stored.tier);
  return {
    rank: stored.rank,
    sleeperId: stored.sleeperId,
    name: stored.name,
    position: stored.position,
    positionRank: stored.positionRank,
    team: stored.team,
    tierIndex,
  };
}

function ingestedIndex(
  stored: NonNullable<Awaited<ReturnType<typeof readRankings>>>,
  matchesLeagueScoring: boolean,
): LabIndex {
  const list = stored.entries.map(toEntry).sort((a, b) => a.rank - b.rank);
  const byId = Object.fromEntries(list.map((e) => [e.sleeperId, e]));
  const tierById = new Map(stored.entries.map((e) => [e.sleeperId, e.tier]));

  return {
    list,
    byId,
    tierFor: (id) => tierById.get(id) ?? null,
    source: "ingested",
    scoring: stored.scoring,
    title: stored.title,
    url: stored.url,
    postedAt: stored.postedAt,
    matchesLeagueScoring,
  };
}

/**
 * The best available rankings for this league.
 *
 * Prefers a list matching the league's own scoring. Falls back to half PPR,
 * because a half-PPR list in a full-PPR league is off in a direction the board
 * already names, and that is a great deal better than no ranking at all.
 */
export async function activeLab(profile: LeagueProfile): Promise<LabIndex> {
  const wanted = scoringForLeague(profile);

  const exact = await readRankings(wanted);
  if (exact && exact.entries.length > 0) return ingestedIndex(exact, true);

  if (wanted !== "half_ppr") {
    const half = await readRankings("half_ppr");
    if (half && half.entries.length > 0) return ingestedIndex(half, false);
  }

  return curatedIndex(wanted === "half_ppr");
}
