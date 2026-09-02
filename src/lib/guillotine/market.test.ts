import { describe, expect, it } from "vitest";
import { bidToBeat, buildMarket, unroundBid } from "./market";
import type { ObservedBid } from "./market";

describe("buildMarket", () => {
  it("starts on published priors when no bid has cleared", () => {
    const market = buildMarket(1000, "field", []);
    // RotoWire's $200 championship tier on a $1000 budget.
    expect(market.estimates.championship.expected).toBeCloseTo(200, 5);
    expect(market.estimates.multiweek.expected).toBeCloseTo(40, 5);
    expect(market.estimates.bandaid.expected).toBeCloseTo(10, 5);
    expect(market.estimates.championship.basis).toBe("published priors");
  });

  it("scales the priors to the league's budget", () => {
    const small = buildMarket(100, "field", []);
    expect(small.estimates.championship.expected).toBeCloseTo(20, 5);
    expect(small.estimates.bandaid.expected).toBeCloseTo(1, 5);
  });

  it("marks down prices as the field shrinks", () => {
    const early = buildMarket(1000, "field", []).estimates.championship.expected;
    const late = buildMarket(1000, "endgame", []).estimates.championship.expected;
    const duel = buildMarket(1000, "duel", []).estimates.championship.expected;
    expect(late).toBeLessThan(early);
    expect(duel).toBeLessThan(late);
  });

  it("moves toward what the league actually pays", () => {
    const cheap: ObservedBid[] = [
      { week: 2, tier: "championship", amount: 60 },
      { week: 3, tier: "championship", amount: 40 },
    ];
    const market = buildMarket(1000, "field", cheap);
    expect(market.estimates.championship.expected).toBeLessThan(200);
    expect(market.estimates.championship.expected).toBeGreaterThan(60);
    expect(market.estimates.championship.basis).toBe("blended");
  });

  it("trusts league history once there is enough of it", () => {
    const many: ObservedBid[] = Array.from({ length: 6 }, (_, i) => ({
      week: i + 2,
      tier: "championship" as const,
      amount: 300,
    }));
    const market = buildMarket(1000, "field", many);
    expect(market.estimates.championship.basis).toBe("league history");
    expect(market.estimates.championship.expected).toBeGreaterThan(250);
  });

  it("keeps tiers independent", () => {
    const market = buildMarket(1000, "field", [{ week: 2, tier: "bandaid", amount: 90 }]);
    expect(market.estimates.championship.expected).toBeCloseTo(200, 5);
    expect(market.estimates.bandaid.expected).toBeGreaterThan(10);
  });

  it("says plainly when it has no read on the room", () => {
    expect(buildMarket(1000, "field", []).note).toContain("No bids have cleared");
  });

  it("orders history most recent first", () => {
    const market = buildMarket(1000, "field", [
      { week: 2, tier: "bandaid", amount: 5 },
      { week: 7, tier: "bandaid", amount: 9 },
    ]);
    expect(market.history[0].week).toBe(7);
  });
});

describe("unroundBid", () => {
  it("nudges a round number off the obvious figure", () => {
    expect(unroundBid(100, 500)).toBe(103);
    expect(unroundBid(25, 500)).toBe(28);
  });

  it("leaves an already-odd number alone", () => {
    expect(unroundBid(187, 500)).toBe(187);
  });

  it("never exceeds the ceiling", () => {
    expect(unroundBid(100, 100)).toBe(100);
    expect(unroundBid(250, 40)).toBe(40);
  });

  it("never goes below the minimum bid", () => {
    expect(unroundBid(0, 500)).toBeGreaterThanOrEqual(1);
  });
});

describe("bidToBeat", () => {
  it("is a dollar over the rival's maximum", () => {
    expect(bidToBeat(84, 300)).toBe(85);
  });

  it("is null when you cannot cover it", () => {
    expect(bidToBeat(400, 300)).toBeNull();
  });

  it("is null when the rival is broke", () => {
    expect(bidToBeat(0, 300)).toBeNull();
  });
});
