// The live draft board: what is still there, and what you should take.
//
// This was assembled inside RedraftDraft.tsx, which meant it existed only on a
// page. Atlas could not read it, so during the one hour of the year it matters
// most, the answer to "who do I take" was on a laptop Jack was not looking at.
// The spec calls this Phase 5 and it has a season deadline.
//
// Pulled out here so the page and the API compute the same board from the same
// inputs. Two implementations of "best available" that drift is worse than not
// having the second one: the phone would quietly disagree with the screen.
//
// Pure. Everything it needs is passed in, so it can be tested without Sleeper.

import { LAB_300, type Lab300Entry } from "@/lib/jingles/data";
import {
  attachRankings,
  boardRank,
  buildBoard,
  neededPositions,
  openSlots,
  startablePositions,
  type BoardPlayer,
  type RedraftRecommendation,
  type SlotNeed,
} from "./draft-board";

export interface LiveBoardInput {
  /** Roster slots the league starts, Sleeper's roster_positions. */
  rosterPositions: string[];
  /** Every player id already taken in this draft. */
  draftedIds: Iterable<string>;
  /** Player ids that are already Jack's: his roster plus his picks so far. */
  myIds: Iterable<string>;
  /** Position by player id, for working out what he has. */
  positionById: (id: string) => string | undefined;
  /** The value source, keyed by Sleeper id. */
  values: Record<
    string,
    { sleeperId: string; name: string; position: string; team: string | null; value: number; overallRank: number; positionRank: number }
  >;
  /** How many recommendations to build. */
  limit?: number;
}

export interface LiveBoard {
  needs: SlotNeed[];
  /** Slots this board can never fill, because no source covers the position. */
  uncoveredSlots: SlotNeed[];
  board: RedraftRecommendation[];
  bestAvailable: BoardPlayer[];
  /**
   * Everyone still on the table.
   *
   * The page needs the whole pool, not just the top of it: it projects every
   * remaining pick against it and splits the Jingles calls into who is still
   * there and who to let go. The API only reports its size.
   */
  pool: BoardPlayer[];
}

const labPosition = (e: Lab300Entry) => (e.position === "DST" ? "DEF" : e.position);

export function buildLiveBoard(input: LiveBoardInput): LiveBoard {
  const drafted = new Set(input.draftedIds);
  const mine = new Set(input.myIds);

  const myPositions = [...mine]
    .map(input.positionById)
    .filter((p): p is string => Boolean(p));

  const needs = openSlots(input.rosterPositions, myPositions);
  // Only positions this league starts. A defence in a league with no slot for
  // one is not a pick, it is noise on the board.
  const startable = startablePositions(input.rosterPositions);
  const taken = (id: string) => drafted.has(id) || mine.has(id);

  // Two sources, unioned: the value source for values, and the Lab 300 for the
  // ranking plus the defences and kickers the value source does not cover.
  const byId = new Map<string, BoardPlayer>();
  for (const v of Object.values(input.values)) {
    if (v.value <= 0 || taken(v.sleeperId) || !startable.has(v.position)) continue;
    byId.set(v.sleeperId, attachRankings({ ...v, id: v.sleeperId }));
  }
  for (const e of LAB_300) {
    const position = labPosition(e);
    if (taken(e.sleeperId) || byId.has(e.sleeperId) || !startable.has(position)) continue;
    byId.set(
      e.sleeperId,
      attachRankings({
        id: e.sleeperId,
        name: e.name,
        position,
        team: e.team,
        value: 0,
        overallRank: 0,
        positionRank: e.positionRank,
      }),
    );
  }

  const pool = [...byId.values()];
  const covered = new Set(pool.map((p) => p.position));
  const uncoveredSlots = needs.filter((n) => !n.eligible.some((pos) => covered.has(pos)));

  return {
    needs,
    uncoveredSlots,
    board: buildBoard(pool, needs, input.limit ?? 5),
    bestAvailable: [...pool].sort((a, b) => boardRank(a) - boardRank(b)).slice(0, 25),
    pool,
  };
}

/** The positions still unfilled, as plain words. For saying out loud. */
export function neededPositionList(needs: SlotNeed[]): string[] {
  return [...neededPositions(needs)].sort();
}
