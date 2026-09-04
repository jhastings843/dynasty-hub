import { describe, expect, it } from "vitest";
import {
  americanToImplied,
  noVig,
  normalCdf,
  spreadToWinProb,
} from "./probability";

describe("americanToImplied", () => {
  it("converts a favourite", () => {
    expect(americanToImplied(-200)).toBeCloseTo(0.666667, 5);
  });
  it("converts an underdog", () => {
    expect(americanToImplied(170)).toBeCloseTo(0.37037, 5);
  });
  it("treats even money as a coin flip", () => {
    expect(americanToImplied(100)).toBeCloseTo(0.5, 6);
    expect(americanToImplied(-100)).toBeCloseTo(0.5, 6);
  });
});

describe("noVig", () => {
  it("matches the worked -200 / +170 example", () => {
    // Raw sums to 1.037; the 3.7% overround belongs to neither side.
    expect(noVig(-200, 170)).toBeCloseTo(0.642857, 5);
    expect(1 - noVig(-200, 170)).toBeCloseTo(0.357143, 5);
  });

  it("always produces two probabilities that sum to one", () => {
    for (const [h, a] of [
      [-185, 154],
      [-600, 440],
      [-102, -118],
      [124, -148],
    ] as const) {
      const p = noVig(h, a);
      expect(p + (1 - p)).toBeCloseTo(1, 10);
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThan(1);
    }
  });

  it("is strictly below the vig-inclusive number for the favourite", () => {
    // The whole point: raw implied odds overstate the favourite on every game.
    expect(noVig(-185, 154)).toBeLessThan(americanToImplied(-185));
  });

  it("prices a pick'em at 50/50", () => {
    expect(noVig(-110, -110)).toBeCloseTo(0.5, 10);
  });
});

describe("normalCdf", () => {
  it("is a half at zero", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
  });
  it("matches known quantiles", () => {
    expect(normalCdf(1)).toBeCloseTo(0.841345, 4);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
  });
  it("is symmetric", () => {
    expect(normalCdf(0.7) + normalCdf(-0.7)).toBeCloseTo(1, 6);
  });
});

describe("spreadToWinProb", () => {
  it("reproduces the published spread-to-win table", () => {
    expect(spreadToWinProb(-3)).toBeCloseTo(0.589, 2);
    expect(spreadToWinProb(-6.5)).toBeCloseTo(0.688, 2);
    expect(spreadToWinProb(-7)).toBeCloseTo(0.701, 2);
    expect(spreadToWinProb(-10)).toBeCloseTo(0.774, 2);
    expect(spreadToWinProb(-14)).toBeCloseTo(0.854, 2);
  });

  it("prices a pick'em at 50/50", () => {
    expect(spreadToWinProb(0)).toBeCloseTo(0.5, 6);
  });

  it("falls monotonically as the spread shrinks toward a pick'em", () => {
    let last = 1;
    for (let s = -17; s <= 0; s += 0.5) {
      const p = spreadToWinProb(s);
      expect(p).toBeLessThanOrEqual(last);
      last = p;
    }
    expect(last).toBeCloseTo(0.5, 6);
  });

  it("keeps the two sides complementary", () => {
    expect(spreadToWinProb(-7) + spreadToWinProb(7)).toBeCloseTo(1, 6);
  });

  it("never claims certainty, even at three touchdowns", () => {
    expect(spreadToWinProb(-21)).toBeLessThan(0.96);
  });
});
