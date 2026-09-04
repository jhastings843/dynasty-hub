import { describe, expect, it } from "vitest";
import {
  applyAvailability,
  deriveFieldState,
  normalizePicks,
  winnersOf,
} from "./field";
import type { Game } from "./types";

function played(
  week: number,
  home: string,
  away: string,
  homeScore: number,
  awayScore: number,
): Game {
  return {
    week,
    home,
    away,
    kickoff: `2026-09-${String(6 + week).padStart(2, "0")}T17:00:00Z`,
    homeSpread: null,
    homeMoneyline: null,
    awayMoneyline: null,
    overUnder: null,
    homeWinProb: 0.5,
    probSource: "moneyline",
    completed: true,
    homeScore,
    awayScore,
  };
}

function upcoming(week: number, home: string, away: string): Game {
  return { ...played(week, home, away, 0, 0), completed: false, homeScore: null, awayScore: null };
}

describe("normalizePicks", () => {
  it("accepts percentages", () => {
    const out = normalizePicks({ KC: 60, PHI: 40 });
    expect(out.KC).toBeCloseTo(0.6, 6);
  });
  it("accepts fractions", () => {
    expect(normalizePicks({ KC: 0.6, PHI: 0.4 }).KC).toBeCloseTo(0.6, 6);
  });
  it("rescales a partial paste", () => {
    const out = normalizePicks({ KC: 30, PHI: 20 });
    expect(out.KC + out.PHI).toBeCloseTo(1, 6);
  });
  it("drops zeroes and returns nothing for an empty paste", () => {
    expect(normalizePicks({ KC: 0 })).toEqual({});
  });
});

describe("winnersOf", () => {
  const games = [played(1, "KC", "DEN", 24, 10), played(1, "PHI", "NYG", 14, 21)];

  it("names the teams that advanced", () => {
    expect([...winnersOf(games, 1, false)!].sort()).toEqual(["KC", "NYG"]);
  });

  it("eliminates both sides of a tie by default", () => {
    const tied = [played(1, "KC", "DEN", 17, 17)];
    expect(winnersOf(tied, 1, false)!.size).toBe(0);
  });

  it("advances both sides of a tie when the pool says so", () => {
    const tied = [played(1, "KC", "DEN", 17, 17)];
    expect(winnersOf(tied, 1, true)!.size).toBe(2);
  });

  it("refuses to settle a week that is only half played", () => {
    expect(winnersOf([...games, upcoming(1, "BUF", "NYJ")], 1, false)).toBeNull();
  });

  it("returns null for a week it has no games for", () => {
    expect(winnersOf(games, 9, false)).toBeNull();
  });
});

describe("deriveFieldState", () => {
  const games = [
    played(1, "KC", "DEN", 24, 10),
    played(1, "PHI", "NYG", 30, 3),
    played(2, "BUF", "NYJ", 20, 17),
    played(2, "SF", "SEA", 10, 28),
  ];

  it("counts the survivors instead of asking you for the number", () => {
    // 70% took KC and won, 30% took NYG and lost.
    const f = deriveFieldState(
      [{ week: 1, picks: { KC: 70, NYG: 30 } }],
      games,
      500,
    );
    expect(f.entriesAlive).toBe(350);
    expect(f.attrition).toEqual([{ week: 1, entering: 500, survived: 350 }]);
  });

  it("compounds attrition across weeks", () => {
    const f = deriveFieldState(
      [
        { week: 1, picks: { KC: 70, NYG: 30 } },
        { week: 2, picks: { BUF: 80, SF: 20 } },
      ],
      games,
      500,
    );
    expect(f.entriesAlive).toBe(280); // 500 * 0.7 * 0.8
    expect(f.weeksLogged).toBe(2);
  });

  it("reports what fraction of the survivors has burned each team", () => {
    const f = deriveFieldState(
      [{ week: 1, picks: { KC: 70, NYG: 30 } }],
      games,
      500,
    );
    // Everyone alive got there on KC, and nobody alive holds NYG.
    expect(f.burned.KC).toBeCloseTo(1, 6);
    expect(f.burned.NYG ?? 0).toBeCloseTo(0, 6);
  });

  it("keeps the invariant that burned sums to the weeks played", () => {
    const f = deriveFieldState(
      [
        { week: 1, picks: { KC: 70, NYG: 30 } },
        { week: 2, picks: { BUF: 60, SEA: 40 } },
      ],
      games,
      500,
    );
    const total = Object.values(f.burned).reduce((a, b) => a + b, 0);
    // Every survivor has used exactly one team per completed week.
    expect(total).toBeCloseTo(2, 4);
  });

  it("splits the burned mass when the field split its picks", () => {
    const f = deriveFieldState(
      [{ week: 1, picks: { KC: 60, PHI: 40 } }],
      games,
      500,
    );
    // Both won, so nobody was eliminated and the field is split 60/40.
    expect(f.entriesAlive).toBe(500);
    expect(f.burned.KC).toBeCloseTo(0.6, 6);
    expect(f.burned.PHI).toBeCloseTo(0.4, 6);
  });

  it("skips a week whose results are not in yet", () => {
    const partial = [...games, upcoming(3, "DAL", "WAS")];
    const f = deriveFieldState(
      [
        { week: 1, picks: { KC: 70, NYG: 30 } },
        { week: 3, picks: { DAL: 100 } },
      ],
      partial,
      500,
    );
    expect(f.weeksLogged).toBe(1);
    expect(f.unscored).toEqual([3]);
    expect(f.entriesAlive).toBe(350);
  });

  it("treats a week where the whole field busted as unscoreable", () => {
    const f = deriveFieldState(
      [{ week: 1, picks: { DEN: 100 } }],
      games,
      500,
    );
    expect(f.weeksLogged).toBe(0);
    expect(f.unscored).toEqual([1]);
    expect(f.entriesAlive).toBe(500);
  });

  it("processes weeks in order no matter how they were logged", () => {
    const inOrder = deriveFieldState(
      [
        { week: 1, picks: { KC: 70, NYG: 30 } },
        { week: 2, picks: { BUF: 80, SF: 20 } },
      ],
      games,
      500,
    );
    const shuffled = deriveFieldState(
      [
        { week: 2, picks: { BUF: 80, SF: 20 } },
        { week: 1, picks: { KC: 70, NYG: 30 } },
      ],
      games,
      500,
    );
    expect(shuffled.entriesAlive).toBe(inOrder.entriesAlive);
    expect(shuffled.burned).toEqual(inOrder.burned);
  });

  it("is a no-op with nothing logged", () => {
    const f = deriveFieldState([], games, 500);
    expect(f.entriesAlive).toBe(500);
    expect(f.weeksLogged).toBe(0);
    expect(f.burned).toEqual({});
  });

  it("never lets the pool empty out entirely", () => {
    const f = deriveFieldState(
      [{ week: 1, picks: { KC: 0.4, NYG: 99.6 } }],
      games,
      10,
    );
    expect(f.entriesAlive).toBeGreaterThanOrEqual(1);
  });
});

describe("applyAvailability", () => {
  const teams = ["KC", "PHI", "BUF"];

  it("zeroes out a team the whole field has burned", () => {
    const out = applyAvailability({ KC: 0.6, PHI: 0.3, BUF: 0.1 }, { KC: 1 }, teams);
    expect(out.KC).toBeCloseTo(0, 6);
    expect(out.PHI + out.BUF).toBeCloseTo(1, 6);
  });

  it("scales a partly burned team and hands the rest to the others", () => {
    const out = applyAvailability({ KC: 0.6, PHI: 0.3, BUF: 0.1 }, { KC: 0.5 }, teams);
    expect(out.KC).toBeLessThan(0.6);
    expect(out.PHI).toBeGreaterThan(0.3);
    expect(Object.values(out).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it("changes nothing when the field has burned nothing", () => {
    const picks = { KC: 0.6, PHI: 0.3, BUF: 0.1 };
    const out = applyAvailability(picks, {}, teams);
    for (const t of teams) expect(out[t]).toBeCloseTo(picks[t as keyof typeof picks], 6);
  });

  it("falls back to uniform when everything playable is burned", () => {
    const out = applyAvailability(
      { KC: 0.6, PHI: 0.4 },
      { KC: 1, PHI: 1, BUF: 1 },
      teams,
    );
    expect(out.KC).toBeCloseTo(1 / 3, 6);
  });
});
