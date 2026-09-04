import { NFL_TEAMS } from "./teams";

/**
 * Standard deviation of NFL game margins around the closing spread, estimated
 * from 5,695 games 2003-2024. Only used when a game has a spread but no
 * moneyline posted.
 */
export const MARGIN_SIGMA = 13.29;

/** American odds to raw (vig-inclusive) implied probability. */
export function americanToImplied(odds: number): number {
  if (odds < 0) return -odds / (-odds + 100);
  return 100 / (odds + 100);
}

/**
 * Strip the vig from a two-way market by normalising both sides.
 * A -185 / +154 pair implies 0.649 + 0.394 = 1.043 of probability; the
 * overround is the book's margin and belongs to neither side. Using the raw
 * 0.649 as a win probability overstates the favourite on every single game.
 */
export function noVig(homeOdds: number, awayOdds: number): number {
  const qh = americanToImplied(homeOdds);
  const qa = americanToImplied(awayOdds);
  const total = qh + qa;
  if (total <= 0) return 0.5;
  return qh / total;
}

/** Standard normal CDF, Abramowitz & Stegun 7.1.26, accurate to ~1.5e-7. */
export function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

/**
 * Win probability from a point spread. The -110 attached to a spread prices the
 * COVER, not the outright win, so this is a margin model rather than an odds
 * conversion: P(margin > 0) where margin ~ Normal(-spread, MARGIN_SIGMA).
 *
 * It smooths over the NFL key numbers (margins of exactly 3 and 7 are far more
 * common than their neighbours), which is why the moneyline is always preferred.
 */
export function spreadToWinProb(homeSpread: number): number {
  return normalCdf(-homeSpread / MARGIN_SIGMA);
}

/** Last-resort probability from the baseline power ratings in teams.ts. */
export function ratingWinProb(home: string, away: string): number {
  const h = NFL_TEAMS.find((t) => t.abbr === home)?.rating ?? 70;
  const a = NFL_TEAMS.find((t) => t.abbr === away)?.rating ?? 70;
  // ~0.4 points of spread per rating point, plus 1.8 for home field.
  return spreadToWinProb(-((h - a) * 0.4 + 1.8));
}
