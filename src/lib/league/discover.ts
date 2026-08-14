import "server-only";
import { getLeague, getUser, getUserLeagues } from "@/lib/sleeper/client";
import { profileFromSleeper } from "./detect";
import { MANUAL_LEAGUES, isManualLeagueId } from "./manual";
import type { LeagueProfile } from "./types";

/**
 * The NFL season a date belongs to. Seasons are named for the year they start,
 * and Sleeper rolls a league to the new season in the spring, so anything from
 * March onward belongs to that calendar year.
 */
export function currentSeason(now: Date = new Date()): string {
  const year = now.getFullYear();
  return String(now.getMonth() >= 2 ? year : year - 1);
}

export class MissingUsernameError extends Error {
  constructor() {
    super("Missing SLEEPER_USERNAME in .env.local");
    this.name = "MissingUsernameError";
  }
}

/**
 * Every league on the configured Sleeper account for a season, plus any
 * manually declared leagues. Sorted dynasty first, then redraft, then
 * guillotine, so the switcher order is stable across refreshes.
 */
export async function getMyLeagues(
  season: string = currentSeason(),
): Promise<LeagueProfile[]> {
  const username = process.env.SLEEPER_USERNAME;
  if (!username) throw new MissingUsernameError();

  const user = await getUser(username);
  const leagues = await getUserLeagues(user.user_id, season);

  const profiles = leagues.map(profileFromSleeper);
  const manual = MANUAL_LEAGUES.filter((l) => l.season === season);

  return [...profiles, ...manual].sort(byTypeThenName);
}

const TYPE_ORDER = { dynasty: 0, redraft: 1, guillotine: 2 } as const;

function byTypeThenName(a: LeagueProfile, b: LeagueProfile): number {
  const t = TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
  return t !== 0 ? t : a.name.localeCompare(b.name);
}

/**
 * One league by id. Returns null when the id is unknown, so callers can decide
 * between notFound() and a fallback.
 *
 * This reads the league directly rather than filtering getMyLeagues, so a
 * league page works even if the user-leagues lookup is cold or failing.
 */
export async function resolveLeague(
  leagueId: string,
): Promise<LeagueProfile | null> {
  if (isManualLeagueId(leagueId)) {
    return MANUAL_LEAGUES.find((l) => l.id === leagueId) ?? null;
  }

  try {
    const league = await getLeague(leagueId);
    // Sleeper answers 200 with null for ids that don't exist.
    if (!league?.league_id) return null;
    return profileFromSleeper(league);
  } catch {
    return null;
  }
}

/**
 * The league to land on when none is specified. Prefers SLEEPER_LEAGUE_ID,
 * which is retained purely as the redirect target for the old /dynasty URLs,
 * then falls back to the first discovered league.
 */
export async function defaultLeagueId(): Promise<string | null> {
  const configured = process.env.SLEEPER_LEAGUE_ID;
  if (configured) return configured;

  try {
    const leagues = await getMyLeagues();
    return leagues[0]?.id ?? null;
  } catch {
    return null;
  }
}
