import { describe, expect, it } from "vitest";
import { scoreStatLine, scoringSkewNotes } from "./scoring";

// Dah Chopped's real scoring, trimmed to the keys these tests exercise.
const CHOPPED = {
  rec: 1,
  rec_yd: 0.1,
  rec_td: 6,
  rush_yd: 0.1,
  rush_td: 6,
  pass_yd: 0.04,
  pass_td: 4,
  pass_int: -1,
  fum_lost: -2,
};

describe("scoreStatLine", () => {
  it("scores a receiving line under full PPR", () => {
    // 4 catches, 26.9 yards, 0.19 TD
    const pts = scoreStatLine({ rec: 4, rec_yd: 26.9, rec_td: 0.19 }, CHOPPED);
    expect(pts).toBeCloseTo(4 + 2.69 + 1.14, 5);
  });

  it("pays 4 per passing touchdown, not Sleeper's default 6", () => {
    const line = { pass_yd: 250, pass_td: 2, pass_int: 1 };
    expect(scoreStatLine(line, CHOPPED)).toBeCloseTo(10 + 8 - 1, 5);
    expect(scoreStatLine(line, { ...CHOPPED, pass_td: 6 })).toBeCloseTo(10 + 12 - 1, 5);
  });

  it("ignores the precomputed totals rather than double counting them", () => {
    const withTotals = { rec: 4, pts_ppr: 22.51, pts_half_ppr: 20.51, pts_std: 18.51 };
    expect(scoreStatLine(withTotals, CHOPPED)).toBe(4);
  });

  it("ignores projection metadata that is not production", () => {
    const line = { rec: 2, gp: 1, adp_dd_ppr: 1, pos_adp_dd_ppr: 1 };
    expect(scoreStatLine(line, { ...CHOPPED, gp: 100, adp_dd_ppr: 100 })).toBe(2);
  });

  it("pays a bonus the league carries without needing a special case", () => {
    const te = { rec: 5, bonus_rec_te: 5 };
    expect(scoreStatLine(te, CHOPPED)).toBe(5);
    expect(scoreStatLine(te, { ...CHOPPED, bonus_rec_te: 0.5 })).toBe(7.5);
  });

  it("contributes nothing for stats the league does not pay", () => {
    expect(scoreStatLine({ rush_att: 20, rec_tgt: 9 }, CHOPPED)).toBe(0);
  });

  it("is zero for an empty line", () => {
    expect(scoreStatLine({}, CHOPPED)).toBe(0);
  });
});

describe("scoringSkewNotes", () => {
  it("flags full PPR against the half-PPR list", () => {
    const notes = scoringSkewNotes(CHOPPED);
    expect(notes.some((n) => n.includes("Full PPR"))).toBe(true);
  });

  it("flags a 4-point passing touchdown", () => {
    const notes = scoringSkewNotes(CHOPPED);
    expect(notes.some((n) => n.includes("4 points per passing touchdown"))).toBe(true);
  });

  it("says nothing about pass TDs in a 6-point league", () => {
    const notes = scoringSkewNotes({ ...CHOPPED, pass_td: 6 });
    expect(notes.some((n) => n.includes("passing touchdown"))).toBe(false);
  });

  it("counts only bonuses the league actually pays", () => {
    const notes = scoringSkewNotes({ ...CHOPPED, bonus_rec_te: 0.5, bonus_rush_yd_100: 0 });
    expect(notes.some((n) => n.includes("1 scoring bonus"))).toBe(true);
  });
});
