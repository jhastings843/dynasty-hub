import { dynastyGoals } from "./dynasty";
import { guillotineGoals } from "./guillotine";
import { redraftGoals } from "./redraft";
import type { AutoGoal, StrategyContext } from "./types";

export type { AutoGoal, GoalCategory, StrategyContext, TeamRecord } from "./types";

/** Goals for a league, using the rule set that matches its format. */
export function buildGoals(ctx: StrategyContext, now: Date = new Date()): AutoGoal[] {
  switch (ctx.profile.type) {
    case "redraft":
      return redraftGoals(ctx, now);
    case "guillotine":
      return guillotineGoals(ctx, now);
    case "dynasty":
    default:
      return dynastyGoals(ctx);
  }
}

/** One line describing how this format is played, shown above the goals. */
export const STRATEGY_SUMMARY: Record<string, string> = {
  dynasty:
    "Rosters carry over. Price every move against a multi-year window: age curves, pick capital, and whether your window is open now or later.",
  redraft:
    "One season, then everything resets. Youth and draft capital are worth nothing in December, so judge every move purely on this year's points.",
  guillotine:
    "The lowest scorer each week is eliminated and their roster hits waivers. You are not trying to score the most, you are trying not to score the least, so weekly floor beats ceiling until the field thins out.",
};
