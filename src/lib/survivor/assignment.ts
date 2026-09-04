import type { FuturePlan, Game } from "./types";

/** Cost used for a team-week that is illegal: a bye, or a team already burned. */
const BLOCKED = 1e6;

/**
 * Rectangular assignment, minimum cost, via the Hungarian algorithm with
 * potentials (Kuhn-Munkres, shortest augmenting path form). Every ROW is
 * matched to a distinct column, so rows must not outnumber columns.
 *
 * Rows are weeks and columns are teams, which keeps the matrix at 8 x 32 and
 * the run at microseconds even when it is re-solved once per candidate.
 *
 * Returns assignment[row] = column, or -1 when a row could not be matched.
 */
export function hungarian(cost: number[][]): number[] {
  const n = cost.length;
  if (n === 0) return [];
  const m = cost[0].length;
  if (m < n) return new Array<number>(n).fill(-1);

  const INF = Number.POSITIVE_INFINITY;
  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(m + 1).fill(0);
  // p[j] is the row currently matched to column j; 0 means unmatched.
  const p = new Array<number>(m + 1).fill(0);
  const way = new Array<number>(m + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array<number>(m + 1).fill(INF);
    const used = new Array<boolean>(m + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF;
      let j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      if (!Number.isFinite(delta)) break;
      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const out = new Array<number>(n).fill(-1);
  for (let j = 1; j <= m; j++) {
    if (p[j] !== 0) out[p[j] - 1] = j - 1;
  }
  return out;
}

export interface PlanResult {
  /** Weighted sum of log win probability across the planned weeks. Higher is better. */
  value: number;
  /** Unweighted probability of surviving every planned week. */
  survival: number;
  plan: FuturePlan[];
}

/**
 * Weight applied to week k slots ahead. A plan for week 12 is only worth
 * anything in the worlds where you are still alive in week 12, so future weeks
 * are discounted by roughly the per-week survival rate. Without this the solver
 * hoards elite teams for weeks the entry never reaches.
 */
export function horizonWeight(stepsAhead: number, weeklySurvival = 0.8): number {
  return Math.pow(weeklySurvival, stepsAhead);
}

/**
 * Best assignment of available teams to the coming weeks: maximise the
 * (discounted) log probability of surviving the whole path, one team per week,
 * no team twice. Taking logs turns the product of survival probabilities into a
 * sum, which is what makes this a linear assignment problem.
 */
export function planFuture(
  weeks: number[],
  teams: string[],
  games: Game[],
  weeklySurvival = 0.8,
): PlanResult {
  if (weeks.length === 0 || teams.length === 0) {
    return { value: 0, survival: 1, plan: [] };
  }

  // team -> week -> { prob, opponent, home }
  const lookup = new Map<
    string,
    Map<number, { prob: number; opponent: string; home: boolean }>
  >();
  for (const g of games) {
    if (!lookup.has(g.home)) lookup.set(g.home, new Map());
    if (!lookup.has(g.away)) lookup.set(g.away, new Map());
    lookup
      .get(g.home)!
      .set(g.week, { prob: g.homeWinProb, opponent: g.away, home: true });
    lookup
      .get(g.away)!
      .set(g.week, { prob: 1 - g.homeWinProb, opponent: g.home, home: false });
  }

  const sortedWeeks = [...weeks].sort((a, b) => a - b);
  const cost: number[][] = sortedWeeks.map((week, idx) => {
    const w = horizonWeight(idx + 1, weeklySurvival);
    return teams.map((team) => {
      const cell = lookup.get(team)?.get(week);
      if (!cell || cell.prob <= 0.001) return BLOCKED;
      return -w * Math.log(cell.prob);
    });
  });

  const matched = hungarian(cost);

  let value = 0;
  let survival = 1;
  const plan: FuturePlan[] = [];
  for (let i = 0; i < sortedWeeks.length; i++) {
    const col = matched[i];
    if (col < 0) continue;
    const team = teams[col];
    const cell = lookup.get(team)?.get(sortedWeeks[i]);
    if (!cell) continue;
    value -= cost[i][col];
    survival *= cell.prob;
    plan.push({
      week: sortedWeeks[i],
      team,
      opponent: cell.opponent,
      home: cell.home,
      winProb: cell.prob,
    });
  }

  return { value, survival, plan };
}

/**
 * The opportunity cost of burning a team now: how much of the best future plan
 * you give up by taking it off the board. This is the shadow price
 * FV_i = J(S) - J(S \ {i}), and it is never negative, because removing an
 * option cannot improve the optimum.
 */
export function futureCost(
  team: string,
  baseValue: number,
  weeks: number[],
  teams: string[],
  games: Game[],
  weeklySurvival = 0.8,
): number {
  if (weeks.length === 0) return 0;
  const without = teams.filter((t) => t !== team);
  const alt = planFuture(weeks, without, games, weeklySurvival);
  return Math.max(0, baseValue - alt.value);
}
