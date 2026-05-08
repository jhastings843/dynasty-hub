// Strategy articles surfaced as expandable cards on the survivor
// page. Content is intentionally short, action-oriented, written for
// someone who already plays survivor pools and wants the principles,
// not a 101 explainer.

export interface StrategyArticle {
  id: string;
  title: string;
  hook: string; // one-line summary shown collapsed
  body: string; // full text shown expanded
  takeaway: string; // single rule of thumb
}

export const STRATEGY_ARTICLES: StrategyArticle[] = [
  {
    id: "win-vs-finish",
    title: "Surviving is not the goal. Finishing first is.",
    hook: "Maximize first-place equity, not week-by-week safety.",
    body: "Survivor pools pay first place (sometimes second and third). The optimal strategy is the one that maximizes your probability of being the last entry standing, not the one that minimizes weekly elimination risk. Those two objectives diverge constantly. A safe 95% favorite that 60% of the field is also taking gives you almost no leverage. A 78% favorite that 8% of the field is on can be the better expected-value play even though it raises your weekly bust risk, because the world where it hits is a world where you have a much smaller field to beat. Always check the equity math, not just the pick odds.",
    takeaway: "EV(first place) > EV(survival) when leverage is on the table.",
  },
  {
    id: "future-value",
    title: "Save elite teams for scarce weeks.",
    hook: "KC, BUF, PHI, BAL, DET, SF on a Week 3 home game is a leak.",
    body: "There are usually three or four weeks each season where the slate is genuinely thin: every team has a road game, a divisional game, or is on short rest. Burning your top-tier teams in Weeks 1-5 when there are 6-8 viable options leaves you holding 14-point underdogs in Week 11. Map your usable teams against the full schedule before you make any pick after Week 1. If KC is also a fit in Week 11 and Week 14, do not use them in Week 4 unless the alternative options that week are noticeably worse.",
    takeaway: "Plan three weeks ahead minimum. Five is better.",
  },
  {
    id: "pool-size",
    title: "Pool size dictates risk tolerance.",
    hook: "Small pool = chalk. Large pool = leverage.",
    body: "In a 30-entry pool, surviving is most of the battle: take the safest pick, lock in the equity gain when others bust. In a 5,000-entry pool, raw survival math means you finish 800th unless you take leverage. Rough cutoffs: under 100 entries lean chalk, 100-1000 entries take moderate leverage on the most-popular team, 1000+ entries actively pivot off the most-public team if a 70%+ alternative exists. Update this read every week as the field shrinks.",
    takeaway: "Always know how many entries are still alive in your pool.",
  },
  {
    id: "trap-games",
    title: "Filter favorites for trap signals.",
    hook: "Spread alone is not safety. Volatility kills survivor entries.",
    body: "A 9-point favorite with a turnover-prone QB on the road is not the same bet as a 9-point favorite at home with their starting line healthy. Run every candidate through a quick filter: short rest, cross-country travel, divisional rematch (much closer historically), QB injury status, OL injuries, weather (cold + wind + outdoor), backup QB on the other side leading to scheme uncertainty. Any two of these and you should look elsewhere or take a smaller favorite without the red flags.",
    takeaway: "Two trap signals = pivot, even at the cost of a few percentage points.",
  },
  {
    id: "vegas-not-public",
    title: "Trust line movement over public sentiment.",
    hook: "Sharps move the line. The public follows.",
    body: "If a spread opens at -7 and moves to -9, that is information regardless of how popular the team is. If it opens at -7 and stays despite 80% of bets coming in on the favorite, that is also information (sharp money on the dog). Cross-reference the line move and the bet split. Public-heavy pick + line not moving + ownership ballooning is a textbook fade-the-public spot. Public-heavy pick + line moving favorite + smart money agreeing is fine to ride.",
    takeaway: "Line movement is a sharper read than survivor pick popularity.",
  },
  {
    id: "thanksgiving-late-season",
    title: "Holidays and late-season weeks behave differently.",
    hook: "Thanksgiving, Christmas, late-December games have unique variance.",
    body: "Thanksgiving has only three games, which compresses ownership and exposes you to single-game variance. Late-season games involving teams locked into playoff seeds or eliminated have motivation issues that the spread does not always capture. Backup QBs come in for rest weeks. Outdoor weather games in December swing 5+ points. If you are still alive in December, the strategy shifts from EV optimization to surviving variance. Take the team you trust over the team with the best closing-line value.",
    takeaway: "December survivor strategy is different from October. Adjust.",
  },
];
