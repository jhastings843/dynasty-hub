import type { Game, Ownership } from "./types";

/**
 * Expected fraction of the OTHER entries that survive the week, conditional on
 * team `pick` winning its game.
 *
 * The common shortcut is p / (your team's ownership), which is only correct if
 * the whole field is split between the two sides of your game. On a real slate
 * the entries on other games survive at their own teams' win probabilities, and
 * those survivors dilute the prize just as much:
 *
 *   r_i = q_i                              (entries on your team, survive for sure)
 *       + 0 * q_opp(i)                     (entries on your opponent, all dead)
 *       + sum over other games of q_j * p_j
 */
export function fieldSurvival(
  pick: string,
  games: Game[],
  ownership: Ownership,
): number {
  const game = games.find((g) => g.home === pick || g.away === pick);
  if (!game) return 1;
  const opponent = game.home === pick ? game.away : game.home;

  let r = ownership[pick] ?? 0;
  for (const g of games) {
    for (const [team, prob] of [
      [g.home, g.homeWinProb] as const,
      [g.away, 1 - g.homeWinProb] as const,
    ]) {
      if (team === pick || team === opponent) continue;
      r += (ownership[team] ?? 0) * prob;
    }
  }
  return Math.min(1, Math.max(0, r));
}

/**
 * Equity multiplier: what this pick is worth relative to an equal share of the
 * prize, if the pool paid out to everyone alive after this week.
 *
 *   M_i = p_i * (1 - (1 - r_i)^N) / r_i
 *
 * which is p_i * N * E[1/(K+1)] for K ~ Binomial(N-1, r_i), the finite-pool
 * form. At N = 500 this is effectively p_i / r_i; the correction only bites in
 * small pools or when r_i is tiny. 1.0 means the pick neither gains nor loses
 * ground on the field.
 */
export function equityMultiplier(
  winProb: number,
  fieldSurvivalRate: number,
  entriesAlive: number,
): number {
  const n = Math.max(1, entriesAlive);
  const r = fieldSurvivalRate;
  if (r <= 0) return winProb * n;
  return (winProb * (1 - Math.pow(1 - r, n))) / r;
}

/**
 * The two-choice threshold, kept because it is the one piece of survivor maths
 * that collapses to something you can hold in your head: when the whole field
 * is split across one game, the favourite is the better play exactly when its
 * ownership is below its win probability.
 */
export function isOverOwned(winProb: number, ownership: number): boolean {
  return ownership > winProb;
}
