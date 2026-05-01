// Pure logic for suggesting trade fits between two teams based on
// positional surplus / deficit. Safe to import from client components.

import type { PlayerRow, TeamSummary } from "./power-rankings";

export interface TradeFit {
  position: string;
  side: "send" | "receive";
  yourRank: number;
  theirRank: number;
  suggested: PlayerRow[];
}

const TRADE_POSITIONS = ["QB", "RB", "WR", "TE"] as const;

export function suggestTradeFits(
  myTeam: TeamSummary,
  partner: TeamSummary,
  totalTeams: number,
): TradeFit[] {
  const fits: TradeFit[] = [];
  const strongThreshold = 4;
  const weakThreshold = totalTeams - 3;

  for (const pos of TRADE_POSITIONS) {
    const myRank = myTeam.positionRanks[pos] ?? 99;
    const theirRank = partner.positionRanks[pos] ?? 99;

    if (myRank <= strongThreshold && theirRank >= weakThreshold) {
      const candidates = myTeam.players
        .filter((p) => p.position === pos)
        .sort((a, b) => a.value - b.value);
      const lowest = candidates.slice(1, 4);
      if (lowest.length > 0) {
        fits.push({
          position: pos,
          side: "send",
          yourRank: myRank,
          theirRank,
          suggested: lowest,
        });
      }
    }

    if (theirRank <= strongThreshold && myRank >= weakThreshold) {
      const candidates = partner.players
        .filter((p) => p.position === pos)
        .sort((a, b) => a.value - b.value);
      const lowest = candidates.slice(1, 4);
      if (lowest.length > 0) {
        fits.push({
          position: pos,
          side: "receive",
          yourRank: myRank,
          theirRank,
          suggested: lowest,
        });
      }
    }
  }

  return fits;
}
