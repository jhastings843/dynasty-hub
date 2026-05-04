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

export interface RAPositionalRoom {
  value: number;
  count: number;
  avgAge: number;
}

export interface RATeamGrade {
  rosterId: number;
  ownerId: string | null;
  powerRank: number;
  dynastyRank: number;
  contenderGrade: string;
  dynastyGrade: string;
  totalValue: number;
  starterValue: number;
  projectedPpg: number;
  trajectoryPct: number;
  yearTotals: Record<string, number>;
  positional: Record<string, RAPositionalRoom>;
  avgStarterAge: number;
  weakness: string | null;
}

export type RAGradesByRosterId = Record<number, RATeamGrade>;

// --- Player profile data ---

export interface RAPlayerProfile {
  player: {
    sleeperId: string;
    name: string;
    position: string;
    team: string | null;
    age: number | null;
    yearsExp: number | null;
    college: string | null;
    height: string | null;
    weight: number | null;
    jersey: number | null;
    photoUrl: string | null;
    status: string | null;
    injuryStatus: string | null;
    buyLow: boolean;
    sellHigh: boolean;
    breakout: boolean;
  };
  value: {
    sf: number;
    oneQb: number;
    tier: number;
    tierLabel: string;
    rankSf: number;
    rank1qb: number;
    rankPosSf: number;
    rankPos1qb: number;
    trend7d: number;
    trend30d: number;
    trend90d: number;
    delta7d: number;
    delta30d: number;
    buyLow: boolean;
    sellHigh: boolean;
    breakout: boolean;
  };
  valueHistory: Array<{
    date: string;
    sf: number;
    oneQb: number;
  }>;
}

export interface RAWeeklyStat {
  week: number;
  fp: number;
  fpp: number;
  opp: string | null;
  cmp?: number;
  att?: number;
  pass?: number;
  ptd?: number;
  int?: number;
  car?: number;
  rush?: number;
  rtd?: number;
  rec?: number;
  tgt?: number;
  recy?: number;
  retd?: number;
  epa?: number;
  repa?: number;
}

export interface RAPlayerStats {
  season: number;
  weekly: RAWeeklyStat[];
}

// --- League history (for GM Scout) ---

export interface RAManagerSummary {
  userId: string;
  displayName: string;
  avatar: string | null;
  seasonsPlayed: number;
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  winPct: number;
  totalPf: number;
  avgPfPerSeason: number;
  championships: number;
  runnerUps: number;
  lastPlaces: number;
  playoffAppearances: number;
  playoffWins: number;
  playoffLosses: number;
  highestWeekScore: number;
  lowestWeekScore: number;
}

export interface RAManagerSeasonRow {
  season: string;
  rosterId: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  finalStanding: number;
  madePlayoffs: boolean;
  wonChampionship: boolean;
  runnerUp: boolean;
  lastPlace: boolean;
}

export interface RAManagerHistory {
  totals: {
    displayName: string;
    seasons: number;
    totalWins: number;
    totalLosses: number;
    championships: number;
    runnerUps: number;
    lastPlaces: number;
    totalPf: number;
    playoffWins: number;
    playoffLosses: number;
    winPct: number;
  };
  seasons: RAManagerSeasonRow[];
}
