import type { Ownership } from "./types";

// Yahoo uses Pro-Football-Reference style keys, and still calls the Raiders OAK.
const YAHOO_TO_CANON: Record<string, string> = {
  GNB: "GB",
  JAC: "JAX",
  KAN: "KC",
  NOR: "NO",
  NWE: "NE",
  OAK: "LV",
  SFO: "SF",
  TAM: "TB",
};

export function canonYahoo(abbr: string): string {
  return YAHOO_TO_CANON[abbr] ?? abbr;
}

/**
 * Pull the object literal that follows `"<key>":` out of a JSON-in-HTML blob by
 * matching braces while skipping anything inside a string. Yahoo ships the pick
 * distribution as embedded state rather than fetching it, so this reads the
 * blob instead of scraping the rendered table.
 */
export function extractJsonObject(html: string, key: string): string | null {
  const marker = `"${key}":`;
  const at = html.indexOf(marker);
  if (at === -1) return null;
  const start = html.indexOf("{", at + marker.length);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  return null;
}

interface YahooEntry {
  team?: { editorial_team_abbr?: string; pick_percentage?: number };
}

/** week -> canonical abbr -> fraction of the field, 0-1. */
export function parseYahoo(html: string): Map<number, Ownership> {
  const raw = extractJsonObject(html, "pickDistribution");
  if (!raw) return new Map();

  let parsed: Record<string, YahooEntry[]>;
  try {
    parsed = JSON.parse(raw) as Record<string, YahooEntry[]>;
  } catch {
    return new Map();
  }

  const out = new Map<number, Ownership>();
  for (const [weekKey, entries] of Object.entries(parsed)) {
    const week = Number(weekKey);
    if (!Number.isFinite(week) || week < 1 || week > 18) continue;
    const picks: Ownership = {};
    for (const e of entries ?? []) {
      const abbr = e.team?.editorial_team_abbr;
      const pct = e.team?.pick_percentage;
      if (!abbr || typeof pct !== "number") continue;
      picks[canonYahoo(abbr)] = pct / 100;
    }
    if (Object.keys(picks).length > 0) out.set(week, picks);
  }
  return out;
}

/**
 * Spread whatever probability mass the snapshot is missing across the teams
 * playing this week, so the survival maths sees a distribution that sums to 1.
 * A snapshot that covers nothing degrades to a uniform field rather than to a
 * divide by zero.
 */
export function normalizeOwnership(
  picks: Ownership,
  teamsPlaying: string[],
): Ownership {
  const out: Ownership = {};
  if (teamsPlaying.length === 0) return out;

  let known = 0;
  for (const t of teamsPlaying) {
    const v = picks[t];
    if (typeof v === "number" && v > 0) {
      out[t] = v;
      known += v;
    }
  }

  // A snapshot that accounts for less than half the field is not a partial
  // distribution, it is a broken fetch. Spreading the missing 60% across the
  // three teams nobody listed would invent 20% ownership per team and quietly
  // poison every leverage number downstream, so this degrades to an explicitly
  // uniform field instead. Call ownershipCoverage to detect that case.
  if (known < 0.5) {
    const even = 1 / teamsPlaying.length;
    for (const t of teamsPlaying) out[t] = even;
    return out;
  }

  const leftover = Math.max(0, 1 - known);
  const unlisted = teamsPlaying.filter((t) => !(t in out));
  if (unlisted.length > 0 && leftover > 0) {
    const share = leftover / unlisted.length;
    for (const t of unlisted) out[t] = share;
  } else {
    // Everything is listed but the total drifts off 1. Rescale.
    for (const t of Object.keys(out)) out[t] = out[t] / known;
  }
  for (const t of teamsPlaying) out[t] ??= 0;
  return out;
}

/**
 * How much of the field the snapshot actually accounts for, 0-1. Anything well
 * below 1 means the leverage maths is running on a guess.
 */
export function ownershipCoverage(
  picks: Ownership,
  teamsPlaying: string[],
): number {
  let known = 0;
  for (const t of teamsPlaying) {
    const v = picks[t];
    if (typeof v === "number" && v > 0) known += v;
  }
  return Math.min(1, known);
}
