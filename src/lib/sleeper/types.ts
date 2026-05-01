// Sleeper API shapes.
// Reference: https://docs.sleeper.com
// Only the fields we expect to use in Phase 1 are typed here. Sparse fields are optional.

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  status?: string;
  sport?: string;
  total_rosters?: number;
  settings?: Record<string, unknown>;
  scoring_settings?: Record<string, number>;
  roster_positions?: string[];
  previous_league_id?: string | null;
  draft_id?: string | null;
}

export interface SleeperUser {
  user_id: string;
  username: string | null;
  display_name?: string;
  avatar?: string | null;
  league_id?: string;
  metadata?: Record<string, string> | null;
  is_owner?: boolean;
}

export interface SleeperRoster {
  roster_id: number;
  league_id: string;
  owner_id: string | null;
  co_owners?: string[] | null;
  players: string[] | null;
  starters?: string[] | null;
  reserve?: string[] | null;
  taxi?: string[] | null;
  settings?: {
    wins?: number;
    losses?: number;
    ties?: number;
    fpts?: number;
    fpts_decimal?: number;
    fpts_against?: number;
    fpts_against_decimal?: number;
    waiver_position?: number;
    waiver_budget_used?: number;
    total_moves?: number;
  };
  metadata?: Record<string, string> | null;
}

export interface SleeperPlayer {
  player_id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string | null;
  team?: string | null;
  age?: number | null;
  status?: string | null;
  fantasy_positions?: string[] | null;
  years_exp?: number | null;
}

export interface SleeperDraft {
  draft_id: string;
  league_id?: string;
  status: string;
  type?: string;
  season?: string;
  start_time?: number | null;
  draft_order?: Record<string, number> | null;
  settings?: {
    rounds?: number;
    teams?: number;
    [k: string]: unknown;
  };
}

export interface SleeperDraftPick {
  pick_no: number;
  round: number;
  draft_slot: number;
  roster_id?: number | null;
  picked_by?: string | null;
  player_id: string;
  metadata?: Record<string, string> | null;
}

export type SleeperPlayersById = Record<string, SleeperPlayer>;
