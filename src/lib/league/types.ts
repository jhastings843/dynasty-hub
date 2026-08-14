// The league layer. Every tool in the app is scoped to one league, and the
// league's type decides what each tool computes and which tools apply at all.
//
// Sleeper is the only automatic source. Guillotine leagues have no Sleeper
// representation, so they are declared manually (see manual.ts).

export type LeagueType = "dynasty" | "redraft" | "guillotine";

export type LeagueStatus =
  | "pre_draft"
  | "drafting"
  | "in_season"
  | "complete";

export interface LeagueProfile {
  id: string;
  name: string;
  season: string;
  type: LeagueType;
  teams: number;
  /** Two starting QB slots, via SUPER_FLEX or a second QB. */
  superflex: boolean;
  /** Extra points per TE reception (bonus_rec_te), 0 when not a TE-premium league. */
  tePremium: number;
  ppr: 0 | 0.5 | 1;
  rosterPositions: string[];
  status: LeagueStatus;
  source: "sleeper" | "manual";
  /** Sleeper's draft id, when the league has one. */
  draftId?: string | null;
}

export const LEAGUE_TYPE_LABEL: Record<LeagueType, string> = {
  dynasty: "Dynasty",
  redraft: "Redraft",
  guillotine: "Guillotine",
};

/** Short description of what the format means, used in the league picker. */
export const LEAGUE_TYPE_BLURB: Record<LeagueType, string> = {
  dynasty: "Rosters carry over. Value players on career arc, not this season.",
  redraft: "One season, fresh draft. Only 2026 production counts.",
  guillotine: "Lowest scorer is eliminated weekly and their roster hits waivers.",
};
