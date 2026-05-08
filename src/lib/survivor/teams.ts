// 32-team NFL registry with baseline 2026 power ratings.
//
// Power rating is a 0-100 composite reflecting offseason consensus:
// roster talent, coaching stability, projected QB play, schedule
// strength. These are starting estimates that update once the 2026
// season simulator and Vegas win totals come online. Use them as a
// floor for "should I use this team" math, not gospel.
//
// Logos resolve via ESPN's CDN, which serves all 32 teams at a stable
// URL pattern so we don't have to ship binary assets.

export interface NFLTeam {
  abbr: string;
  name: string;
  city: string;
  conference: "AFC" | "NFC";
  division: "East" | "North" | "South" | "West";
  // 0-100 baseline power rating (higher is better)
  rating: number;
  // Tier label derived from rating, used for chip colors
  tier: "S" | "A" | "B" | "C" | "D";
  // Notes that surface in the team detail panel
  note?: string;
}

function tierOf(rating: number): NFLTeam["tier"] {
  if (rating >= 88) return "S";
  if (rating >= 78) return "A";
  if (rating >= 68) return "B";
  if (rating >= 58) return "C";
  return "D";
}

function team(
  abbr: string,
  name: string,
  city: string,
  conference: NFLTeam["conference"],
  division: NFLTeam["division"],
  rating: number,
  note?: string,
): NFLTeam {
  return {
    abbr,
    name,
    city,
    conference,
    division,
    rating,
    tier: tierOf(rating),
    note,
  };
}

export const NFL_TEAMS: NFLTeam[] = [
  // AFC East
  team("BUF", "Bills", "Buffalo", "AFC", "East", 90, "Allen, deep WR room. Survivor staple."),
  team("MIA", "Dolphins", "Miami", "AFC", "East", 75, "Speed offense, cold-weather risk."),
  team("NE", "Patriots", "New England", "AFC", "East", 60, "Maye year two, rebuilding."),
  team("NYJ", "Jets", "New York", "AFC", "East", 65, "QB volatility makes them survivor noise."),
  // AFC North
  team("BAL", "Ravens", "Baltimore", "AFC", "North", 89, "Lamar + Henry, top-tier."),
  team("CIN", "Bengals", "Cincinnati", "AFC", "North", 80, "Burrow health is the swing."),
  team("CLE", "Browns", "Cleveland", "AFC", "North", 58, "QB unsettled."),
  team("PIT", "Steelers", "Pittsburgh", "AFC", "North", 72, "Defense + Tomlin floor."),
  // AFC South
  team("HOU", "Texans", "Houston", "AFC", "South", 80, "CJ Stroud + improved line."),
  team("IND", "Colts", "Indianapolis", "AFC", "South", 68, "Wildcard depending on QB."),
  team("JAX", "Jaguars", "Jacksonville", "AFC", "South", 70, "Lawrence rebound spot."),
  team("TEN", "Titans", "Tennessee", "AFC", "South", 60, "Ward rookie year."),
  // AFC West
  team("DEN", "Broncos", "Denver", "AFC", "West", 70, "Nix year two, Payton scheme."),
  team("KC", "Chiefs", "Kansas City", "AFC", "West", 92, "Save for scarce weeks."),
  team("LV", "Raiders", "Las Vegas", "AFC", "West", 60, "Geno + Carroll reset."),
  team("LAC", "Chargers", "Los Angeles", "AFC", "West", 78, "Harbaugh defense, Herbert."),
  // NFC East
  team("DAL", "Cowboys", "Dallas", "NFC", "East", 73, "Boom-bust profile."),
  team("NYG", "Giants", "New York", "NFC", "East", 62, "Dart era beginning."),
  team("PHI", "Eagles", "Philadelphia", "NFC", "East", 90, "Defending champs, premium future-value."),
  team("WAS", "Commanders", "Washington", "NFC", "East", 76, "Daniels year two."),
  // NFC North
  team("CHI", "Bears", "Chicago", "NFC", "North", 70, "Williams + Ben Johnson."),
  team("DET", "Lions", "Detroit", "NFC", "North", 88, "Top tier, premium future-value."),
  team("GB", "Packers", "Green Bay", "NFC", "North", 82, "Love + young core."),
  team("MIN", "Vikings", "Minnesota", "NFC", "North", 78, "JJ McCarthy debut."),
  // NFC South
  team("ATL", "Falcons", "Atlanta", "NFC", "South", 70, "Penix + Bijan."),
  team("CAR", "Panthers", "Carolina", "NFC", "South", 60, "Young still developing."),
  team("NO", "Saints", "New Orleans", "NFC", "South", 62, "Reset year."),
  team("TB", "Buccaneers", "Tampa Bay", "NFC", "South", 74, "Mayfield + Bowles."),
  // NFC West
  team("ARI", "Cardinals", "Arizona", "NFC", "West", 70, "Murray + MHJ chemistry."),
  team("LAR", "Rams", "Los Angeles", "NFC", "West", 80, "Stafford + McVay scheme."),
  team("SF", "49ers", "San Francisco", "NFC", "West", 86, "Health is the question."),
  team("SEA", "Seahawks", "Seattle", "NFC", "West", 70, "Sam Darnold trial."),
];

export function teamByAbbr(abbr: string): NFLTeam | undefined {
  return NFL_TEAMS.find((t) => t.abbr === abbr);
}

// ESPN serves all 32 logos at this pattern. 500px source scales nicely
// down to 32-64px display sizes.
export function logoUrl(abbr: string): string {
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr.toLowerCase()}.png`;
}

export const TIER_TINT: Record<NFLTeam["tier"], string> = {
  S: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  A: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  B: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  C: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  D: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
};

export const TIER_LABEL: Record<NFLTeam["tier"], string> = {
  S: "Elite",
  A: "Strong",
  B: "Mid",
  C: "Below mid",
  D: "Bottom",
};
