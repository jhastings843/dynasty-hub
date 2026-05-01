// RosterAudit API shapes.
// Reference: https://rosteraudit.com/developers/
// Base URL: https://rosteraudit.com/wp-json/ra/v1
// Attribution required if displaying values: link back to rosteraudit.com.

export type RAFormatKey =
  | "sf_ppr"
  | "1qb_ppr"
  | "sf_half"
  | "1qb_half"
  | "sf_ppr_tep"
  | "1qb_ppr_tep";

export interface RAValue {
  sleeperId: string;
  name: string;
  position: string;
  team: string | null;
  age: number | null;
  tier: number | null;
  value: number;
  overallRank: number;
  positionRank: number;
  trend7Day: number;
  trend30Day: number;
  buyLow: boolean;
  sellHigh: boolean;
  breakout: boolean;
  photoUrl: string | null;
}

export type RAValuesBySleeperId = Record<string, RAValue>;

export type PickSlot = "early" | "mid" | "late";

export interface RAPick {
  id: number;
  season: number;
  round: number;
  slot: PickSlot;
  valueSf: number;
  value1qb: number;
  label: string;
  sortOrder: number;
}

export interface RAMover {
  sleeperId: string;
  name: string;
  position: string;
  team: string | null;
  age: number | null;
  tier: number | null;
  valueSf: number;
  trend7Day: number;
  trend30Day: number;
  buyLow: boolean;
  sellHigh: boolean;
  breakout: boolean;
}

export interface RAMovers {
  risers: RAMover[];
  fallers: RAMover[];
}
