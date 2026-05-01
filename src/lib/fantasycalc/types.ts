// FantasyCalc API shapes.
// Reference: https://fantasycalc.com / https://api.fantasycalc.com (undocumented but stable JSON)
// Slimmed to fields we actually use.

export interface FCFormat {
  isDynasty: boolean;
  numQbs: 1 | 2;
  numTeams: number;
  ppr: 0 | 0.5 | 1;
}

export interface FCValue {
  sleeperId: string;
  fcId: number;
  name: string;
  position: string;
  team: string | null;
  value: number;
  overallRank: number;
  positionRank: number;
  trend30Day: number;
}

export type FCValuesBySleeperId = Record<string, FCValue>;
