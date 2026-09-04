import { describe, expect, it } from "vitest";
import { futureCost, horizonWeight, hungarian, planFuture } from "./assignment";
import type { Game } from "./types";

function game(week: number, home: string, away: string, p: number): Game {
  return {
    week,
    home,
    away,
    kickoff: `2026-09-${String(10 + week).padStart(2, "0")}T17:00Z`,
    homeSpread: null,
    homeMoneyline: null,
    awayMoneyline: null,
    overUnder: null,
    homeWinProb: p,
    probSource: "moneyline",
    completed: false,
    homeScore: null,
    awayScore: null,
  };
}

describe("hungarian", () => {
  it("solves the textbook 3x3", () => {
    const cost = [
      [4, 1, 3],
      [2, 0, 5],
      [3, 2, 2],
    ];
    // Optimal is row0->col1, row1->col0, row2->col2 for a total of 5.
    const a = hungarian(cost);
    const total = a.reduce((s, col, row) => s + cost[row][col], 0);
    expect(total).toBe(5);
    expect(new Set(a).size).toBe(3);
  });

  it("handles a rectangular matrix with spare columns", () => {
    const cost = [
      [9, 1, 9, 9],
      [9, 9, 2, 9],
    ];
    expect(hungarian(cost)).toEqual([1, 2]);
  });

  it("never assigns one column twice", () => {
    const cost = [
      [1, 50, 50],
      [1, 50, 50],
    ];
    const a = hungarian(cost);
    expect(new Set(a).size).toBe(2);
  });

  it("refuses when rows outnumber columns", () => {
    expect(hungarian([[1], [2], [3]])).toEqual([-1, -1, -1]);
  });

  it("returns nothing for an empty problem", () => {
    expect(hungarian([])).toEqual([]);
  });

  it("beats a greedy pass on a matrix built to trap it", () => {
    // Greedy takes the 1 in row 0 and is then stuck with 100.
    const cost = [
      [1, 2],
      [1, 100],
    ];
    const a = hungarian(cost);
    const total = a.reduce((s, col, row) => s + cost[row][col], 0);
    expect(total).toBe(3);
  });
});

describe("horizonWeight", () => {
  it("discounts weeks you may never reach", () => {
    expect(horizonWeight(1, 0.8)).toBeCloseTo(0.8, 6);
    expect(horizonWeight(4, 0.8)).toBeCloseTo(0.4096, 6);
  });
  it("is monotonically decreasing", () => {
    expect(horizonWeight(5)).toBeLessThan(horizonWeight(2));
  });
});

describe("planFuture", () => {
  const games = [
    game(2, "KC", "DEN", 0.9),
    game(2, "BUF", "NYJ", 0.7),
    game(3, "KC", "LV", 0.85),
    game(3, "BUF", "MIA", 0.6),
  ];

  it("does not reuse a team across weeks", () => {
    const plan = planFuture([2, 3], ["KC", "BUF"], games);
    expect(plan.plan.map((p) => p.team).sort()).toEqual(["BUF", "KC"]);
  });

  it("assigns the scarce team to the week that needs it", () => {
    // Both weeks must be covered. Taking KC in week 2 leaves BUF's 0.6 in
    // week 3 (0.54); taking BUF in week 2 leaves KC's 0.85 (0.595).
    const plan = planFuture([2, 3], ["KC", "BUF"], games);
    const wk2 = plan.plan.find((p) => p.week === 2);
    expect(wk2?.team).toBe("BUF");
    expect(plan.survival).toBeCloseTo(0.7 * 0.85, 6);
  });

  it("reports the unweighted survival of the path it chose", () => {
    const plan = planFuture([2], ["KC"], games);
    expect(plan.survival).toBeCloseTo(0.9, 6);
  });

  it("skips a week a team is on bye rather than crashing", () => {
    const plan = planFuture([2, 3], ["KC", "BUF", "SF"], games);
    expect(plan.plan).toHaveLength(2);
    expect(plan.plan.every((p) => p.team !== "SF")).toBe(true);
  });

  it("is empty when there is nothing to plan", () => {
    expect(planFuture([], ["KC"], games).plan).toEqual([]);
    expect(planFuture([2], [], games).plan).toEqual([]);
  });
});

describe("futureCost", () => {
  const games = [
    game(2, "KC", "DEN", 0.9),
    game(2, "BUF", "NYJ", 0.7),
    game(3, "KC", "LV", 0.85),
    game(3, "BUF", "MIA", 0.6),
    game(3, "SF", "ARI", 0.8),
  ];
  const teams = ["KC", "BUF", "SF"];
  const base = planFuture([2, 3], teams, games);

  it("is never negative, because removing an option cannot help", () => {
    for (const t of teams) {
      expect(futureCost(t, base.value, [2, 3], teams, games)).toBeGreaterThanOrEqual(0);
    }
  });

  it("charges more for the team the future plan depends on", () => {
    const kc = futureCost("KC", base.value, [2, 3], teams, games);
    const buf = futureCost("BUF", base.value, [2, 3], teams, games);
    expect(kc).toBeGreaterThan(buf);
  });

  it("is free when there is no future left to protect", () => {
    expect(futureCost("KC", base.value, [], teams, games)).toBe(0);
  });

  it("is free for a team the plan was not using anyway", () => {
    // Only two weeks to cover and three usable teams, so one is spare.
    const spare = teams.filter(
      (t) => !base.plan.some((p) => p.team === t),
    );
    for (const t of spare) {
      expect(futureCost(t, base.value, [2, 3], teams, games)).toBeCloseTo(0, 6);
    }
  });
});
