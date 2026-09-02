// What things actually cost in this room.
//
// Published bid guidance is quoted against a $1000 budget, which is convenient
// because Dah Chopped is a $1000 league, but it describes the average league
// rather than this one. Some rooms panic in Week 2 and some sit on their money
// until December, and the difference is worth more than the guidance is.
//
// Every winning bid in a Sleeper league is public, so the model starts on the
// published priors and walks toward observed behavior as bids accumulate. Weeks
// 1 and 2 have no history and say so rather than pretending to a read.

import type { Phase } from "./budget";

export type Tier = "championship" | "multiweek" | "bandaid" | "stash";

export const TIER_LABEL: Record<Tier, string> = {
  championship: "Championship starter",
  multiweek: "Multiweek starter",
  bandaid: "Band-aid",
  stash: "Upside stash",
};

export const TIER_MEANING: Record<Tier, string> = {
  championship: "Would still be in your starting eight in the final four.",
  multiweek: "Clear role now, likely replaced before the endgame.",
  bandaid: "One matchup, one injury, or one bye week of cover.",
  stash: "Needs an injury or a role change to matter.",
};

/**
 * Prior price as a share of the original budget, from RotoWire's post-Week-2
 * tiers on $1000 ($200 championship, $40 probable starter, $10 streamer) with
 * Fantasy Life's stash guidance for the bottom rung.
 */
const TIER_PRIOR: Record<Tier, number> = {
  championship: 0.2,
  multiweek: 0.04,
  bandaid: 0.01,
  stash: 0.005,
};

/**
 * How prices decay as bidders disappear. Fantasy Life's historical winning bids
 * on one elite player ran $486 in September, $310 in October, $222 in November
 * and $53 in December, so the same player costs roughly a tenth as much once
 * the field is nearly gone.
 *
 * Keyed to phase rather than month for the same reason the pacing curve is.
 */
const PHASE_PRICE_MULTIPLIER: Record<Phase, number> = {
  field: 1,
  consolidation: 0.75,
  endgame: 0.5,
  duel: 0.35,
};

/** How much a single observed bid pulls the estimate off the prior. */
const PRIOR_WEIGHT = 3;

export interface ObservedBid {
  week: number;
  tier: Tier;
  amount: number;
}

export interface MarketEstimate {
  tier: Tier;
  /** Expected winning bid in dollars. */
  expected: number;
  /** Where this number came from, for the report to show. */
  basis: "published priors" | "league history" | "blended";
  observations: number;
}

export interface MarketModel {
  estimates: Record<Tier, MarketEstimate>;
  /** Winning bids seen so far, most recent first. */
  history: ObservedBid[];
  note: string;
}

export function buildMarket(
  budget: number,
  phase: Phase,
  observed: ObservedBid[],
): MarketModel {
  const multiplier = PHASE_PRICE_MULTIPLIER[phase];
  const tiers = Object.keys(TIER_PRIOR) as Tier[];

  const estimates = {} as Record<Tier, MarketEstimate>;
  for (const tier of tiers) {
    const prior = budget * TIER_PRIOR[tier] * multiplier;
    const seen = observed.filter((o) => o.tier === tier);
    const total = seen.reduce((s, o) => s + o.amount, 0);
    const expected = (prior * PRIOR_WEIGHT + total) / (PRIOR_WEIGHT + seen.length);

    estimates[tier] = {
      tier,
      expected,
      basis:
        seen.length === 0
          ? "published priors"
          : seen.length >= PRIOR_WEIGHT * 2
            ? "league history"
            : "blended",
      observations: seen.length,
    };
  }

  const note =
    observed.length === 0
      ? "No bids have cleared in this league yet, so these are published benchmarks scaled to a $" +
        budget +
        " budget. They will be replaced by what your league actually pays."
      : `Priced from ${observed.length} winning ${observed.length === 1 ? "bid" : "bids"} in this league, blended with published benchmarks.`;

  return {
    estimates,
    history: [...observed].sort((a, b) => b.week - a.week),
    note,
  };
}

/**
 * Nudge a bid off a round number.
 *
 * Rooms bid in fives, tens and hundreds, so the cheapest edge in the format is
 * a dollar nobody else thought to add. Costs at most $4 and wins every tie
 * against a manager who typed $100.
 */
export function unroundBid(amount: number, ceiling: number): number {
  const base = Math.max(1, Math.round(amount));
  if (base % 5 !== 0) return Math.min(base, Math.round(ceiling));
  const nudged = base + 3;
  return Math.min(nudged, Math.max(1, Math.round(ceiling)));
}

/**
 * The bid that beats a specific rival rather than the market.
 *
 * Only correct once the field is small enough to enumerate: with twelve teams
 * alive their maximum is meaningless, but heads-up it is the whole answer.
 */
export function bidToBeat(rivalMax: number, myRemaining: number): number | null {
  if (rivalMax <= 0) return null;
  const needed = rivalMax + 1;
  return needed <= myRemaining ? needed : null;
}
