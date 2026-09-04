import { NFL_TEAMS, teamByAbbr } from "./teams";
import { normalizeOwnership, ownershipCoverage } from "./yahoo";
import { notesForTeam } from "./intel-pure";
import { equityMultiplier, fieldSurvival } from "./equity";
import { futureCost, planFuture } from "./assignment";
import type {
  Candidate,
  CandidateFlag,
  Game,
  InjuryNote,
  OwnershipSnapshot,
  PoolConfig,
  SurvivorReport,
} from "./types";

export const LAST_WEEK = 18;

/**
 * The week you are picking for: the earliest week that still has a game which
 * has not kicked off. A Thursday game already in progress does not move the
 * pool on to next week, it just takes those two teams off your board.
 */
export function currentWeek(games: Game[], now = new Date()): number {
  const t = now.getTime();
  let earliest = LAST_WEEK;
  let found = false;
  for (const g of games) {
    if (Date.parse(g.kickoff) > t && g.week < earliest) {
      earliest = g.week;
      found = true;
    }
  }
  return found ? earliest : LAST_WEEK;
}

/**
 * A finished game is not a 62% proposition any more. Collapsing completed games
 * to 1 or 0 is what makes the field-survival maths correct on a Sunday night
 * when half the slate is already in the books: entries on a team that already
 * won are certain survivors, and entries on the loser are certainly gone.
 */
export function resolveCompleted(games: Game[]): Game[] {
  return games.map((g) => {
    if (!g.completed || g.homeScore === null || g.awayScore === null) return g;
    if (g.homeScore === g.awayScore) return { ...g, homeWinProb: 0.5 };
    return { ...g, homeWinProb: g.homeScore > g.awayScore ? 1 : 0 };
  });
}

function divisional(a: string, b: string): boolean {
  const ta = teamByAbbr(a);
  const tb = teamByAbbr(b);
  if (!ta || !tb) return false;
  return ta.conference === tb.conference && ta.division === tb.division;
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

function buildFlags(
  c: Omit<Candidate, "flags" | "score">,
  own: InjuryNote[],
  opp: InjuryNote[],
): CandidateFlag[] {
  const flags: CandidateFlag[] = [];

  if (c.ownership >= 0.2) {
    flags.push({
      kind: "chalk",
      severity: c.ownership > c.winProb ? "warn" : "info",
      text:
        c.ownership > c.winProb
          ? `Over-owned. ${pct(c.ownership)} of the field is on a ${pct(c.winProb)} favourite, and ownership above win probability is the textbook fade.`
          : `Heavy chalk at ${pct(c.ownership)}, but still owned below its ${pct(c.winProb)} win probability.`,
    });
  }

  if (c.ownership <= 0.08 && c.winProb >= 0.65) {
    flags.push({
      kind: "leverage",
      severity: "info",
      text: `Leverage. ${pct(c.winProb)} to win with only ${pct(c.ownership)} of the field on it.`,
    });
  }

  if (c.bestFutureWeek !== null && c.bestFutureWinProb !== null) {
    const gain = c.bestFutureWinProb - c.winProb;
    if (gain > 0.05) {
      flags.push({
        kind: "scarcity",
        severity: "warn",
        text: `Worth more later. This team is a ${pct(c.bestFutureWinProb)} favourite in Week ${c.bestFutureWeek}, ${(gain * 100).toFixed(0)} points better than today.`,
      });
    }
  }

  for (const n of own) {
    flags.push({
      kind: "injury",
      severity: n.position === "QB" ? "danger" : "warn",
      text: `${n.player} (${n.position}) ${n.status}. ${n.comment}`.trim(),
    });
  }
  for (const n of opp.slice(0, 1)) {
    flags.push({
      kind: "injury",
      severity: "info",
      text: `${c.opponent} is without ${n.player} (${n.position}), listed ${n.status}.`,
    });
  }

  if (divisional(c.team, c.opponent)) {
    flags.push({
      kind: "trap",
      severity: "warn",
      text: "Divisional game. Familiarity compresses margins regardless of the talent gap.",
    });
  }
  if (!c.home && c.winProb < 0.72) {
    flags.push({
      kind: "trap",
      severity: "warn",
      text: "Road favourite under 72%. The line already prices the travel, so there is no cushion left.",
    });
  }
  if (c.probSource !== "moneyline") {
    flags.push({
      kind: "data",
      severity: "info",
      text:
        c.probSource === "spread"
          ? "No moneyline posted. Win probability is modelled from the spread."
          : "Unpriced game. Win probability is a power-rating estimate, so treat it as soft.",
    });
  }

  return flags;
}

export interface EngineInput {
  season: number;
  games: Game[];
  ownership: OwnershipSnapshot;
  injuries: InjuryNote[];
  pool: PoolConfig;
  now?: Date;
}

/**
 * The whole engine, with every fetch already done. Pure, so it can be run
 * against a real slate in a test rather than only in production on a Sunday.
 */
export function assembleReport(input: EngineInput): SurvivorReport {
  const { season, pool, injuries } = input;
  const now = input.now ?? new Date();
  const games = resolveCompleted(input.games);
  const week = currentWeek(games, now);

  const weekGames = games.filter((g) => g.week === week);
  const openGames = weekGames.filter(
    (g) => Date.parse(g.kickoff) > now.getTime() && !g.completed,
  );

  const teamsPlaying = weekGames.flatMap((g) => [g.home, g.away]);
  const manual = pool.ownershipOverride?.[String(week)];
  const rawPicks = manual
    ? Object.fromEntries(Object.entries(manual).map(([k, v]) => [k, v / 100]))
    : input.ownership.picks;
  const coverage = ownershipCoverage(rawPicks, teamsPlaying);
  const ownership = normalizeOwnership(rawPicks, teamsPlaying);

  const entriesAlive = pool.entriesAlive ?? pool.poolSize;
  const used = new Set(pool.usedTeams);

  // Teams still on the board for the rest of the season, which is what the
  // future-value solver gets to work with.
  const availableTeams = NFL_TEAMS.map((t) => t.abbr).filter((t) => !used.has(t));

  // Future value solves the WHOLE remaining season, not a rolling window.
  // The first live run priced almost every team's future cost at 0.000, and
  // the reason was structural rather than a coding error: over eight weeks you
  // only need eight of thirty-two teams, so pulling any single team out of the
  // pool never changes the optimum and the shadow price is always zero.
  // Weeks 1-18 need eighteen distinct teams, which is a constraint that
  // actually binds. The published preference for an eight-week horizon is
  // preserved by the discount weight instead: at 0.8 per week, week seventeen
  // carries 2% of week one's weight, so distant forecasts fade smoothly rather
  // than falling off a cliff.
  const futureWeeks: number[] = [];
  for (let w = week + 1; w <= LAST_WEEK; w++) futureWeeks.push(w);
  const basePlan = planFuture(futureWeeks, availableTeams, games);

  const candidates: Candidate[] = [];
  for (const g of openGames) {
    for (const [team, opponent, home, winProb] of [
      [g.home, g.away, true, g.homeWinProb] as const,
      [g.away, g.home, false, 1 - g.homeWinProb] as const,
    ]) {
      if (used.has(team)) continue;

      const r = fieldSurvival(team, weekGames, ownership);
      const m = equityMultiplier(winProb, r, entriesAlive);
      const fv = futureCost(team, basePlan.value, futureWeeks, availableTeams, games);
      const inPlan = basePlan.plan.find((p) => p.team === team);

      const partial: Omit<Candidate, "flags" | "score"> = {
        team,
        opponent,
        home,
        week,
        kickoff: g.kickoff,
        winProb,
        probSource: g.probSource,
        spread: home ? g.homeSpread : g.homeSpread === null ? null : -g.homeSpread,
        moneyline: home ? g.homeMoneyline : g.awayMoneyline,
        ownership: ownership[team] ?? 0,
        fieldSurvival: r,
        equityMultiplier: m,
        futureCost: fv,
        bestFutureWeek: inPlan?.week ?? null,
        bestFutureWinProb: inPlan?.winProb ?? null,
      };

      candidates.push({
        ...partial,
        flags: buildFlags(
          partial,
          notesForTeam(injuries, team),
          notesForTeam(injuries, opponent),
        ),
        // The ranking number: the log of the equity this pick gains you this
        // week, minus the log-survival it costs you in the weeks to come.
        score: Math.log(Math.max(m, 1e-9)) - fv,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const best = candidates[0] ?? null;
  const safest = [...candidates].sort((a, b) => b.winProb - a.winProb)[0] ?? null;

  const plan = best
    ? [
        { week, team: best.team, opponent: best.opponent, home: best.home, winProb: best.winProb },
        ...planFuture(
          futureWeeks,
          availableTeams.filter((t) => t !== best.team),
          games,
        ).plan,
      ]
    : basePlan.plan;

  // The solver plans to the end of the season; the page only shows the near
  // weeks, because a Week 16 assignment made in September is a guess, not a plan.
  const shownPlan = plan.slice(0, Math.max(1, pool.horizon));
  const planSurvival = shownPlan.reduce((acc, p) => acc * p.winProb, 1);

  const reasoning: string[] = [];
  if (best) {
    reasoning.push(
      `${best.team} wins ${pct(best.winProb)} of the time, and with ${pct(best.ownership)} of the field on it, ${pct(best.fieldSurvival)} of your rivals survive the week if it holds. That is ${best.equityMultiplier.toFixed(2)}x an even share of the prize.`,
    );
    if (safest && safest.team !== best.team) {
      reasoning.push(
        `${safest.team} is the safest board at ${pct(safest.winProb)}, ${((safest.winProb - best.winProb) * 100).toFixed(1)} points better. The engine passes because ${pct(safest.ownership)} of entries are already there, and surviving alongside most of a ${entriesAlive}-entry field is not progress.`,
      );
    } else if (safest) {
      reasoning.push(
        `It is also the safest board on the slate, so there is no trade-off to make this week.`,
      );
    }
    reasoning.push(
      futureWeeks.length === 0
        ? "Last week of the season, so there is no future value left to protect."
        : best.futureCost > 0.02
          ? `Burning ${best.team} costs ${best.futureCost.toFixed(3)} discounted log-points of survival across the remaining ${futureWeeks.length} weeks. That is already subtracted from its score.`
          : `${best.team} is not load-bearing anywhere in the remaining ${futureWeeks.length} weeks, so spending it now is close to free.`,
    );
  }

  const notes: string[] = [];
  if (best && safest && safest.winProb - best.winProb > 0.08) {
    notes.push(
      `The recommended pick gives up ${((safest.winProb - best.winProb) * 100).toFixed(1)} points of win probability against ${safest.team}. Even in a ${entriesAlive}-entry pool that is a large concession, so take the leverage only if you believe the ownership number.`,
    );
  }

  // One opponent carrying most of the plan is a single point of failure: if
  // that team turns out to be better than the market thinks, every week of the
  // plan degrades at once rather than one week of it.
  const oppCounts = new Map<string, number>();
  for (const p of shownPlan) {
    oppCounts.set(p.opponent, (oppCounts.get(p.opponent) ?? 0) + 1);
  }
  for (const [opp, n] of oppCounts) {
    if (n >= 3) {
      notes.push(
        `The plan beats ${opp} in ${n} of the next ${shownPlan.length} weeks. That is the market's view, not a mistake, but it means one team outperforming its projection degrades the whole path at once. Ration those weeks rather than spending them early.`,
      );
    }
  }

  if (manual) {
    notes.push("Using the pool distribution you pasted in, not Yahoo's national numbers.");
  } else if (coverage < 0.5) {
    notes.push(
      "No usable pick distribution for this week, so the field is being treated as evenly spread. The leverage numbers are not meaningful until it loads, and the ranking is effectively just win probability minus future value.",
    );
  } else if (coverage < 0.9) {
    notes.push(
      `The pick distribution only accounts for ${(coverage * 100).toFixed(0)}% of the field. The rest is spread evenly across the teams nobody listed, so treat the leverage numbers as soft.`,
    );
  } else {
    notes.push(
      `Ownership is Yahoo's national Survival Football distribution, pulled ${new Date(input.ownership.pulledAt).toISOString().slice(0, 16).replace("T", " ")}Z. A ${entriesAlive}-entry pool tracks the public closely; paste your pool's own numbers to override it.`,
    );
  }
  const unpriced = weekGames.filter((g) => g.probSource === "rating").length;
  if (unpriced > 0) notes.push(`${unpriced} game(s) this week have no line posted yet.`);
  const locked = weekGames.length - openGames.length;
  if (locked > 0) notes.push(`${locked} game(s) have already kicked off and are off the board.`);
  if (used.size > 0) notes.push(`${used.size} team(s) burned: ${[...used].sort().join(", ")}.`);

  const locksAt =
    openGames.length > 0
      ? openGames.reduce((a, b) => (a.kickoff < b.kickoff ? a : b)).kickoff
      : null;

  return {
    season,
    week,
    locksAt,
    generatedAt: now.toISOString(),
    pool,
    entriesAlive,
    candidates,
    headline: best
      ? `Week ${week}: ${best.team} over ${best.opponent}`
      : `Week ${week}: nothing legal left on the board`,
    reasoning,
    bestTeam: best?.team ?? null,
    safestTeam: safest?.team ?? null,
    safetyGiveUp: best && safest ? Math.max(0, safest.winProb - best.winProb) : 0,
    plan: shownPlan,
    planSurvival,
    ownership: manual
      ? { ...input.ownership, source: "manual", picks: rawPicks }
      : input.ownership,
    injuries,
    notes,
  };
}
