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
