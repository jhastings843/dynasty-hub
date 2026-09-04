import { describe, expect, it } from "vitest";
import { REGULAR_SEASON_WEEKS, seasonIsComplete } from "./odds";
import { publicPicksAreComplete } from "./ownership";
import type { Game } from "./types";

function stub(week: number): Game {
  return {
    week,
    home: "KC",
    away: "DEN",
    kickoff: "2026-09-13T17:00:00Z",
    homeSpread: null,
    homeMoneyline: null,
    awayMoneyline: null,
    overUnder: null,
    homeWinProb: 0.6,
    probSource: "moneyline",
    completed: false,
    homeScore: null,
    awayScore: null,
  };
}

const fullSeason = Array.from({ length: REGULAR_SEASON_WEEKS }, (_, i) => stub(i + 1));

describe("seasonIsComplete", () => {
  it("accepts a schedule with all 18 weeks", () => {
    expect(seasonIsComplete(fullSeason)).toBe(true);
  });

  it("rejects a schedule missing a future week", () => {
    expect(seasonIsComplete(fullSeason.filter((g) => g.week !== 12))).toBe(false);
  });

  it("rejects a schedule missing the current week", () => {
    // The dangerous one: without week 1 the page moves on to week 2's board.
    expect(seasonIsComplete(fullSeason.filter((g) => g.week !== 1))).toBe(false);
  });

  it("rejects an empty schedule", () => {
    expect(seasonIsComplete([])).toBe(false);
  });

  it("does not mind extra games in a week", () => {
    expect(seasonIsComplete([...fullSeason, stub(5), stub(5)])).toBe(true);
  });
});

describe("publicPicksAreComplete", () => {
  const full = Object.fromEntries(
    Array.from({ length: 32 }, (_, i) => [`T${i}`, 1 / 32]),
  );

  it("accepts a week covering the league", () => {
    expect(publicPicksAreComplete({ "1": full })).toBe(true);
  });

  it("rejects an empty response", () => {
    expect(publicPicksAreComplete({})).toBe(false);
  });

  it("rejects a stub page that parses to a handful of teams", () => {
    expect(publicPicksAreComplete({ "1": { KC: 0.5, DEN: 0.5 } })).toBe(false);
  });

  it("accepts as long as one week is whole", () => {
    expect(publicPicksAreComplete({ "1": { KC: 1 }, "2": full })).toBe(true);
  });
});
