import "server-only";
import { redis } from "@/lib/redis/client";
import type { RAGradesByRosterId } from "@/lib/rosteraudit/types";

// RosterAudit publishes a live grade, never a history. When a rank moves there
// is no way after the fact to say when it moved or who moved past you, which is
// exactly the question you ask when you notice you slipped four spots.
//
// So we keep our own log: one entry per league per day, every team's rank in it.
// Snapshots are written opportunistically on page render and by a daily cron,
// and the tile reads back the last date the rank was different.

const KEY = (leagueId: string) => `history:v1:grades:${leagueId}`;

// One entry per day. 240 covers a full season plus the offseason that decides it.
const MAX_ENTRIES = 240;

export interface TeamSnapshot {
  dynastyRank: number;
  powerRank: number;
  totalValue: number;
  trajectoryPct: number;
}

export interface GradeSnapshot {
  /** YYYY-MM-DD, US Eastern, so a day boundary matches the league's day. */
  date: string;
  /** Keyed by roster id. JSON turns the key into a string; treat it as one. */
  teams: Record<string, TeamSnapshot>;
}

const DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function snapshotDate(now: Date = new Date()): string {
  return DATE_FMT.format(now);
}

/** Oldest first. Empty when nothing has been recorded yet. */
export async function getGradeHistory(
  leagueId: string,
): Promise<GradeSnapshot[]> {
  const stored = await redis.get<GradeSnapshot[]>(KEY(leagueId));
  return Array.isArray(stored) ? stored : [];
}

function toSnapshot(grades: RAGradesByRosterId, date: string): GradeSnapshot {
  const teams: Record<string, TeamSnapshot> = {};
  for (const [rosterId, g] of Object.entries(grades)) {
    teams[rosterId] = {
      dynastyRank: g.dynastyRank,
      powerRank: g.powerRank,
      totalValue: g.totalValue,
      trajectoryPct: g.trajectoryPct,
    };
  }
  return { date, teams };
}

/**
 * Log today's grades. Re-running the same day overwrites that day's entry
 * rather than appending, so a page refresh cannot flood the log and the
 * stored value is always the latest reading for that date.
 *
 * Returns false when there was nothing worth writing.
 */
export async function recordGradeSnapshot(
  leagueId: string,
  grades: RAGradesByRosterId,
  now: Date = new Date(),
): Promise<boolean> {
  if (Object.keys(grades).length === 0) return false;

  const history = await getGradeHistory(leagueId);
  const next = withCurrent(history, grades, now);

  await redis.set(KEY(leagueId), next.slice(-MAX_ENTRIES));
  return true;
}

/**
 * The stored history with the grades on screen folded in as today's entry.
 *
 * Pages render before the day's snapshot is written, so reading raw history
 * would compare against yesterday and report a move that already happened.
 */
export function withCurrent(
  history: GradeSnapshot[],
  grades: RAGradesByRosterId,
  now: Date = new Date(),
): GradeSnapshot[] {
  if (Object.keys(grades).length === 0) return history;

  const entry = toSnapshot(grades, snapshotDate(now));
  const last = history[history.length - 1];
  return last?.date === entry.date
    ? [...history.slice(0, -1), entry]
    : [...history, entry];
}

export interface RankMove {
  /** Rank in the most recent snapshot. */
  current: number;
  /** The rank held before the most recent change, and when it last held. */
  previous: number;
  previousDate: string;
  /** Negative means a slide down the board. */
  delta: number;
  /** Roster ids that were behind you then and are ahead of you now. */
  passedBy: string[];
  /** Roster ids you were behind then and are ahead of now. */
  passed: string[];
}

/**
 * How the dynasty rank got where it is: the last snapshot where it read
 * something else, and who swapped places with you in between.
 *
 * Null when there is no history yet, or when the rank has never moved in the
 * window we hold, since "unchanged" is the tile's quiet default.
 */
export function rankMove(
  history: GradeSnapshot[],
  rosterId: number | string,
): RankMove | null {
  const id = String(rosterId);
  const latest = history[history.length - 1];
  const current = latest?.teams[id]?.dynastyRank;
  if (!latest || current === undefined) return null;

  for (let i = history.length - 2; i >= 0; i--) {
    const prior = history[i].teams[id];
    if (!prior || prior.dynastyRank === current) continue;

    const passedBy: string[] = [];
    const passed: string[] = [];
    for (const [otherId, then] of Object.entries(history[i].teams)) {
      if (otherId === id) continue;
      const nowRank = latest.teams[otherId]?.dynastyRank;
      if (nowRank === undefined) continue;
      const wasBehind = then.dynastyRank > prior.dynastyRank;
      const isAhead = nowRank < current;
      if (wasBehind && isAhead) passedBy.push(otherId);
      if (!wasBehind && !isAhead) passed.push(otherId);
    }

    return {
      current,
      previous: prior.dynastyRank,
      previousDate: history[i].date,
      delta: prior.dynastyRank - current,
      passedBy,
      passed,
    };
  }

  return null;
}

/** "Aug 14" for chip copy. Dates are stored as plain YYYY-MM-DD. */
export function formatSnapshotDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}
