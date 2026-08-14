import { gradeScore } from "@/lib/dynasty/season-plan";
import type { AutoGoal, StrategyContext } from "./types";

// Dynasty strategy.
//
// Rosters carry over, so every decision is priced against a multi-year window.
// These rules are the ones the app already ran, moved here so redraft and
// guillotine can sit alongside them rather than inside them.

export function dynastyGoals(ctx: StrategyContext): AutoGoal[] {
  const goals: AutoGoal[] = [];
  const {
    myTeam,
    totalTeams,
    trajectory,
    draftSlot,
    draftRounds,
    weakestPositions,
    strongestPositions,
    record,
    grade,
    playoffTeams,
  } = ctx;

  // Roster construction
  if (weakestPositions.length > 0) {
    const pos = weakestPositions[0];
    const currentRank = myTeam.positionRanks[pos] ?? 99;
    const target = Math.max(1, Math.ceil(totalTeams / 2));
    goals.push({
      id: "improve_weakest",
      text: `Improve ${pos} room from #${currentRank} to top ${target}`,
      category: "roster",
      current: `#${currentRank} of ${totalTeams}`,
      target: `top ${target}`,
      status: currentRank <= target ? "done" : "todo",
    });
  }

  // Trade strategy
  const tradeText =
    trajectory === "rebuild"
      ? "Sell 1-2 aging vets for future picks (target 2027 1sts)"
      : trajectory === "contender" || trajectory === "compete"
        ? "Make 1-2 win-now trades fixing weak positions"
        : "Make 1-2 trades shifting roster toward your direction";
  goals.push({
    id: "trades",
    text: tradeText,
    category: "trade",
    target: "1-2 completed",
    status: "todo",
  });

  // Sell-high on surplus
  if (strongestPositions.length > 0) {
    const pos = strongestPositions[0];
    goals.push({
      id: "sell_high",
      text: `Use ${pos} surplus (you're #${myTeam.positionRanks[pos]}) as trade currency`,
      category: "trade",
      status: "todo",
    });
  }

  // Draft
  if (draftSlot && draftRounds > 0) {
    const targetCount = Math.min(2, draftRounds);
    goals.push({
      id: "draft_starters",
      text: `Land ${targetCount} starting-caliber rookies in the rookie draft`,
      category: "draft",
      target: `${targetCount} hits`,
      status: "todo",
    });
  }

  // Standings. Uses the real record rather than the placeholder this rule
  // carried before, which always evaluated to zero and so never progressed.
  const playoffSpots = playoffTeams;
  const played = record.wins + record.losses + record.ties;
  goals.push({
    id: "playoffs",
    text: `Make playoffs (top ${playoffSpots} of ${totalTeams})`,
    category: "standings",
    current:
      played > 0
        ? `${record.wins}-${record.losses}${record.ties ? `-${record.ties}` : ""}`
        : undefined,
    target: `top ${playoffSpots}`,
    status: played > 0 ? "in_progress" : "todo",
  });

  // Long-term value
  if (trajectory === "rebuild" || trajectory === "reload") {
    goals.push({
      id: "youth",
      text: "Get younger: target avg starter age below 25",
      category: "roster",
      current: grade ? `${grade.avgStarterAge.toFixed(1)} yrs` : "—",
      target: "<25 yrs",
      status: grade && grade.avgStarterAge < 25 ? "done" : "todo",
    });
  } else if (trajectory === "contender" || trajectory === "compete") {
    goals.push({
      id: "win_now",
      text: "Hold or improve dynasty grade; don't sell future cheap",
      category: "roster",
      current: grade?.dynastyGrade ?? "—",
      target: "B+ or better",
      status: grade && gradeScore(grade.dynastyGrade) >= 9 ? "done" : "todo",
    });
  }

  return goals;
}
