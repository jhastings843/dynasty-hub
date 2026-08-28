import type { SleeperLeague } from "@/lib/sleeper/types";
import type { LeagueProfile, LeagueStatus, LeagueType } from "./types";

// Sleeper encodes format in settings.type. Verified against both 2026 leagues
// on this account: "Dah Dynasty League" is 2, "2026 Half PPR" is 0.
const SLEEPER_TYPE: Record<number, LeagueType> = {
  0: "redraft",
  1: "dynasty", // keeper: strategy is far closer to dynasty than to redraft
  2: "dynasty",
};

// Sleeper has no guillotine format, so a league run as one is some other format
// with house rules and the name is the only signal. "Chopped" is here because
// Jack's is called "Dah Chopped League" with an axe, and matching only the word
// "guillotine" meant his real guillotine league was read as dynasty for weeks.
// The axe itself counts: people name these leagues by the joke, not the format.
const GUILLOTINE_NAME = /guillotin|chopped|\u{1FA93}/iu;

export function detectLeagueType(league: SleeperLeague): LeagueType {
  if (GUILLOTINE_NAME.test(league.name)) return "guillotine";

  const raw = league.settings?.type;
  if (typeof raw === "number" && raw in SLEEPER_TYPE) return SLEEPER_TYPE[raw];

  // Unknown type code. This used to default to dynasty on the reasoning that it
  // shows more tools, so nothing is hidden. That was backwards: showing dynasty
  // tools in a league with no dynasty is showing tools that are WRONG, and an
  // offer to trade a rookie pick that cannot exist is worse than a missing tab.
  // Redraft is the smaller claim, and typeConfident marks it as a guess.
  return "redraft";
}

/** Did Sleeper actually tell us the format, or did we infer it? */
export function typeIsCertain(league: SleeperLeague): boolean {
  if (GUILLOTINE_NAME.test(league.name)) return true;
  const raw = league.settings?.type;
  return typeof raw === "number" && raw in SLEEPER_TYPE;
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
    // Six is Sleeper's default and the assumption behind most ranking lists, so
    // it is the right fallback when the field is missing.
    passTd: league.scoring_settings?.pass_td ?? 6,
    // Only the bonuses the league actually pays. Sleeper returns the whole
    // catalogue with zeros in it, and a list of twenty-two bonuses worth
    // nothing is noise dressed as detail.
    bonuses: Object.fromEntries(
      Object.entries(league.scoring_settings ?? {})
        .filter(([k, v]) => k.startsWith("bonus") && typeof v === "number" && v !== 0),
    ) as Record<string, number>,
    rosterPositions,
    status: normalizeStatus(league.status),
    source: "sleeper",
    draftId: league.draft_id ?? null,
    faab: typeof league.settings?.waiver_budget === "number" ? league.settings.waiver_budget : null,
    // Sleeper uses 99 to mean "no deadline", which is a week number that will
    // never arrive rather than a real one. Stored as null so nothing has to
    // remember that trick downstream.
    tradeDeadlineWeek:
      typeof league.settings?.trade_deadline === "number" && league.settings.trade_deadline < 99
        ? league.settings.trade_deadline
        : null,
    typeConfident: typeIsCertain(league),
  };
}
