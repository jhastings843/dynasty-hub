import "server-only";
import { getSeasonGames } from "./odds";
import { getPublicPicks } from "./ownership";
import { getInjuries } from "./intel";
import { getPool } from "./state";
import { assembleReport } from "./engine";
import type { PoolConfig, SurvivorReport } from "./types";

export const SEASON = 2026;

/**
 * One report object feeds the page and the API so the two cannot drift. All
 * this does is fetch; every decision lives in engine.ts, which is pure and
 * therefore testable against a real slate.
 */
export async function buildReport(
  overrides?: Partial<PoolConfig>,
): Promise<SurvivorReport> {
  const [season, stored, injuries, publicPicks] = await Promise.all([
    getSeasonGames(SEASON),
    getPool(SEASON),
    getInjuries(),
    getPublicPicks(),
  ]);

  return assembleReport({
    season: SEASON,
    games: season.games,
    gamesStale: season.stale,
    gamesAt: season.at,
    publicByWeek: publicPicks.byWeek,
    publicPulledAt: publicPicks.pulledAt,
    publicStale: publicPicks.stale,
    injuries,
    pool: { ...stored, ...overrides },
  });
}

export { currentWeek, resolveCompleted } from "./engine";
