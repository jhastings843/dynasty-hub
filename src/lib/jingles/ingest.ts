import "server-only";
import { redis } from "@/lib/redis/client";
import { getAllPlayers } from "@/lib/sleeper/client";
import { fetchPosts, type JinglesPost } from "./feed";
import { parseMentions, parsePlays, parseRankings, type Scoring } from "./parse";
import { resolveNames, toCandidates } from "./resolve";

// Turning his posts into something the app can use.
//
// The shape deliberately mirrors the hand-curated data.ts, so everything
// downstream (the draft board, the rank chips, the player pages) keeps reading
// what it already reads. This replaces where the rows come from, not what they
// look like.
//
// Rankings are stored per scoring. That is the whole point of the exercise:
// Dah Chopped is a full-PPR league that has been advised off a half-PPR list
// all preseason, and once he posts full PPR the right list is simply there.

const KEY = {
  rankings: (scoring: Scoring) => `jingles:v1:rankings:${scoring}`,
  previous: (scoring: Scoring) => `jingles:v1:rankings:${scoring}:previous`,
  notes: () => `jingles:v1:notes`,
  seen: () => `jingles:v1:seen`,
  lastRun: () => `jingles:v1:last-run`,
};

/** Rankings are stable research, not live data. A month is generous. */
const TTL = 60 * 60 * 24 * 30;

export interface StoredEntry {
  rank: number;
  sleeperId: string;
  name: string;
  position: string;
  positionRank: number;
  team: string;
  tier: string | null;
}

export interface StoredRankings {
  scoring: Scoring;
  title: string;
  url: string;
  postedAt: string;
  ingestedAt: string;
  source: "feed" | "inbox";
  entries: StoredEntry[];
  tiers: string[];
  /** Players in his list the app could not key to Sleeper. Surfaced, not hidden. */
  unresolved: { name: string; position: string; team: string | null; reason: string }[];
}

export interface StoredNote {
  sleeperId: string;
  name: string;
  /** His words, quoted. Never paraphrased into a claim of our own. */
  quote: string;
  adp?: string;
  jinglesRank?: string;
  postTitle: string;
  postUrl: string;
  postedAt: string;
  /** Prose extraction is a suggestion, and the UI has to say so. */
  confidence: "extracted";
}

export interface IngestReport {
  ranAt: string;
  postsSeen: number;
  postsNew: number;
  rankingsIngested: { scoring: Scoring; count: number; unresolved: number; title: string }[];
  notesIngested: number;
  bettingPostsSeen: number;
  skipped: { title: string; reason: string }[];
}

async function readSeen(): Promise<Set<string>> {
  try {
    const ids = await redis.get<string[]>(KEY.seen());
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

async function writeSeen(ids: Set<string>): Promise<void> {
  try {
    // Keep the window bounded; he posts a few times a week.
    await redis.set(KEY.seen(), [...ids].slice(-200), { ex: TTL });
  } catch {
    // A failed write means a post is reprocessed next run, which is harmless:
    // ingestion is idempotent by design.
  }
}

export async function readRankings(scoring: Scoring): Promise<StoredRankings | null> {
  try {
    return (await redis.get<StoredRankings>(KEY.rankings(scoring))) ?? null;
  } catch {
    return null;
  }
}

export async function readNotes(): Promise<StoredNote[]> {
  try {
    return (await redis.get<StoredNote[]>(KEY.notes())) ?? [];
  } catch {
    return [];
  }
}

export async function lastRun(): Promise<IngestReport | null> {
  try {
    return (await redis.get<IngestReport>(KEY.lastRun())) ?? null;
  } catch {
    return null;
  }
}

/**
 * A rankings post is only stored if it parsed cleanly.
 *
 * A list with holes in it is not a shorter list, it is a broken one, and
 * quietly publishing 260 of 300 players would push everyone below the first gap
 * to the wrong rank. Better to keep the previous version and say why.
 */
function rankingsAreSound(rows: number, missing: number[], duplicates: number[]): string | null {
  if (rows < 50) return `only ${rows} rows parsed, which is not a ranking list`;
  if (duplicates.length > 0) return `duplicate ranks: ${duplicates.slice(0, 5).join(", ")}`;
  if (missing.length > rows * 0.02) {
    return `${missing.length} missing ranks, starting at ${missing[0]}`;
  }
  return null;
}

async function ingestRankings(
  post: JinglesPost,
  report: IngestReport,
): Promise<void> {
  const parsed = parseRankings(post.html, post.title);

  if (parsed.scoring === "unknown") {
    report.skipped.push({
      title: post.title,
      reason: "could not tell which scoring this list is for, so it is not safe to apply",
    });
    return;
  }

  const problem = rankingsAreSound(parsed.rows.length, parsed.missingRanks, parsed.duplicateRanks);
  if (problem) {
    report.skipped.push({ title: post.title, reason: problem });
    return;
  }

  const players = await getAllPlayers();
  const { resolved, unresolved, ambiguous } = resolveNames(
    parsed.rows.map((r) => ({ ...r, team: r.team })),
    toCandidates(players),
  );

  const entries: StoredEntry[] = resolved
    .map(({ input, playerId }) => ({
      rank: input.rank,
      sleeperId: playerId,
      name: input.name,
      position: input.position,
      positionRank: input.positionRank,
      team: input.team,
      tier: input.tier,
    }))
    .sort((a, b) => a.rank - b.rank);

  const stored: StoredRankings = {
    scoring: parsed.scoring,
    title: post.title,
    url: post.url,
    postedAt: post.postedAt,
    ingestedAt: new Date().toISOString(),
    source: post.source,
    entries,
    tiers: parsed.tiers,
    unresolved: [
      ...unresolved.map((u) => ({
        name: u.name,
        position: u.position,
        team: u.team,
        reason: "no Sleeper player matched",
      })),
      ...ambiguous.map((a) => ({
        name: a.input.name,
        position: a.input.position,
        team: a.input.team,
        reason: `matched ${a.candidates.length} players: ${a.candidates.join(", ")}`,
      })),
    ],
  };

  try {
    // Keep the version being replaced, so a refresh can show what moved rather
    // than silently swapping three hundred rows.
    const current = await redis.get<StoredRankings>(KEY.rankings(parsed.scoring));
    if (current && current.postedAt !== stored.postedAt) {
      await redis.set(KEY.previous(parsed.scoring), current, { ex: TTL });
    }
    await redis.set(KEY.rankings(parsed.scoring), stored, { ex: TTL });
  } catch (e) {
    report.skipped.push({
      title: post.title,
      reason: `parsed fine but could not be stored: ${e instanceof Error ? e.message : e}`,
    });
    return;
  }

  report.rankingsIngested.push({
    scoring: parsed.scoring,
    count: entries.length,
    unresolved: stored.unresolved.length,
    title: post.title,
  });
}

async function ingestNotes(post: JinglesPost, report: IngestReport): Promise<void> {
  const players = await getAllPlayers();
  const candidates = toCandidates(players);

  // Only look for players the app already knows about from his own rankings,
  // rather than every name in the NFL: scanning prose for two thousand names
  // finds coincidences, not calls.
  const known = new Set<string>();
  for (const scoring of ["half_ppr", "full_ppr", "standard"] as Scoring[]) {
    const stored = await readRankings(scoring);
    for (const e of stored?.entries ?? []) known.add(e.name);
  }
  if (known.size === 0) {
    for (const c of candidates.slice(0, 0)) known.add(c.fullName);
  }

  const mentions = parseMentions(post.html, known);
  if (mentions.length === 0) return;

  const { resolved } = resolveNames(
    mentions.map((m) => ({ name: m.name, position: "", team: null })),
    candidates,
  );
  const idByName = new Map(resolved.map((r) => [r.input.name, r.playerId]));

  const fresh: StoredNote[] = [];
  for (const mention of mentions) {
    const sleeperId = idByName.get(mention.name);
    if (!sleeperId) continue;
    fresh.push({
      sleeperId,
      name: mention.name,
      quote: mention.context,
      ...(mention.adp ? { adp: mention.adp } : {}),
      ...(mention.jinglesRank ? { jinglesRank: mention.jinglesRank } : {}),
      postTitle: post.title,
      postUrl: post.url,
      postedAt: post.postedAt,
      confidence: "extracted",
    });
  }

  if (fresh.length === 0) return;

  try {
    const existing = await readNotes();
    const kept = existing.filter((n) => n.postUrl !== post.url);
    await redis.set(KEY.notes(), [...fresh, ...kept].slice(0, 400), { ex: TTL });
    report.notesIngested += fresh.length;
  } catch {
    report.skipped.push({ title: post.title, reason: "notes could not be stored" });
  }
}

/**
 * Read the publication and fold anything new into the store.
 *
 * Idempotent: a post already seen is skipped, and re-running is safe. Called
 * from the daily snapshot cron rather than a cron of its own, because Vercel
 * Hobby allows two and both are spoken for.
 */
export async function ingestJingles(options: { force?: boolean } = {}): Promise<IngestReport> {
  const report: IngestReport = {
    ranAt: new Date().toISOString(),
    postsSeen: 0,
    postsNew: 0,
    rankingsIngested: [],
    notesIngested: 0,
    bettingPostsSeen: 0,
    skipped: [],
  };

  const posts = await fetchPosts();
  report.postsSeen = posts.length;

  const seen = await readSeen();

  for (const post of posts) {
    if (!options.force && seen.has(post.id)) continue;
    report.postsNew++;

    if (post.truncated) {
      report.skipped.push({
        title: post.title,
        reason:
          post.audience === "only_paid"
            ? "paid post, and the public feed only carries the teaser"
            : "body looks truncated",
      });
      seen.add(post.id);
      continue;
    }

    switch (post.kind) {
      case "rankings":
        await ingestRankings(post, report);
        break;
      case "targets_fades":
      case "deep_dive":
        await ingestNotes(post, report);
        break;
      case "betting":
        // Fantasy Hub has no use for these; signal-bot reads them separately.
        report.bettingPostsSeen += parsePlays(post.html).length > 0 ? 1 : 0;
        break;
      default:
        break;
    }

    seen.add(post.id);
  }

  await writeSeen(seen);
  try {
    await redis.set(KEY.lastRun(), report, { ex: TTL });
  } catch {
    // The report is a convenience, not the work.
  }

  return report;
}
