import "server-only";
import { cached, invalidate } from "@/lib/redis/cached";
import type { SleeperLeague } from "@/lib/sleeper/types";
import type { FCFormat, FCValue, FCValuesBySleeperId } from "./types";

const FC_BASE = "https://api.fantasycalc.com";
const TTL = 6 * 60 * 60;

type RawPlayer = {
  id?: number;
  name?: string;
  sleeperId?: string;
  position?: string;
  maybeTeam?: string | null;
};

type RawValue = {
  player?: RawPlayer;
  value?: number;
  overallRank?: number;
  positionRank?: number;
  trend30Day?: number;
};

function key(fmt: FCFormat): string {
  return `fantasycalc:v1:${fmt.isDynasty ? "dyn" : "rdr"}:${fmt.numQbs}qb:${fmt.numTeams}t:ppr${fmt.ppr}`;
}

function urlFor(fmt: FCFormat): string {
  const u = new URL(`${FC_BASE}/values/current`);
  u.searchParams.set("isDynasty", String(fmt.isDynasty));
  u.searchParams.set("numQbs", String(fmt.numQbs));
  u.searchParams.set("numTeams", String(fmt.numTeams));
  u.searchParams.set("ppr", String(fmt.ppr));
  return u.toString();
}

function slim(rows: RawValue[]): FCValuesBySleeperId {
  const out: FCValuesBySleeperId = {};
  for (const r of rows) {
    const p = r.player;
    if (!p?.sleeperId || !p.name || !p.position || typeof p.id !== "number") continue;
    out[p.sleeperId] = {
      sleeperId: p.sleeperId,
      fcId: p.id,
      name: p.name,
      position: p.position,
      team: p.maybeTeam ?? null,
      value: r.value ?? 0,
      overallRank: r.overallRank ?? 0,
      positionRank: r.positionRank ?? 0,
      trend30Day: r.trend30Day ?? 0,
    };
  }
  return out;
}

export function getDynastyValues(fmt: FCFormat): Promise<FCValuesBySleeperId> {
  return cached(key(fmt), TTL, async () => {
    const res = await fetch(urlFor(fmt), { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`FantasyCalc fetch failed: ${res.status} ${res.statusText}`);
    }
    const rows = (await res.json()) as RawValue[];
    return slim(rows);
  });
}

export async function revalidateDynastyValues(fmt: FCFormat): Promise<void> {
  await invalidate(key(fmt));
}

// Derive the FantasyCalc format from a Sleeper league. Defaults to dynasty
// since this app is the dynasty hub; flip isDynasty manually for redraft work.
export function fcFormatFromLeague(league: SleeperLeague): FCFormat {
  const positions = league.roster_positions ?? [];
  const qbCount = positions.filter((p) => p === "QB").length;
  const isSuperflex = positions.includes("SUPER_FLEX") || qbCount >= 2;

  const rec = league.scoring_settings?.rec;
  let ppr: 0 | 0.5 | 1 = 1;
  if (rec === 0) ppr = 0;
  else if (rec === 0.5) ppr = 0.5;

  const numTeams = league.total_rosters ?? 12;

  return {
    isDynasty: true,
    numQbs: isSuperflex ? 2 : 1,
    numTeams,
    ppr,
  };
}

export type { FCValue };

// Apply a TE premium adjustment to FantasyCalc values.
// FC's API doesn't accept TE bonus as a parameter, so we multiply TE values
// by a factor derived from the league's bonus_rec_te scoring setting and
// re-rank overall. This produces values closer to the user's true scoring.
//
// The factor uses 0.4x of the bonus per reception as a coarse approximation:
// - 0.25 TE premium -> +10% TE values
// - 0.5  TE premium -> +20%
// - 1.0  TE premium -> +40%
// Slightly aggressive vs. raw points-per-game scaling because trade values
// reward scarcity and top-end TEs benefit non-linearly.
export function applyTePremium(
  values: FCValuesBySleeperId,
  premiumPpr: number,
): FCValuesBySleeperId {
  if (!premiumPpr || premiumPpr <= 0) return values;
  const factor = 1 + premiumPpr * 0.4;

  const adjusted: FCValue[] = Object.values(values).map((v) =>
    v.position === "TE"
      ? { ...v, value: Math.round(v.value * factor) }
      : { ...v },
  );

  adjusted.sort((a, b) => b.value - a.value);
  adjusted.forEach((v, i) => {
    v.overallRank = i + 1;
  });

  const out: FCValuesBySleeperId = {};
  for (const v of adjusted) out[v.sleeperId] = v;
  return out;
}

export function tePremiumFromLeague(league: SleeperLeague): number {
  const bonus = league.scoring_settings?.bonus_rec_te;
  return typeof bonus === "number" ? bonus : 0;
}
