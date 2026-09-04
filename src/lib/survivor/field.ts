import type { Game, Ownership } from "./types";

/**
 * What the rest of the pool can still do.
 *
 * Once a week is over your pool shows two things: what everyone picked, and
 * which teams they have used. The second is the one that decides late-season
 * weeks, because a team 80% of the field has already burned cannot be picked by
 * them again no matter how big a favourite it is. That is where leverage
 * actually comes from in November.
 *
 * Only the weekly pick distribution has to be logged. Given that plus the game
 * results, which are already on hand, everything else is derivable:
 *
 *   entries surviving week w  =  entries alive  x  (share of the field on teams that won)
 *   entries carrying team i   =  the ones who picked it in a week it won
 *
 * So entries alive stops being a number to maintain by hand and becomes a
 * consequence of the picks.
 */

export interface WeekPicks {
  week: number;
  /** What the pool actually picked that week. Percentages or fractions. */
  picks: Ownership;
}

export interface FieldState {
  /** Entries still alive, derived from the logged weeks. */
  entriesAlive: number;
  /** Alive count entering each logged week, for showing the attrition. */
  attrition: Array<{ week: number; entering: number; survived: number }>;
  /**
   * Fraction of the entries STILL ALIVE that have already burned each team.
   * Sums to the number of weeks logged, since every survivor has used exactly
   * one team per completed week.
   */
  burned: Ownership;
  weeksLogged: number;
  /** Weeks that were logged but could not be scored because results are missing. */
  unscored: number[];
}

/** Normalise a raw paste (percentages or fractions, partial coverage) to sum 1. */
export function normalizePicks(picks: Ownership): Ownership {
  const out: Ownership = {};
  let total = 0;
  for (const [k, v] of Object.entries(picks)) {
    if (typeof v === "number" && v > 0) {
      out[k] = v;
      total += v;
    }
  }
  if (total <= 0) return {};
  for (const k of Object.keys(out)) out[k] /= total;
  return out;
}

/** Teams that advanced in a given week. */
export function winnersOf(
  games: Game[],
  week: number,
  tieAdvances: boolean,
): Set<string> | null {
  const inWeek = games.filter((g) => g.week === week);
  if (inWeek.length === 0) return null;
  const finished = inWeek.filter(
    (g) => g.completed && g.homeScore !== null && g.awayScore !== null,
  );
  // A half-played week cannot settle the field, so refuse rather than guess.
  if (finished.length < inWeek.length) return null;

  const winners = new Set<string>();
  for (const g of finished) {
    if (g.homeScore! > g.awayScore!) winners.add(g.home);
    else if (g.awayScore! > g.homeScore!) winners.add(g.away);
    else if (tieAdvances) {
      winners.add(g.home);
      winners.add(g.away);
    }
  }
  return winners;
}

export function deriveFieldState(
  observations: WeekPicks[],
  games: Game[],
  startingEntries: number,
  tieAdvances = false,
): FieldState {
  let alive = Math.max(1, startingEntries);
  // Head count of currently-alive entries carrying each team, not a fraction,
  // so that a week's eliminations scale it the same way they scale `alive`.
  const carrying: Ownership = {};
  const attrition: FieldState["attrition"] = [];
  const unscored: number[] = [];
  let weeksLogged = 0;

  const ordered = [...observations].sort((a, b) => a.week - b.week);

  for (const obs of ordered) {
    const picks = normalizePicks(obs.picks);
    if (Object.keys(picks).length === 0) continue;

    const winners = winnersOf(games, obs.week, tieAdvances);
    if (!winners) {
      unscored.push(obs.week);
      continue;
    }

    let survivingShare = 0;
    for (const [team, share] of Object.entries(picks)) {
      if (winners.has(team)) survivingShare += share;
    }
    // Everyone busting would end the pool; treat it as unscoreable rather than
    // dividing the season by zero.
    if (survivingShare <= 0) {
      unscored.push(obs.week);
      continue;
    }

    const entering = alive;

    // Entries carrying a team from an earlier week are thinned by this week's
    // eliminations. Which earlier team they hold is very nearly independent of
    // how they fared this week, so they thin at the overall survival rate.
    for (const t of Object.keys(carrying)) carrying[t] *= survivingShare;

    // Entries that picked a winner this week now carry that team too.
    for (const [team, share] of Object.entries(picks)) {
      if (!winners.has(team)) continue;
      carrying[team] = (carrying[team] ?? 0) + entering * share;
    }

    alive = entering * survivingShare;
    weeksLogged++;
    attrition.push({
      week: obs.week,
      entering: Math.round(entering),
      survived: Math.round(alive),
    });
  }

  const burned: Ownership = {};
  for (const [t, n] of Object.entries(carrying)) {
    burned[t] = Math.min(1, n / alive);
  }

  return {
    entriesAlive: Math.max(1, Math.round(alive)),
    attrition,
    burned,
    weeksLogged,
    unscored,
  };
}

/**
 * Fold the field's used teams into a projected ownership distribution.
 *
 * A team 80% of the field has burned can only be picked by the 20% who have it
 * left, so its share is scaled by what remains available and the rest is
 * renormalised across the teams that are actually pickable.
 */
export function applyAvailability(
  picks: Ownership,
  burned: Ownership,
  teams: string[],
): Ownership {
  const out: Ownership = {};
  let total = 0;
  for (const t of teams) {
    const available = 1 - Math.min(1, burned[t] ?? 0);
    const v = (picks[t] ?? 0) * available;
    out[t] = v;
    total += v;
  }
  if (total <= 0) {
    const even = teams.length > 0 ? 1 / teams.length : 0;
    for (const t of teams) out[t] = even;
    return out;
  }
  for (const t of teams) out[t] /= total;
  return out;
}
