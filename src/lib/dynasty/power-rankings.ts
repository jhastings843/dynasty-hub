import "server-only";
import type { FCValuesBySleeperId } from "@/lib/fantasycalc/types";
import type {
  SleeperPlayer,
  SleeperPlayersById,
  SleeperRoster,
  SleeperUser,
} from "@/lib/sleeper/types";

export const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"] as const;
export type Position = (typeof POSITIONS)[number];

export type PlayerRow = {
  id: string;
  name: string;
  position: string;
  team: string | null;
  value: number;
  overallRank: number;
  positionRank: number;
};

export type TeamSummary = {
  rosterId: number;
  ownerName: string;
  totalValue: number;
  positionTotals: Record<string, number>;
  positionRanks: Record<string, number>;
  players: PlayerRow[];
};

function ownerName(
  roster: SleeperRoster,
  usersById: Map<string, SleeperUser>,
): string {
  const u = roster.owner_id ? usersById.get(roster.owner_id) : null;
  if (!u) return "Unowned";
  return (
    u.metadata?.team_name || u.display_name || u.username || u.user_id
  );
}

function nameOf(p: SleeperPlayer): string {
  if (p.full_name) return p.full_name;
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.player_id;
}

const KNOWN_POSITIONS = new Set<string>(POSITIONS);

export function computeTeamSummaries(
  rosters: SleeperRoster[],
  users: SleeperUser[],
  players: SleeperPlayersById,
  fcValues: FCValuesBySleeperId,
): TeamSummary[] {
  const usersById = new Map(users.map((u) => [u.user_id, u]));

  const summaries: TeamSummary[] = rosters.map((r) => {
    const playerRows: PlayerRow[] = (r.players ?? [])
      .map((id): PlayerRow | null => {
        const p = players[id];
        const v = fcValues[id];
        if (!p) return null;
        return {
          id,
          name: nameOf(p),
          position: p.position ?? v?.position ?? "FLEX",
          team: p.team ?? null,
          value: v?.value ?? 0,
          overallRank: v?.overallRank ?? 0,
          positionRank: v?.positionRank ?? 0,
        };
      })
      .filter((x): x is PlayerRow => x !== null)
      .sort((a, b) => b.value - a.value);

    const positionTotals: Record<string, number> = {};
    for (const pos of POSITIONS) positionTotals[pos] = 0;
    for (const pl of playerRows) {
      if (KNOWN_POSITIONS.has(pl.position)) {
        positionTotals[pl.position] += pl.value;
      }
    }
    const totalValue = Object.values(positionTotals).reduce((a, b) => a + b, 0);

    return {
      rosterId: r.roster_id,
      ownerName: ownerName(r, usersById),
      totalValue,
      positionTotals,
      positionRanks: {},
      players: playerRows,
    };
  });

  for (const pos of POSITIONS) {
    const sorted = [...summaries].sort(
      (a, b) => (b.positionTotals[pos] ?? 0) - (a.positionTotals[pos] ?? 0),
    );
    sorted.forEach((s, idx) => {
      s.positionRanks[pos] = idx + 1;
    });
  }

  return summaries;
}
