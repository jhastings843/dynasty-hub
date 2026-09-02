import "server-only";
import { redis } from "@/lib/redis/client";

// One guide per league per week, however many times the route is called.
//
// Without this, two things send duplicates. Vercel retries a cron run that
// fails or times out, and the send happens near the end of the handler, so a
// retry after a slow Sleeper response means a second identical email. And any
// manual trigger repeats whatever the last one said. Two identical emails
// arrived 44 seconds apart during testing, which is the whole argument.
//
// A weekly email is idempotent by nature: the guide for week 6 is the guide for
// week 6. So the week is the key, and a second call for the same week is a
// no-op rather than a second copy.

/** Long enough to cover a week, short enough that a season does not accumulate. */
const TTL = 60 * 60 * 24 * 10;

const key = (leagueId: string, season: string, week: number) =>
  `guillotine:v1:sent:${leagueId}:${season}:w${week}`;

export interface SendRecord {
  sentAt: string;
  subject: string;
  messageId?: string;
}

export async function alreadySent(
  leagueId: string,
  season: string,
  week: number,
): Promise<SendRecord | null> {
  try {
    return (await redis.get<SendRecord>(key(leagueId, season, week))) ?? null;
  } catch {
    // A cache read that fails should not block the week's guide. Erring toward
    // sending is right here: a missed guide costs a week of advice, a duplicate
    // costs an extra email.
    return null;
  }
}

export async function recordSent(
  leagueId: string,
  season: string,
  week: number,
  record: SendRecord,
): Promise<void> {
  try {
    await redis.set(key(leagueId, season, week), record, { ex: TTL });
  } catch (e) {
    console.warn(`[guillotine] send log write failed: ${e instanceof Error ? e.message : e}`);
  }
}

export async function clearSent(
  leagueId: string,
  season: string,
  week: number,
): Promise<void> {
  try {
    await redis.del(key(leagueId, season, week));
  } catch {
    // Nothing to do: the caller is asking to resend, and a stale lock that
    // cannot be cleared is reported by the resend path itself.
  }
}
