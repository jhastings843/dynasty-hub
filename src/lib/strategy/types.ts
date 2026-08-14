// Season goals, one rule set per league format.
//
// Dynasty, redraft, and guillotine are not the same game. A dynasty team asks
// "is my window open"; a redraft team asks "do I make the playoffs this year";
// a guillotine team asks "am I above the elimination line this week". The rule
// sets differ, but they all return the same AutoGoal[] so the plan page renders
// any format without branching.

import type { TeamSummary } from "@/lib/dynasty/power-rankings";
import type { Trajectory } from "@/lib/dynasty/season-plan";
import type { LeagueProfile } from "@/lib/league/types";
import type { RATeamGrade } from "@/lib/rosteraudit/types";

export type GoalCategory =
  | "roster"
  | "trade"
  | "draft"
  | "standings"
  | "waivers"
  | "survival"
  | "other";

export interface AutoGoal {
  id: string;
  text: string;
  category: GoalCategory;
  current?: string;
  target?: string;
  status: "todo" | "in_progress" | "done";
  /** Where the rule came from, when it is not self-evident. */
  sourceNote?: string;
}

export interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface StrategyContext {
  profile: LeagueProfile;
  myTeam: TeamSummary;
  totalTeams: number;
  grade: RATeamGrade | null;
  trajectory: Trajectory;
  draftSlot: number | null;
  draftRounds: number;
  /** Bottom two positions by league-relative rank. */
  weakestPositions: string[];
  /** Top two positions by league-relative rank. */
  strongestPositions: string[];
  record: TeamRecord;
  /** 1-based, by wins then points for. */
  standingRank: number;
  /** League scoring rank, 1-based. Null when the season has not started. */
  scoringRank: number | null;
  /** NFL week, when the season is under way. */
  week: number | null;
  /** FAAB left, when the league uses it. */
  faabRemaining: number | null;
  /** Total FAAB budget, when the league uses it. */
  faabBudget: number | null;
  /** Playoff berths, from league settings rather than assumed. */
  playoffTeams: number;
  /** Regular season length, derived from the playoff start week. */
  regularSeasonWeeks: number;
}

export type StrategyRules = (ctx: StrategyContext) => AutoGoal[];
