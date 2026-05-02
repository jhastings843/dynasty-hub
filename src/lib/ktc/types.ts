// KeepTradeCut data shapes (community trade-value source).
// Scraped from keeptradecut.com/dynasty-rankings.

export type KTCFormatKey =
  | "1qb"
  | "1qb_tep"
  | "sf"
  | "sf_tep";

export interface KTCValue {
  name: string;
  normalizedName: string;
  position: string;
  team: string | null;
  rookie: boolean;
  age: number | null;
  value: number;
  globalRank: number;
  positionalRank: number;
  rookieRank: number; // rank within rookies only (1-based; 0 if not a rookie)
  trend7d: number;
  trend30d: number;
}

export type KTCByName = Record<string, KTCValue>;
