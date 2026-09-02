// Reading a chop out of Sleeper's roster feed.
//
// Sleeper runs the elimination but does not liquidate the chopped roster: the
// commissioner force-drops those players, and only then do they reach waivers.
// So "who was chopped" is not a field to read, it is a change to notice, and
// noticing changes needs a memory. Each run stores who was rostered where, and
// the next run diffs against it.
//
// The diff is also what makes the whole thing self-healing. Nothing has to be
// configured, nothing has to be told that a chop happened, and a week the cron
// misses costs one week of attribution rather than corrupting the model.
//
// Everything here is pure so it can be tested without a network or a cache.

import type { SleeperRoster } from "@/lib/sleeper/types";

export interface RosterSnapshot {
  week: number;
  takenAt: string;
  /** roster_id to the player ids it held. */
  rosters: Record<number, string[]>;
  faabUsed: Record<number, number>;
}

/**
 * A roster with no players has been force-dropped, which in this format means
 * the team was chopped. Before the draft every roster is empty, so the caller
 * must not ask this question until the league has drafted.
 */
export function aliveFromRosters(rosters: SleeperRoster[]): {
  alive: number[];
  eliminated: number[];
} {
  const alive: number[] = [];
  const eliminated: number[] = [];
  for (const roster of rosters) {
    if ((roster.players?.length ?? 0) > 0) alive.push(roster.roster_id);
    else eliminated.push(roster.roster_id);
  }
  return { alive, eliminated };
}

export function snapshotFrom(rosters: SleeperRoster[], week: number): RosterSnapshot {
  const byRoster: Record<number, string[]> = {};
  const faabUsed: Record<number, number> = {};
  for (const roster of rosters) {
    byRoster[roster.roster_id] = [...(roster.players ?? [])];
    faabUsed[roster.roster_id] = roster.settings?.waiver_budget_used ?? 0;
  }
  return {
    week,
    takenAt: new Date().toISOString(),
    rosters: byRoster,
    faabUsed,
  };
}

/**
 * Players who were on a roster last week and are on no roster now, limited to
 * rosters that have since been emptied.
 *
 * Restricting to emptied rosters is what separates a chop from an ordinary
 * drop. A surviving team cutting a player also frees him, and he is worth
 * bidding on, but he is not the week's event and calling him one would put the
 * wrong name at the top of the card.
 */
export function choppedSince(
  previous: RosterSnapshot | null,
  current: SleeperRoster[],
): string[] {
  if (!previous) return [];
  const { eliminated } = aliveFromRosters(current);
  const emptiedNow = new Set(eliminated);

  const stillRostered = new Set<string>();
  for (const roster of current) {
    for (const id of roster.players ?? []) stillRostered.add(id);
  }

  const chopped: string[] = [];
  for (const [rosterIdRaw, players] of Object.entries(previous.rosters)) {
    const rosterId = Number(rosterIdRaw);
    if (!emptiedNow.has(rosterId)) continue;
    if (players.length === 0) continue;
    for (const id of players) {
      if (!stillRostered.has(id)) chopped.push(id);
    }
  }
  return chopped;
}

interface RawTransaction {
  type?: string;
  status?: string;
  leg?: number;
  adds?: Record<string, number> | null;
  settings?: { waiver_bid?: number } | null;
}

export interface WinningBid {
  week: number;
  playerId: string;
  amount: number;
}

export function winningBidsFrom(transactions: RawTransaction[], week: number): WinningBid[] {
  const bids: WinningBid[] = [];
  for (const tx of transactions) {
    if (tx.type !== "waiver" || tx.status !== "complete") continue;
    const amount = tx.settings?.waiver_bid;
    if (typeof amount !== "number" || amount <= 0) continue;
    for (const playerId of Object.keys(tx.adds ?? {})) {
      bids.push({ week: tx.leg ?? week, playerId, amount });
    }
  }
  return bids;
}
