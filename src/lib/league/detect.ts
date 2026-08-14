import type { SleeperLeague } from "@/lib/sleeper/types";
import type { LeagueProfile, LeagueStatus, LeagueType } from "./types";

// Sleeper encodes format in settings.type. Verified against both 2026 leagues
// on this account: "Dah Dynasty League" is 2, "2026 Half PPR" is 0.
const SLEEPER_TYPE: Record<number, LeagueType> = {
  0: "redraft",
  1: "dynasty", // keeper: strategy is far closer to dynasty than to redraft
  2: "dynasty",
};

const GUILLOTINE_NAME = /guillotine/i;

export function detectLeagueType(league: SleeperLeague): LeagueType {
  // Sleeper cannot express guillotine, so a league run as one is some other
  // format with house rules. The name is the only signal available.
  if (GUILLOTINE_NAME.test(league.name)) return "guillotine";

  const raw = league.settings?.type;
  if (typeof raw === "number" && raw in SLEEPER_TYPE) return SLEEPER_TYPE[raw];

  // Unknown type code. Dynasty is the safer default here: it shows more tools
  // than redraft does, so nothing is silently hidden.
  return "dynasty";
}

const STATUSES: LeagueStatus[] = [
  "pre_draft",
  "drafting",
  "in_season",
  "complete",
];

function normalizeStatus(status: string | undefined): LeagueStatus {
  return STATUSES.includes(status as LeagueStatus)
    ? (status as LeagueStatus)
    : "in_season";
}

/** Map a raw Sleeper league into the shape the rest of the app consumes. */
export function profileFromSleeper(league: SleeperLeague): LeagueProfile {
  const rosterPositions = league.roster_positions ?? [];
  const qbCount = rosterPositions.filter((p) => p === "QB").length;

  const rec = league.scoring_settings?.rec;
  const ppr: 0 | 0.5 | 1 = rec === 0 ? 0 : rec === 0.5 ? 0.5 : 1;

  return {
    id: league.league_id,
    name: league.name,
    season: league.season,
    type: detectLeagueType(league),
    teams: league.total_rosters ?? 12,
    superflex: rosterPositions.includes("SUPER_FLEX") || qbCount >= 2,
    tePremium: league.scoring_settings?.bonus_rec_te ?? 0,
    ppr,
    rosterPositions,
    status: normalizeStatus(league.status),
    source: "sleeper",
    draftId: league.draft_id ?? null,
  };
}
