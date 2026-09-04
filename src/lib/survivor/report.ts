import "server-only";
import { getSeasonGames } from "./odds";
import { getOwnership } from "./ownership";
import { getInjuries } from "./intel";
import { getPool } from "./state";
import { assembleReport, currentWeek, resolveCompleted } from "./engine";
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
  const [games, stored, injuries] = await Promise.all([
    getSeasonGames(SEASON),
    getPool(SEASON),
    getInjuries(),
  ]);

  const week = currentWeek(resolveCompleted(games));
  const ownership = await getOwnership(week);

  return assembleReport({
    season: SEASON,
    games,
    ownership,
    injuries,
    pool: { ...stored, ...overrides },
  });
}

export { currentWeek, resolveCompleted } from "./engine";
