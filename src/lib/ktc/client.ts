import "server-only";
import { cached, invalidate } from "@/lib/redis/cached";
import type { SleeperLeague } from "@/lib/sleeper/types";
import type { KTCByName, KTCFormatKey, KTCValue } from "./types";

const KTC_URL = "https://keeptradecut.com/dynasty-rankings";
const KTC_TTL = 12 * 60 * 60;

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    // Strip diacritics
    .replace(/[̀-ͯ]/g, "")
    // Strip suffixes commonly inconsistent across sources
    .replace(/\s+(jr|sr|ii|iii|iv|v)\.?$/i, "")
    // Strip punctuation
    .replace(/['.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface KTCRawValueBlock {
  value?: number;
  rank?: number;
  positionalRank?: number;
  overallTrend?: number;
  overall7DayTrend?: number;
  positionalTrend?: number;
  tep?: KTCRawValueBlock;
  tepp?: KTCRawValueBlock;
  teppp?: KTCRawValueBlock;
}

interface KTCRawPlayer {
  playerName?: string;
  position?: string;
  team?: string | null;
  rookie?: boolean;
  age?: number | null;
  oneQBValues?: KTCRawValueBlock;
  superflexValues?: KTCRawValueBlock;
}

function pickValueBlock(
  raw: KTCRawPlayer,
  formatKey: KTCFormatKey,
): KTCRawValueBlock | undefined {
  if (formatKey === "1qb") return raw.oneQBValues;
  if (formatKey === "1qb_tep") return raw.oneQBValues?.tep;
  if (formatKey === "sf") return raw.superflexValues;
  return raw.superflexValues?.tep;
}

function key(formatKey: KTCFormatKey): string {
  return `ktc:v1:rankings:${formatKey}`;
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

async function fetchAndSlim(formatKey: KTCFormatKey): Promise<KTCByName> {
  const res = await fetch(KTC_URL, {
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; DynastyHubBot/1.0; +https://dynasty-hub-nine.vercel.app)",
    },
  });
  if (!res.ok) {
    throw new Error(`KTC fetch failed: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const m = html.match(/playersArray\s*=\s*(\[[\s\S]+?\]);/);
  if (!m) throw new Error("KTC: playersArray not found in HTML");
  const arr: KTCRawPlayer[] = JSON.parse(m[1]);

  // First pass: build slim rows for the requested format
  const slim: KTCValue[] = [];
  for (const raw of arr) {
    if (!raw.playerName || !raw.position) continue;
    const block = pickValueBlock(raw, formatKey);
    if (!block) continue;
    slim.push({
      name: raw.playerName,
      normalizedName: normalizeName(raw.playerName),
      position: raw.position,
      team: typeof raw.team === "string" ? raw.team : null,
      rookie: !!raw.rookie,
      age: typeof raw.age === "number" ? raw.age : null,
      value: num(block.value),
      globalRank: num(block.rank),
      positionalRank: num(block.positionalRank),
      rookieRank: 0,
      trend7d: num(block.overall7DayTrend ?? block.overallTrend),
      trend30d: num(block.overallTrend),
    });
  }

  // Second pass: assign rookieRank within rookies sorted by value desc
  const rookies = slim
    .filter((p) => p.rookie && p.value > 0)
    .sort((a, b) => b.value - a.value);
  rookies.forEach((p, idx) => {
    p.rookieRank = idx + 1;
  });

  // Map by normalized name
  const out: KTCByName = {};
  for (const p of slim) out[p.normalizedName] = p;
  return out;
}

export function getKTCValues(
  formatKey: KTCFormatKey,
): Promise<KTCByName> {
  return cached(key(formatKey), KTC_TTL, () => fetchAndSlim(formatKey));
}

export async function revalidateKTC(formatKey: KTCFormatKey): Promise<void> {
  await invalidate(key(formatKey));
}

// Map a Sleeper league config to the closest KTC format key.
export function ktcFormatFromLeague(league: SleeperLeague): KTCFormatKey {
  const positions = league.roster_positions ?? [];
  const isSuperflex =
    positions.includes("SUPER_FLEX") ||
    positions.filter((p) => p === "QB").length >= 2;
  const tep = (league.scoring_settings?.bonus_rec_te ?? 0) > 0;
  if (isSuperflex) return tep ? "sf_tep" : "sf";
  return tep ? "1qb_tep" : "1qb";
}

export type { KTCValue, KTCByName, KTCFormatKey };
