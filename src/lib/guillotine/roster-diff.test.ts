import { describe, expect, it } from "vitest";
import { aliveFromRosters, choppedSince, snapshotFrom, winningBidsFrom } from "./roster-diff";
import type { RosterSnapshot } from "./roster-diff";
import type { SleeperRoster } from "@/lib/sleeper/types";

const roster = (id: number, players: string[], used = 0): SleeperRoster =>
  ({
    roster_id: id,
    league_id: "L",
    owner_id: `u${id}`,
    players,
    settings: { waiver_budget_used: used },
  }) as SleeperRoster;

describe("aliveFromRosters", () => {
  it("treats an emptied roster as eliminated", () => {
    const { alive, eliminated } = aliveFromRosters([
      roster(1, ["a", "b"]),
      roster(2, []),
      roster(3, ["c"]),
    ]);
    expect(alive).toEqual([1, 3]);
    expect(eliminated).toEqual([2]);
  });

  it("handles a roster with a null player list", () => {
    const { eliminated } = aliveFromRosters([{ roster_id: 9, league_id: "L", owner_id: null, players: null } as SleeperRoster]);
    expect(eliminated).toEqual([9]);
  });
});

describe("choppedSince", () => {
  const previous: RosterSnapshot = {
    week: 4,
    takenAt: "2026-10-01T00:00:00.000Z",
    rosters: { 1: ["a", "b"], 2: ["c", "d"], 3: ["e"] },
    faabUsed: { 1: 0, 2: 0, 3: 0 },
  };

  it("returns the players from a roster that has since been emptied", () => {
    const chopped = choppedSince(previous, [
      roster(1, ["a", "b"]),
      roster(2, []),
      roster(3, ["e"]),
    ]);
    expect(chopped.sort()).toEqual(["c", "d"]);
  });

  it("ignores a player another team has already claimed", () => {
    const chopped = choppedSince(previous, [
      roster(1, ["a", "b", "c"]),
      roster(2, []),
      roster(3, ["e"]),
    ]);
    expect(chopped).toEqual(["d"]);
  });

  it("does not call an ordinary cut a chop", () => {
    // Team 1 dropped "b" but is still alive, so "b" is a free agent, not a chop.
    const chopped = choppedSince(previous, [
      roster(1, ["a"]),
      roster(2, ["c", "d"]),
      roster(3, ["e"]),
    ]);
    expect(chopped).toEqual([]);
  });

  it("returns nothing when there is no previous snapshot to diff", () => {
    expect(choppedSince(null, [roster(1, []), roster(2, ["a"])])).toEqual([]);
  });

  it("returns nothing when a roster was already empty last week", () => {
    const stale: RosterSnapshot = { ...previous, rosters: { 1: ["a"], 2: [] } };
    expect(choppedSince(stale, [roster(1, ["a"]), roster(2, [])])).toEqual([]);
  });
});

describe("snapshotFrom", () => {
  it("records rosters and FAAB spend for the diff next week", () => {
    const snap = snapshotFrom([roster(1, ["a"], 120), roster(2, ["b", "c"], 0)], 6);
    expect(snap.week).toBe(6);
    expect(snap.rosters[1]).toEqual(["a"]);
    expect(snap.faabUsed[1]).toBe(120);
  });
});

describe("winningBidsFrom", () => {
  it("keeps completed waiver claims with a bid", () => {
    const bids = winningBidsFrom(
      [
        { type: "waiver", status: "complete", leg: 3, adds: { "100": 1 }, settings: { waiver_bid: 63 } },
      ],
      3,
    );
    expect(bids).toEqual([{ week: 3, playerId: "100", amount: 63 }]);
  });

  it("ignores failed claims, which are losing bids", () => {
    const bids = winningBidsFrom(
      [{ type: "waiver", status: "failed", leg: 3, adds: { "100": 1 }, settings: { waiver_bid: 200 } }],
      3,
    );
    expect(bids).toEqual([]);
  });

  it("ignores free agent adds, which cost nothing", () => {
    const bids = winningBidsFrom(
      [{ type: "free_agent", status: "complete", leg: 3, adds: { "100": 1 }, settings: null }],
      3,
    );
    expect(bids).toEqual([]);
  });

  it("ignores a zero-dollar claim", () => {
    const bids = winningBidsFrom(
      [{ type: "waiver", status: "complete", leg: 3, adds: { "100": 1 }, settings: { waiver_bid: 0 } }],
      3,
    );
    expect(bids).toEqual([]);
  });

  it("records every player in a multi-player claim", () => {
    const bids = winningBidsFrom(
      [
        {
          type: "waiver",
          status: "complete",
          leg: 5,
          adds: { "100": 1, "101": 1 },
          settings: { waiver_bid: 45 },
        },
      ],
      5,
    );
    expect(bids).toHaveLength(2);
  });
});
