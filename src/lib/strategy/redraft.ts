import type { AutoGoal, StrategyContext } from "./types";

// Redraft strategy.
//
// One season, no future. Draft capital and youth are worth nothing on
// 2026-12-31, so every decision is judged against a single question: does this
// improve my odds of making and then winning the playoffs this year.
//
// The rules below are computed from the league's own standings rather than
// asserted, so they stay honest as the season moves.

export function redraftGoals(ctx: StrategyContext, now: Date = new Date()): AutoGoal[] {
  const goals: AutoGoal[] = [];
  const {
    profile,
    myTeam,
    totalTeams,
    record,
    standingRank,
    weakestPositions,
    strongestPositions,
    week,
    faabRemaining,
    faabBudget,
    draftSlot,
    draftRounds,
    playoffTeams,
    regularSeasonWeeks,
  } = ctx;

  const playoffSpots = playoffTeams;
  const played = record.wins + record.losses + record.ties;
  const remaining = Math.max(0, regularSeasonWeeks - played);

  // --- Pre-draft ---
  if (profile.status === "pre_draft") {
    goals.push({
      id: "draft_prep",
      text: draftSlot
        ? `Build a board for pick ${draftSlot} of ${totalTeams} across ${draftRounds} rounds`
        : `Build a board for ${draftRounds} rounds before the draft`,
      category: "draft",
      target: "board ready",
      status: "todo",
    });
    goals.push({
      id: "draft_starters_first",
      text: "Fill every starting slot before taking upside swings. Bench picks cannot score",
      category: "draft",
      status: "todo",
    });
    goals.push({
      id: "draft_bye_spread",
      text: "Spread byes across your starters, especially at RB and WR",
      category: "draft",
      status: "todo",
    });
    goals.push({
      id: "draft_no_dynasty_logic",
      text: "Ignore age and draft capital. A 30-year-old who produces this year beats a rookie who might produce in 2028",
      category: "draft",
      status: "todo",
    });
    return goals;
  }

  // --- In season ---
  goals.push({
    id: "playoffs",
    text: `Make the playoffs (top ${playoffSpots} of ${totalTeams})`,
    category: "standings",
    current: `#${standingRank}, ${recordLabel(record)}`,
    target: `top ${playoffSpots}`,
    status:
      standingRank <= playoffSpots
        ? played >= regularSeasonWeeks
          ? "done"
          : "in_progress"
        : "todo",
  });

  // Points scored is a better forward signal than record. A team losing with
  // strong scoring is usually fine; a team winning on weak scoring is not.
  if (played > 0) {
    const ppg = record.pointsFor / played;
    const oppPpg = record.pointsAgainst / played;
    const unlucky = record.pointsFor > record.pointsAgainst && record.losses > record.wins;
    const lucky = record.pointsFor < record.pointsAgainst && record.wins > record.losses;

    if (unlucky) {
      goals.push({
        id: "unlucky",
        text: "Your scoring is better than your record. Hold the roster together rather than overreacting to losses",
        category: "standings",
        current: `${ppg.toFixed(1)} for vs ${oppPpg.toFixed(1)} against`,
        status: "todo",
      });
    } else if (lucky) {
      goals.push({
        id: "lucky",
        text: "Your record is ahead of your scoring. Upgrade a starting slot now rather than trusting the wins",
        category: "roster",
        current: `${ppg.toFixed(1)} for vs ${oppPpg.toFixed(1)} against`,
        status: "todo",
      });
    }
  }

  // --- Trade posture, driven by playoff position ---
  const inHunt = standingRank <= playoffSpots;
  const mathematicallyAlive = remaining > 0 && standingRank <= playoffSpots + 2;

  if (inHunt) {
    goals.push({
      id: "buy_for_run",
      text: weakestPositions.length
        ? `Trade bench depth for a starting ${weakestPositions[0]} upgrade before the deadline`
        : "Trade bench depth for a starting upgrade before the deadline",
      category: "trade",
      current: weakestPositions.length
        ? `${weakestPositions[0]} ranks #${myTeam.positionRanks[weakestPositions[0]] ?? "?"} of ${totalTeams}`
        : undefined,
      status: "todo",
    });
  } else if (mathematicallyAlive) {
    goals.push({
      id: "one_swing",
      text: "You are outside the cut but alive. Make one consolidating trade, two starters for one better starter",
      category: "trade",
      current: `#${standingRank} of ${totalTeams}, ${remaining} weeks left`,
      status: "todo",
    });
  } else {
    goals.push({
      id: "play_spoiler",
      text: "Playoffs are out of reach. Nothing carries over, so stream freely and take variance",
      category: "trade",
      current: `#${standingRank} of ${totalTeams}`,
      status: "todo",
    });
  }

  if (strongestPositions.length > 0) {
    const pos = strongestPositions[0];
    goals.push({
      id: "sell_surplus",
      text: `Turn your ${pos} surplus into a starter at a position of need. Depth on the bench scores nothing`,
      category: "trade",
      current: `${pos} ranks #${myTeam.positionRanks[pos] ?? "?"} of ${totalTeams}`,
      status: "todo",
    });
  }

  // --- Waivers ---
  if (faabBudget && faabBudget > 0 && faabRemaining != null) {
    const pct = faabRemaining / faabBudget;
    // Unlike guillotine, redraft FAAB should be largely spent by the playoffs:
    // there is no endgame market to save for.
    const target = played >= regularSeasonWeeks - 3 ? 0.1 : 0.35;
    goals.push({
      id: "faab_deploy",
      text:
        played >= regularSeasonWeeks - 3
          ? "Spend down FAAB. Unspent budget is worth nothing once the playoffs start"
          : "Keep FAAB in reserve for an injury replacement, but do not sit on all of it",
      category: "waivers",
      current: `${Math.round(pct * 100)}% left (${faabRemaining} of ${faabBudget})`,
      target: `about ${Math.round(target * 100)}%`,
      status: "todo",
    });
  }

  // --- Byes and lineup ---
  if (week != null && week >= 4 && week <= regularSeasonWeeks) {
    goals.push({
      id: "bye_coverage",
      text: "Check the next two weeks of byes and cover any starting slot that goes empty",
      category: "roster",
      current: `week ${week}`,
      status: "todo",
    });
  }

  if (profile.rosterPositions.includes("DEF")) {
    goals.push({
      id: "stream_def",
      text: "Stream DEF on matchup rather than holding one all year",
      category: "roster",
      status: "todo",
    });
  }

  // Playoff weeks are what the roster is actually built for.
  if (played >= regularSeasonWeeks - 4 && inHunt) {
    goals.push({
      id: "playoff_schedule",
      text: `Weight your starters by their week ${regularSeasonWeeks + 1} onward matchups, not season-long averages`,
      category: "roster",
      status: "todo",
    });
  }

  void now;
  return goals;
}

function recordLabel(r: { wins: number; losses: number; ties: number }): string {
  return r.ties > 0 ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`;
}
