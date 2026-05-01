import "server-only";
import { cached, invalidate } from "@/lib/redis/cached";
import type { SleeperLeague } from "@/lib/sleeper/types";
import type {
  PickSlot,
  RAFormatKey,
  RAMover,
  RAMovers,
  RAPick,
  RAValue,
  RAValuesBySleeperId,
} from "./types";

const RA_BASE = "https://rosteraudit.com/wp-json/ra/v1";
const TTL = 6 * 60 * 60;

// Sentinel value the API returns when trend data is unavailable
// (looks like int16 max — should be treated as 0).
const TREND_SENTINEL = 32767;

type RawPlayer = {
  sleeper_id?: string;
  name?: string;
  position?: string;
  team?: string | null;
  age?: string | number | null;
  tier?: string | number | null;
  value?: number;
  rank_overall?: number;
  rank_pos?: number;
  trend_7d?: string | number | null;
  trend_30d?: string | number | null;
  buy_low?: string | number | null;
  sell_high?: string | number | null;
  breakout?: string | number | null;
  photo_url?: string | null;
};

type RankingsResponse = {
  players?: RawPlayer[];
  total?: number;
  page?: number;
  per_page?: number;
  total_pages?: number;
  attribution?: string;
  attribution_url?: string;
};

function key(formatKey: RAFormatKey): string {
  return `rosteraudit:v1:rankings:${formatKey}`;
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function trendNum(v: unknown): number {
  const n = num(v);
  return Math.abs(n) >= TREND_SENTINEL ? 0 : n;
}

function flag(v: unknown): boolean {
  return num(v) > 0;
}

function slim(rows: RawPlayer[]): RAValuesBySleeperId {
  const out: RAValuesBySleeperId = {};
  for (const r of rows) {
    if (!r.sleeper_id || !r.name || !r.position) continue;
    out[r.sleeper_id] = {
      sleeperId: r.sleeper_id,
      name: r.name,
      position: r.position,
      team: typeof r.team === "string" ? r.team : null,
      age: r.age != null ? num(r.age) : null,
      tier: r.tier != null ? num(r.tier) : null,
      value: num(r.value),
      overallRank: num(r.rank_overall),
      positionRank: num(r.rank_pos),
      trend7Day: trendNum(r.trend_7d),
      trend30Day: trendNum(r.trend_30d),
      buyLow: flag(r.buy_low),
      sellHigh: flag(r.sell_high),
      breakout: flag(r.breakout),
      photoUrl: typeof r.photo_url === "string" ? r.photo_url : null,
    };
  }
  return out;
}

async function raFetch<T>(path: string): Promise<T> {
  const apiKey = process.env.ROSTERAUDIT_API_KEY;
  const headers = new Headers();
  if (apiKey) headers.set("X-RA-Key", apiKey);
  const res = await fetch(`${RA_BASE}${path}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `RosterAudit request failed: ${res.status} ${res.statusText} (${path})`,
    );
  }
  return (await res.json()) as T;
}

// Fetch all rankings (~500 players) for a given format. Cached 6h in Upstash.
export function getValues(
  formatKey: RAFormatKey,
): Promise<RAValuesBySleeperId> {
  return cached(key(formatKey), TTL, async () => {
    const all: RawPlayer[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const params = new URLSearchParams({
        format_key: formatKey,
        position: "all",
        per_page: "100",
        page: String(page),
      });
      const res = await raFetch<RankingsResponse>(
        `/rankings?${params.toString()}`,
      );
      const rows = res.players ?? [];
      all.push(...rows);
      totalPages = res.total_pages ?? 1;
      page += 1;
      if (page > 10) break; // safety stop
    } while (page <= totalPages);
    return slim(all);
  });
}

export async function revalidateValues(formatKey: RAFormatKey): Promise<void> {
  await invalidate(key(formatKey));
}

// Derive the RosterAudit format_key from a Sleeper league.
export function formatKeyFromLeague(league: SleeperLeague): RAFormatKey {
  const positions = league.roster_positions ?? [];
  const qbCount = positions.filter((p) => p === "QB").length;
  const isSuperflex = positions.includes("SUPER_FLEX") || qbCount >= 2;
  const tep = (league.scoring_settings?.bonus_rec_te ?? 0) > 0;
  const rec = league.scoring_settings?.rec ?? 1;
  const halfPpr = rec > 0 && rec < 1;

  if (isSuperflex) {
    if (tep) return "sf_ppr_tep";
    return halfPpr ? "sf_half" : "sf_ppr";
  }
  if (tep) return "1qb_ppr_tep";
  return halfPpr ? "1qb_half" : "1qb_ppr";
}

// --- Picks ---

const PICKS_KEY = "rosteraudit:v1:picks";
const PICKS_TTL = 24 * 60 * 60;

type RawPick = {
  id?: number;
  pick_season?: number;
  pick_round?: number;
  pick_slot?: string;
  val_sf?: number;
  val_1qb?: number;
  label?: string;
  sort_order?: number;
};

type PicksResponse = { picks?: RawPick[] };

function slimPicks(rows: RawPick[]): RAPick[] {
  const out: RAPick[] = [];
  for (const r of rows) {
    if (
      typeof r.id !== "number" ||
      typeof r.pick_season !== "number" ||
      typeof r.pick_round !== "number" ||
      !r.pick_slot ||
      !r.label
    ) {
      continue;
    }
    out.push({
      id: r.id,
      season: r.pick_season,
      round: r.pick_round,
      slot: r.pick_slot as PickSlot,
      valueSf: num(r.val_sf),
      value1qb: num(r.val_1qb),
      label: r.label,
      sortOrder: num(r.sort_order),
    });
  }
  out.sort((a, b) => a.sortOrder - b.sortOrder);
  return out;
}

export function getPicks(): Promise<RAPick[]> {
  return cached(PICKS_KEY, PICKS_TTL, async () => {
    const res = await raFetch<PicksResponse>("/picks");
    return slimPicks(res.picks ?? []);
  });
}

// --- Movers ---

const MOVERS_KEY = (limit: number) => `rosteraudit:v1:movers:${limit}`;
const MOVERS_TTL = 60 * 60;

type RawMover = {
  sleeper_id?: string;
  name?: string;
  position?: string;
  team?: string | null;
  age?: string | number | null;
  tier?: string | number | null;
  val_sf?: string | number | null;
  trend_7d?: string | number | null;
  trend_30d?: string | number | null;
  buy_low?: string | number | null;
  sell_high?: string | number | null;
  breakout?: string | number | null;
};

type MoversResponse = { risers?: RawMover[]; fallers?: RawMover[] };

function slimMover(r: RawMover): RAMover | null {
  if (!r.sleeper_id || !r.name || !r.position) return null;
  return {
    sleeperId: r.sleeper_id,
    name: r.name,
    position: r.position,
    team: typeof r.team === "string" ? r.team : null,
    age: r.age != null ? num(r.age) : null,
    tier: r.tier != null ? num(r.tier) : null,
    valueSf: num(r.val_sf),
    trend7Day: trendNum(r.trend_7d),
    trend30Day: trendNum(r.trend_30d),
    buyLow: flag(r.buy_low),
    sellHigh: flag(r.sell_high),
    breakout: flag(r.breakout),
  };
}

export function getMovers(limit = 30): Promise<RAMovers> {
  return cached(MOVERS_KEY(limit), MOVERS_TTL, async () => {
    const res = await raFetch<MoversResponse>(
      `/movers?position=all&limit=${limit}`,
    );
    const risers = (res.risers ?? [])
      .map(slimMover)
      .filter((x): x is RAMover => x !== null);
    const fallers = (res.fallers ?? [])
      .map(slimMover)
      .filter((x): x is RAMover => x !== null);
    return { risers, fallers };
  });
}

export type {
  RAValue,
  RAValuesBySleeperId,
  RAFormatKey,
  RAPick,
  RAMover,
  RAMovers,
  PickSlot,
};
