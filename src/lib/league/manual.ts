import type { LeagueProfile } from "./types";

// Leagues that have no Sleeper representation and so cannot be auto-discovered.
// Guillotine is the case this exists for: Sleeper has no guillotine format, so
// a guillotine league is either hosted elsewhere or run with house rules.
//
// To add one, append an entry here and redeploy. Ids must not collide with a
// Sleeper league id; prefix them with "manual-".
//
// Example:
//   {
//     id: "manual-guillotine-2026",
//     name: "Guillotine 2026",
//     season: "2026",
//     type: "guillotine",
//     teams: 18,
//     superflex: false,
//     tePremium: 0,
//     ppr: 0.5,
//     rosterPositions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX"],
//     status: "pre_draft",
//     source: "manual",
//   }
export const MANUAL_LEAGUES: LeagueProfile[] = [];

export function isManualLeagueId(id: string): boolean {
  return id.startsWith("manual-");
}
