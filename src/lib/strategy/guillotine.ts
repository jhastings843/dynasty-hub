import type { AutoGoal, StrategyContext } from "./types";

// Guillotine strategy.
//
// The format: every week the lowest-scoring team is eliminated and its entire
// roster returns to waivers. FAAB is the only acquisition currency. Last team
// standing wins. The standard is 18 teams chopping one per week
// (guillotineleagues.com); Yahoo public leagues run 14 teams over 13 weeks.
//
// The governing insight is that you are not trying to score the most, you are
// trying not to score the least. A second-place week and a second-to-last week
// are the same result, which makes downside control worth more than upside
// until the field is small.
//
// Sources for the numbers below:
//   Fantasy Life, FAAB management       fantasylife.com/articles/guillotine-leagues
//   RotoWire, how much FAAB to bid      rotowire.com/football/article/...-85174
//   DraftSharks, guillotine strategy    draftsharks.com/kb/best-guillotine-league-strategy
//   Footballguys, guide to guillotine   footballguys.com/article/2023-a-guide-to-guillotine-leagues
//   Fantasy Alarm, 2026 strategy        fantasyalarm.com/articles/nfl/...191513

/**
 * FAAB you should still be holding at the end of each month, as a share of the
 * original budget. Fantasy Life's conservative pacing on a $1,000 budget: $900+
 * after September, $750 after October, ~$250 after November, the rest in
 * December. Less conservative frameworks (Fantasy Alarm, Masters) spend 20-35%
 * in September instead, so treat these as a ceiling on spend, not a floor.
 */
const FAAB_FLOOR_BY_MONTH: { month: number; label: string; keep: number }[] = [
  { month: 8, label: "September", keep: 0.9 },
  { month: 9, label: "October", keep: 0.75 },
  { month: 10, label: "November", keep: 0.25 },
  { month: 11, label: "December", keep: 0 },
];

/** RotoWire: don't put more than 25% of budget on one player in the first half. */
const MAX_SINGLE_BID_FIRST_HALF = 0.25;

/** Fantasy Index: keep ~5% back for bye-week and injury emergencies. */
const EMERGENCY_RESERVE = 0.05;

export function guillotineGoals(ctx: StrategyContext, now: Date = new Date()): AutoGoal[] {
  const goals: AutoGoal[] = [];
  const { totalTeams, faabRemaining, faabBudget, scoringRank, week } = ctx;

  // --- Survival, the only thing that actually matters week to week ---
  const equalRisk = totalTeams > 0 ? 1 / totalTeams : 0;
  goals.push({
    id: "survive_week",
    text: `Finish out of last place. With ${totalTeams} teams alive, an average roster carries about ${(equalRisk * 100).toFixed(1)}% weekly elimination risk`,
    category: "survival",
    current: scoringRank ? `#${scoringRank} of ${totalTeams} this week` : "season not started",
    target: `not last`,
    status:
      scoringRank == null
        ? "todo"
        : scoringRank < totalTeams
          ? "done"
          : "todo",
    sourceNote:
      "Equal-risk baseline. Experts put a functional roster's early-week survival odds above 90%, so ordinary imperfection is not a reason to panic-spend.",
  });

  // Past this point the format flips: it stops being "avoid last" and becomes
  // "outscore the survivors". Early-season rules are actively wrong here.
  const endgame = now.getMonth() === 11 || (week != null && week >= 14);

  // Being near the bottom is the trigger to spend, not the calendar. In the
  // endgame the "hold" half of this no longer applies: see endgame_spend.
  if (scoringRank != null && totalTeams > 0 && !endgame) {
    const bottomThird = scoringRank > (totalTeams * 2) / 3;
    goals.push({
      id: "spend_trigger",
      text: bottomThird
        ? "You are in the danger zone. Spend FAAB now on the weakest starting slot, not on bench depth"
        : "You are clear of the cut line. Hold FAAB and let other teams overpay",
      category: "waivers",
      current: `#${scoringRank} of ${totalTeams}`,
      status: "todo",
      sourceNote:
        "FAAB has no value after elimination, but hoarding while safe is what buys December starters.",
    });
  }

  // --- FAAB pacing ---
  if (faabBudget && faabBudget > 0 && faabRemaining != null) {
    const pct = faabRemaining / faabBudget;
    const pacing = FAAB_FLOOR_BY_MONTH.find((m) => m.month === now.getMonth());

    if (pacing) {
      goals.push({
        id: "faab_pacing",
        text: `Leave ${pacing.label} holding at least ${Math.round(pacing.keep * 100)}% of FAAB`,
        category: "waivers",
        current: `${Math.round(pct * 100)}% left (${faabRemaining} of ${faabBudget})`,
        target: `${Math.round(pacing.keep * 100)}%`,
        status: pct >= pacing.keep ? "done" : "todo",
        sourceNote:
          "Fantasy Life's pacing on a $1,000 budget: $900+ after September, $750 after October, ~$250 after November.",
      });
    }

    const halfway = now.getMonth() <= 9; // through October
    if (halfway) {
      goals.push({
        id: "faab_single_bid_cap",
        text: `Cap any single bid at ${Math.round(MAX_SINGLE_BID_FIRST_HALF * 100)}% of budget (${Math.round(faabBudget * MAX_SINGLE_BID_FIRST_HALF)}) unless it is an injury emergency`,
        category: "waivers",
        target: `${Math.round(faabBudget * MAX_SINGLE_BID_FIRST_HALF)} max`,
        status: "todo",
        sourceNote: "RotoWire's first-half rule.",
      });
    }

    if (!endgame) {
      goals.push({
        id: "faab_reserve",
        text: `Keep ${Math.round(EMERGENCY_RESERVE * 100)}% (${Math.round(faabBudget * EMERGENCY_RESERVE)}) back for bye and injury emergencies`,
        category: "waivers",
        current: `${faabRemaining} left`,
        target: `${Math.round(faabBudget * EMERGENCY_RESERVE)} reserved`,
        status: faabRemaining >= faabBudget * EMERGENCY_RESERVE ? "done" : "todo",
        sourceNote: "Fantasy Index.",
      });
    }

    // Relative buying power is the real currency, not the raw balance. We
    // cannot compute the true share without every rival's spend, so state the
    // principle and the number we do know rather than a misleading estimate.
    goals.push({
      id: "faab_market_share",
      text: "Track every surviving team's FAAB. Your bid ceiling is one dollar over the richest rival, not a percentage of your own budget",
      category: "waivers",
      current: `you hold ${faabRemaining}`,
      status: "todo",
      sourceNote:
        "Your share rises as the field shrinks even when your balance falls: $1,000 of an 18-team league's $18,000 is 5.6%, but $800 left when the survivors hold $5,000 between them is 16%.",
    });
  } else {
    goals.push({
      id: "faab_unknown",
      text: "Enter your FAAB budget and remaining balance to get pacing guidance",
      category: "waivers",
      status: "todo",
    });
  }

  // --- Roster construction ---
  if (!endgame) {
    goals.push({
      id: "floor_over_ceiling",
      text: "Start floor over ceiling while the field is large: a steady 12 to 14 points beats a player alternating 25 and 4",
      category: "roster",
      status: "todo",
      sourceNote:
        "A four-point week can eliminate you outright, which is not true in head-to-head redraft.",
    });

    goals.push({
      id: "avoid_correlation",
      text: "Avoid stacking one NFL offense and avoid piling up shared early byes. Weeks 5 and 6 are the usual trap",
      category: "roster",
      status: "todo",
      sourceNote:
        "DraftSharks: correlated downside turns one bad NFL game into several failed lineup slots at once.",
    });
  }

  // Late-season shift: from avoiding last to outscoring survivors.
  if (endgame) {
    goals.push({
      id: "endgame_ceiling",
      text: "Switch to ceiling. Surviving rosters are stacked, so pick the highest-upside lineup even if it is volatile",
      category: "roster",
      status: "todo",
      sourceNote:
        "Survival thresholds climb through the year: roughly 85 PPR points can survive September, December can require 120 and still lose.",
    });
    goals.push({
      id: "endgame_spend",
      text: "Spend down. Unused FAAB is worth nothing, and late elite players go cheap once bidders are gone",
      category: "waivers",
      status: "todo",
      sourceNote:
        "Winning bids on Travis Kelce fell from $486 in September to $53 in December in one tracked season.",
    });
  }

  // --- The wire itself ---
  goals.push({
    id: "wire_inversion",
    text: "Work the chopped rosters every week. This wire gets richer as the league shrinks, the opposite of redraft",
    category: "waivers",
    status: "todo",
    sourceNote:
      "Each chop returns a full roster of drafted players while the number of bidders falls.",
  });

  goals.push({
    id: "wire_traps",
    text: "Skip the traps: injured stars who cannot play now, boom/bust names with bad short-term matchups, and one-week wonders",
    category: "waivers",
    status: "todo",
    sourceNote:
      "RotoWire. Those players usually return to the wire a week or two later, cheaper.",
  });

  return goals;
}
