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
  /**
   * Points per passing touchdown. Four or six, and the difference is large.
   *
   * Not modelled at all until now, which meant a QB was valued identically in
   * Sunday Scaries (6) and the Half PPR league (4). Every ranking list is built
   * on one assumption or the other, so reading it is the difference between a
   * QB tier being right and being off by a round.
   */
  passTd: number;
  /** Scoring bonuses the league actually pays, zero-valued ones removed. */
  bonuses: Record<string, number>;
  rosterPositions: string[];
  status: LeagueStatus;
  source: "sleeper" | "manual";
  /** Sleeper's draft id, when the league has one. */
  draftId?: string | null;
  /**
   * The FAAB budget, or null when the league does not use one.
   *
   * All four of Jack's leagues have FAAB and the budgets differ by a factor of
   * ten (1000 in two, 100 in the others), so "spend 10%" means very different
   * things and a number quoted without its budget means nothing.
   */
  faab: number | null;
  /** Week trades close. Sleeper uses 99 for "no deadline". */
  tradeDeadlineWeek: number | null;
  /**
   * False when Sleeper handed back a type code the app does not recognise and
   * the format was inferred. Worth surfacing rather than hiding: a league shown
   * as the wrong format quietly shows the wrong tools.
   */
  typeConfident: boolean;
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
