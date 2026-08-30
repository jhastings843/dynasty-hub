// Jingles Labs research, curated from r/JoeInglesOfficial.
//
// Source: https://www.reddit.com/r/JoeInglesOfficial/ (u/JoeInglesOfficial),
// also @JinglesLabs on TikTok, X, and Instagram. Half-PPR redraft focus, which
// matches the "2026 Half PPR" league exactly.
//
// What he publishes: the Lab 300, a tiered top-300 half-PPR ranking (shipped
// 2026-08-16, updated through the preseason); players he is high on and low on
// relative to ADP; single-player deep dives that end in a league-winner verdict
// ("Lab Certified"); and occasional tier lists. He posts frequently, so this
// file is a snapshot, not a feed.
//
// This file is maintained by hand, on purpose. There is no production path to
// Reddit (the API blocks unauthenticated reads), and his posts are prose with
// inconsistent formats: some calls give exact ranks ("ADP WR23 / 51 Overall ->
// My Rank WR34 / 73 Overall"), others give ranges ("Top 20 WR / Top 35
// overall"). Parsing that automatically would be fragile and would strip the
// attribution. Every entry carries the post it came from.
//
// To update: read the new post, add entries, bump LAST_UPDATED.
//
// His research is his. It is credited and linked wherever it renders, and it
// annotates values rather than overriding them.

export type JinglesVerdict = "target" | "fade" | "league_winner";

export interface JinglesCall {
  /** Sleeper player id, resolved at curation time. */
  sleeperId: string;
  player: string;
  position: string;
  team: string | null;
  /** His stated ADP for the player, verbatim. Absent on deep dives. */
  adp?: string;
  /**
   * His own rank for this player, verbatim, and only for players he has
   * explicitly ranked against ADP. Sometimes a range rather than a number.
   * Deep dives carry a verdict instead of a rank.
   */
  jinglesRank?: string;
  verdict: JinglesVerdict;
  /** One line of his reasoning. */
  note: string;
  sourceUrl: string;
  postedAt: string;
}

export interface JinglesTier {
  tier: string;
  label: string;
  players: { rank: number; name: string; sleeperId: string | null }[];
}

/**
 * The formats this research applies to. Jack's rule, stated twice.
 *
 * Everything Jingles publishes is half-PPR REDRAFT: a ranking for drafting a
 * team you keep for one season. Guillotine drafts the same way, so it counts
 * too. None of it is a dynasty opinion, because a dynasty value is a bet on the
 * next three years and a redraft rank is a bet on the next four months. Trading
 * on these in dynasty would be reading age and contract out of a number that
 * never contained either.
 *
 * One constant rather than a `!== "dynasty"` written into each place that shows
 * it: those drift, and the one that drifts is always the new one.
 */
export const LAB_300_APPLIES_TO = ["redraft", "guillotine"] as const;

/** Does this research apply to a league of this type? Unknown type means no. */
export function jinglesAppliesTo(type: string | undefined | null): boolean {
  return typeof type === "string" && (LAB_300_APPLIES_TO as readonly string[]).includes(type);
}

export const LAST_UPDATED = "2026-08-30";

// ---------------------------------------------------------------------------
// The Lab 300
// ---------------------------------------------------------------------------
//
// His top-300 half-PPR ranking, posted 2026-08-16 as a Google Drive PDF:
// https://www.reddit.com/r/JoeInglesOfficial/comments/1vqdslf/the_lab_300_halfppr_rankings_81626/
//
// Version 2.0, 2026-08-30, replacing 1.0 from 8/16. He updates through the
// preseason as depth charts, injuries and camp battles resolve, so re-pull when
// he posts a new one; LAB_300_VERSION is what the UI shows.
//
// What moved between 1.0 and 2.0: 279 of the 300 changed rank, 5 came in and 5
// went out. Tee Higgins is gone from the list entirely, which is the one worth
// looking at rather than taking on trust. The old "Final 50" tier is gone too,
// so this is 14 tiers rather than 15.
//
// Two things in his 2.0 PDF are wrong and are corrected here, and only these
// two. Rhamondre Stevenson is listed on "NET", which is not a team, read as NE.
// The Bears defence is listed on DET, which cannot be right for a defence, read
// as CHI. Everything else, including team moves that look surprising, is his
// call and is left exactly as he published it.
//
// Unlike FantasyCalc's redraft set, this covers team defenses and kickers, and
// it is built for half-PPR specifically, which is this league's scoring.
//
// Tiers map to draft rounds, which is the most actionable part: "Tier 4: 3rd
// Round" tells you where he expects a player to go.

export const LAB_300_VERSION = "2.0";
export const LAB_300_POSTED = "2026-08-30";
export const LAB_300_URL =
  "https://drive.google.com/file/d/1EQKTBP7lN7VzefumLVzk3VFE3Q8g1tRQ/view";

export interface Lab300Tier {
  tier: string;
  /** The draft round he expects this tier to go in. */
  label: string;
}

export const LAB_300_TIERS: Lab300Tier[] = [
  { tier: "Tier 1", label: "Top 4" },
  { tier: "Tier 2", label: "1st Round" },
  { tier: "Tier 3", label: "2nd Round" },
  { tier: "Tier 4", label: "3rd Round" },
  { tier: "Tier 5", label: "4th/5th Round" },
  { tier: "Tier 6", label: "5th/6th Round" },
  { tier: "Tier 7", label: "6th/7th Round" },
  { tier: "Tier 8", label: "7th/8th Round" },
  { tier: "Tier 9", label: "9th/10th Round" },
  { tier: "Tier 10", label: "11th/12th Round" },
  { tier: "Tier 11", label: "13th/14th/15th Round" },
  { tier: "Tier 12", label: "15th/16th/17th Round" },
  { tier: "Tier 13", label: "Defense & Kickers" },
  { tier: "Tier 14", label: "Last Round Flyers" },
];

export interface Lab300Entry {
  rank: number;
  sleeperId: string;
  name: string;
  /** His label. "DST" here is Sleeper's "DEF". */
  position: string;
  positionRank: number;
  team: string;
  /** Index into LAB_300_TIERS. */
  tierIndex: number;
}

// rank, sleeperId, name, position, positionRank, team, tierIndex
type RawRow = [number, string, string, string, number, string, number];

const LAB_300_RAW: RawRow[] = [
  [1, "9221", "Jahmyr Gibbs", "RB", 1, "DET", 0],
  [2, "9509", "Bijan Robinson", "RB", 2, "ATL", 0],
  [3, "9493", "Puka Nacua", "WR", 1, "LAR", 0],
  [4, "7564", "Ja'Marr Chase", "WR", 2, "CIN", 0],
  [5, "9488", "Jaxon Smith-Njigba", "WR", 3, "SEA", 1],
  [6, "8138", "James Cook III", "RB", 3, "BUF", 1],
  [7, "7547", "Amon-Ra St. Brown", "WR", 4, "DET", 1],
  [8, "4034", "Christian McCaffrey", "RB", 4, "SF", 1],
  [9, "6813", "Jonathan Taylor", "RB", 5, "IND", 1],
  [10, "8151", "Kenneth Walker III", "RB", 6, "KC", 1],
  [11, "9224", "Chase Brown", "RB", 7, "CIN", 1],
  [12, "6786", "CeeDee Lamb", "WR", 5, "DAL", 2],
  [13, "6794", "Justin Jefferson", "WR", 6, "MIN", 2],
  [14, "4866", "Saquon Barkley", "RB", 8, "PHI", 2],
  [15, "9226", "De'Von Achane", "RB", 9, "MIA", 2],
  [16, "12507", "Omarion Hampton", "RB", 10, "LAC", 2],
  [17, "8112", "Drake London", "WR", 7, "ATL", 2],
  [18, "11604", "Brock Bowers", "TE", 1, "LV", 2],
  [19, "7569", "Nico Collins", "WR", 8, "HOU", 2],
  [20, "11632", "Malik Nabers", "WR", 9, "NYG", 2],
  [21, "5859", "A.J. Brown", "WR", 10, "NE", 2],
  [22, "8137", "George Pickens", "WR", 11, "DAL", 2],
  [23, "12527", "Ashton Jeanty", "RB", 11, "LV", 3],
  [24, "3198", "Derrick Henry", "RB", 12, "BAL", 3],
  [25, "13287", "Jeremiyah Love", "RB", 13, "ARI", 3],
  [26, "8155", "Breece Hall", "RB", 14, "NYJ", 3],
  [27, "8144", "Chris Olave", "WR", 12, "NO", 3],
  [28, "7525", "DeVonta Smith", "WR", 13, "PHI", 3],
  [29, "7526", "Jaylen Waddle", "WR", 14, "DEN", 3],
  [30, "9997", "Zay Flowers", "WR", 15, "BAL", 3],
  [31, "10229", "Rashee Rice", "WR", 16, "KC", 3],
  [32, "4984", "Josh Allen", "QB", 1, "BUF", 3],
  [33, "8130", "Trey McBride", "TE", 2, "ARI", 3],
  [34, "12517", "Colston Loveland", "TE", 3, "CHI", 3],
  [35, "12519", "Luther Burden III", "WR", 17, "CHI", 3],
  [36, "8150", "Kyren Williams", "RB", 15, "LAR", 4],
  [37, "7588", "Javonte Williams", "RB", 16, "DAL", 4],
  [38, "6790", "D'Andre Swift", "RB", 17, "CHI", 4],
  [39, "7543", "Travis Etienne Jr.", "RB", 18, "NO", 4],
  [40, "12481", "Cam Skattebo", "RB", 19, "NYG", 4],
  [41, "8146", "Garrett Wilson", "WR", 18, "NYJ", 4],
  [42, "11635", "Ladd McConkey", "WR", 19, "LAC", 4],
  [43, "12526", "Tetairoa McMillan", "WR", 20, "CAR", 4],
  [44, "5927", "Terry McLaurin", "WR", 21, "WAS", 4],
  [45, "12514", "Emeka Egbuka", "WR", 22, "TB", 4],
  [46, "8167", "Christian Watson", "WR", 23, "GB", 4],
  [47, "9487", "Parker Washington", "WR", 24, "JAC", 4],
  [48, "8148", "Jameson Williams", "WR", 25, "DET", 4],
  [49, "2133", "Davante Adams", "WR", 26, "LAR", 4],
  [50, "4983", "DJ Moore", "WR", 27, "BUF", 4],
  [51, "12518", "Tyler Warren", "TE", 4, "IND", 5],
  [52, "4881", "Lamar Jackson", "QB", 2, "BAL", 5],
  [53, "11564", "Drake Maye", "QB", 3, "NE", 5],
  [54, "11566", "Jayden Daniels", "QB", 4, "WAS", 5],
  [55, "9484", "Tucker Kraft", "TE", 5, "GB", 5],
  [56, "13286", "Jadarian Price", "RB", 20, "SEA", 5],
  [57, "5892", "David Montgomery", "RB", 21, "HOU", 5],
  [58, "12512", "Quinshon Judkins", "RB", 22, "CLE", 5],
  [59, "11584", "Bucky Irving", "RB", 23, "TB", 5],
  [60, "12490", "Bhayshul Tuten", "RB", 24, "JAC", 5],
  [61, "5850", "Josh Jacobs", "RB", 25, "GB", 5],
  [62, "12529", "TreVeyon Henderson", "RB", 26, "NE", 5],
  [63, "7611", "Rhamondre Stevenson", "RB", 27, "NE", 5],
  [64, "2216", "Mike Evans", "WR", 28, "SF", 6],
  [65, "11620", "Rome Odunze", "WR", 29, "CHI", 6],
  [66, "13279", "Carnell Tate", "WR", 30, "TEN", 6],
  [67, "6770", "Joe Burrow", "QB", 5, "CIN", 6],
  [68, "6904", "Jalen Hurts", "QB", 6, "PHI", 6],
  [69, "7523", "Trevor Lawrence", "QB", 7, "JAC", 6],
  [70, "11628", "Marvin Harrison Jr.", "WR", 31, "ARI", 6],
  [71, "13417", "De'Zhaun Stribling", "WR", 32, "SF", 6],
  [72, "4037", "Chris Godwin Jr.", "WR", 33, "TB", 6],
  [73, "2449", "Stefon Diggs", "WR", 34, "WAS", 6],
  [74, "11631", "Brian Thomas Jr.", "WR", 35, "JAC", 6],
  [75, "9500", "Josh Downs", "WR", 36, "IND", 6],
  [76, "10222", "Jayden Reed", "WR", 37, "GB", 6],
  [77, "5846", "DK Metcalf", "WR", 38, "PIT", 6],
  [78, "6797", "Justin Herbert", "QB", 8, "LAC", 6],
  [79, "11560", "Caleb Williams", "QB", 9, "CHI", 6],
  [80, "8183", "Brock Purdy", "QB", 10, "SF", 6],
  [81, "3294", "Dak Prescott", "QB", 11, "DAL", 6],
  [82, "10859", "Sam LaPorta", "TE", 6, "DET", 7],
  [83, "12506", "Harold Fannin Jr.", "TE", 7, "CLE", 7],
  [84, "4217", "George Kittle", "TE", 8, "SF", 7],
  [85, "7553", "Kyle Pitts Sr.", "TE", 9, "ATL", 7],
  [86, "10236", "Dalton Kincaid", "TE", 10, "BUF", 7],
  [87, "8228", "Jaylen Warren", "RB", 28, "PIT", 7],
  [88, "12533", "Jacory Croskey-Merritt", "RB", 29, "WAS", 7],
  [89, "11583", "Jonathon Brooks", "RB", 30, "CAR", 7],
  [90, "7021", "Rico Dowdle", "RB", 31, "PIT", 7],
  [91, "11581", "MarShawn Lloyd", "RB", 32, "GB", 7],
  [92, "6806", "J.K. Dobbins", "RB", 33, "DEN", 7],
  [93, "5967", "Tony Pollard", "RB", 34, "TEN", 7],
  [94, "11586", "Blake Corum", "RB", 35, "LAR", 7],
  [95, "8408", "Jordan Mason", "RB", 36, "MIN", 7],
  [96, "7594", "Chuba Hubbard", "RB", 37, "CAR", 7],
  [97, "7567", "Kenny Gainwell", "RB", 38, "TB", 7],
  [98, "13294", "Makai Lemon", "WR", 39, "PHI", 7],
  [99, "8126", "Wan'Dale Robinson", "WR", 40, "TEN", 7],
  [100, "10232", "Michael Wilson", "WR", 41, "ARI", 7],
  [101, "9754", "Quentin Johnston", "WR", 42, "LAC", 7],
  [102, "9756", "Jordan Addison", "WR", 43, "MIN", 7],
  [103, "12501", "Matthew Golden", "WR", 44, "GB", 7],
  [104, "8142", "Alec Pierce", "WR", 45, "IND", 8],
  [105, "13281", "Jordyn Tyson", "WR", 46, "NO", 8],
  [106, "5045", "Courtland Sutton", "WR", 47, "DEN", 8],
  [107, "12508", "Jaxson Dart", "QB", 12, "NYG", 8],
  [108, "11563", "Bo Nix", "QB", 13, "DEN", 8],
  [109, "5849", "Kyler Murray", "QB", 14, "MIN", 8],
  [110, "11646", "Jalen Coker", "WR", 48, "CAR", 8],
  [111, "6819", "Michael Pittman Jr.", "WR", 49, "PIT", 8],
  [112, "13346", "Denzel Boston", "WR", 50, "CLE", 8],
  [113, "5947", "Jakobi Meyers", "WR", 51, "JAC", 8],
  [114, "8676", "Rashid Shaheed", "WR", 52, "SEA", 8],
  [115, "11625", "Adonai Mitchell", "WR", 53, "NYJ", 8],
  [116, "8121", "Romeo Doubs", "WR", 54, "NE", 8],
  [117, "11624", "Xavier Worthy", "WR", 55, "KC", 8],
  [118, "12489", "RJ Harvey", "RB", 39, "DEN", 8],
  [119, "12534", "Kyle Monangai", "RB", 40, "CHI", 8],
  [120, "8136", "Rachaad White", "RB", 41, "WAS", 8],
  [121, "10219", "Chris Rodriguez Jr.", "RB", 42, "JAC", 8],
  [122, "4199", "Aaron Jones Sr.", "RB", 43, "MIN", 8],
  [123, "13345", "Jonah Coleman", "RB", 44, "DEN", 8],
  [124, "13305", "Mike Washington Jr.", "RB", 45, "LV", 8],
  [125, "1466", "Travis Kelce", "TE", 11, "KC", 8],
  [126, "8131", "Isaiah Likely", "TE", 12, "NYG", 8],
  [127, "5022", "Dallas Goedert", "TE", 13, "PHI", 8],
  [128, "3163", "Jared Goff", "QB", 15, "DET", 8],
  [129, "4046", "Patrick Mahomes II", "QB", 16, "KC", 8],
  [130, "421", "Matthew Stafford", "QB", 17, "LAR", 8],
  [131, "8132", "Tyler Allgeier", "RB", 46, "ARI", 9],
  [132, "9511", "Keaton Mitchell", "RB", 47, "LAC", 9],
  [133, "12474", "Woody Marks", "RB", 48, "HOU", 9],
  [134, "9508", "Tyjae Spears", "RB", 49, "TEN", 9],
  [135, "9225", "Tank Bigsby", "RB", 50, "PHI", 9],
  [136, "9753", "Zach Charbonnet", "RB", 51, "SEA", 9],
  [137, "8154", "Brian Robinson Jr.", "RB", 52, "ATL", 9],
  [138, "13414", "Kaelon Black", "RB", 53, "SF", 9],
  [139, "11575", "Ray Davis", "RB", 54, "BUF", 9],
  [140, "11576", "Braelon Allen", "RB", 55, "NYJ", 9],
  [141, "13337", "Emmett Johnson", "RB", 56, "KC", 9],
  [142, "11618", "Jalen McMillan", "WR", 56, "TB", 9],
  [143, "8134", "Khalil Shakir", "WR", 57, "BUF", 9],
  [144, "10213", "Tre Tucker", "WR", 58, "LV", 9],
  [145, "1479", "Keenan Allen", "WR", 59, "IND", 9],
  [146, "13347", "Demond Claiborne", "RB", 57, "MIN", 9],
  [147, "13288", "Nicholas Singleton", "RB", 58, "TEN", 9],
  [148, "12469", "Dylan Sampson", "RB", 59, "CLE", 9],
  [149, "7528", "Najee Harris", "RB", 60, "NYG", 9],
  [150, "4035", "Alvin Kamara", "RB", 61, "NO", 9],
  [151, "8205", "Isiah Pacheco", "RB", 62, "DET", 9],
  [152, "5872", "Deebo Samuel Sr.", "WR", 60, "SF", 9],
  [153, "9486", "Dontayvion Wicks", "WR", 61, "PHI", 9],
  [154, "12492", "Pat Bryant", "WR", 62, "DEN", 9],
  [155, "12509", "Tre Harris", "WR", 63, "LAC", 9],
  [156, "11783", "Ryan Flournoy", "WR", 64, "DAL", 9],
  [157, "13293", "Ja'Kobi Lane", "WR", 65, "BAL", 9],
  [158, "8180", "Jalen Nailor", "WR", 66, "LV", 9],
  [159, "12545", "Tyler Shough", "QB", 18, "NO", 9],
  [160, "8161", "Malik Willis", "QB", 19, "MIA", 9],
  [161, "6804", "Jordan Love", "QB", 20, "GB", 9],
  [162, "4892", "Baker Mayfield", "QB", 21, "TB", 9],
  [163, "5012", "Mark Andrews", "TE", 14, "BAL", 9],
  [164, "12487", "Terrance Ferguson", "TE", 15, "LAR", 9],
  [165, "7002", "Juwan Johnson", "TE", 16, "NO", 9],
  [166, "8210", "Chig Okonkwo", "TE", 17, "WAS", 9],
  [167, "13330", "Kenyon Sadiq", "TE", 18, "NYJ", 9],
  [168, "13320", "Zachariah Branch", "WR", 67, "ATL", 10],
  [169, "13276", "Omar Cooper Jr.", "WR", 68, "NYJ", 10],
  [170, "13413", "Cyrus Allen", "WR", 69, "KC", 10],
  [171, "12536", "Jaylin Noel", "WR", 70, "HOU", 10],
  [172, "13285", "Malachi Fields", "WR", 71, "NYG", 10],
  [173, "13405", "Kaytron Allen", "RB", 63, "WAS", 10],
  [174, "11655", "Tyrone Tracy Jr.", "RB", 64, "NYG", 10],
  [175, "11647", "Kimani Vidal", "RB", 65, "LAC", 10],
  [176, "4137", "James Conner", "RB", 66, "ARI", 10],
  [177, "9504", "Kayshon Boutte", "WR", 72, "HOU", 10],
  [178, "12530", "Travis Hunter", "WR", 73, "JAC", 10],
  [179, "13311", "Chris Bell", "WR", 74, "MIA", 10],
  [180, "11610", "Malik Washington", "WR", 75, "MIA", 10],
  [181, "13296", "Caleb Douglas", "WR", 76, "MIA", 10],
  [182, "11834", "DeVaughn Vele", "WR", 77, "NO", 10],
  [183, "13301", "Antonio Williams", "WR", 78, "WAS", 10],
  [184, "13317", "Ted Hurst III", "WR", 79, "TB", 10],
  [185, "6783", "Jerry Jeudy", "WR", 80, "CLE", 10],
  [186, "5001", "Dalton Schultz", "TE", 19, "HOU", 11],
  [187, "8110", "Jake Ferguson", "TE", 20, "DAL", 11],
  [188, "8172", "Greg Dulcich", "TE", 21, "MIA", 11],
  [189, "9480", "Brenton Strange", "TE", 22, "JAC", 11],
  [190, "3214", "Hunter Henry", "TE", 23, "NE", 11],
  [191, "11603", "AJ Barner", "TE", 24, "SEA", 11],
  [192, "13424", "Seth McGowan", "RB", 67, "IND", 11],
  [193, "4147", "Semaj Perine", "RB", 68, "CIN", 11],
  [194, "12467", "Jordan James", "RB", 69, "SF", 11],
  [195, "8800", "Malik Davis", "RB", 70, "DAL", 11],
  [196, "12457", "Jaydon Blue", "RB", 71, "DAL", 11],
  [197, "12048", "George Holani", "RB", 72, "SEA", 11],
  [198, "9506", "Sean Tucker", "RB", 73, "TB", 11],
  [199, "9757", "Kendre Miller", "RB", 74, "NO", 11],
  [200, "5995", "Justice Hill", "RB", 75, "BAL", 11],
  [201, "11643", "Jaylen Wright", "RB", 76, "MIA", 11],
  [202, "13302", "Adam Randall", "RB", 77, "BAL", 11],
  [203, "11370", "Chris Brooks", "RB", 78, "GB", 11],
  [204, "12471", "DJ Giddens", "RB", 79, "IND", 11],
  [205, "11571", "Isaiah Davis", "RB", 80, "NYJ", 11],
  [206, "12543", "Tajh Brooks", "RB", 81, "CIN", 11],
  [207, "7090", "Darnell Mooney", "WR", 81, "NYG", 11],
  [208, "7049", "Jauan Jennings", "WR", 82, "MIN", 11],
  [209, "12535", "Isaac TeSlaa", "WR", 83, "DET", 11],
  [210, "7571", "Rashod Bateman", "WR", 84, "BAL", 11],
  [211, "13274", "Germie Bernard", "WR", 85, "PIT", 11],
  [212, "8119", "Jahan Dotson", "WR", 86, "ATL", 11],
  [213, "11533", "Brandon Aubrey", "K", 1, "DAL", 12],
  [214, "HOU", "Texans", "DST", 1, "HOU", 12],
  [215, "DEN", "Broncos", "DST", 2, "DEN", 12],
  [216, "SEA", "Seahawks", "DST", 3, "SEA", 12],
  [217, "LAR", "Rams", "DST", 4, "LAR", 12],
  [218, "3451", "Ka'imi Fairbairn", "K", 2, "HOU", 12],
  [219, "8259", "Cameron Dicker", "K", 3, "LAC", 12],
  [220, "11786", "Cam Little", "K", 4, "JAC", 12],
  [221, "NE", "Patriots", "DST", 5, "NE", 12],
  [222, "BAL", "Ravens", "DST", 6, "BAL", 12],
  [223, "PIT", "Steelers", "DST", 7, "PIT", 12],
  [224, "MIN", "Vikings", "DST", 8, "MIN", 12],
  [225, "JAC", "Jaguars", "DST", 9, "JAC", 12],
  [226, "LAC", "Chargers", "DST", 10, "LAC", 12],
  [227, "GB", "Packers", "DST", 11, "GB", 12],
  [228, "12015", "Harrison Mevis", "K", 5, "LAR", 12],
  [229, "5189", "Eddy Pineiro", "K", 6, "SF", 12],
  [230, "12711", "Tyler Loop", "K", 7, "BAL", 12],
  [231, "2020", "Cairo Santos", "K", 8, "CHI", 12],
  [232, "11539", "Jake Bates", "K", 9, "DET", 12],
  [233, "2747", "Jason Myers", "K", 10, "SEA", 12],
  [234, "12713", "Andy Borregales", "K", 11, "NE", 12],
  [235, "6650", "Chase McLaughlin", "K", 12, "TB", 12],
  [236, "KC", "Chiefs", "DST", 12, "KC", 12],
  [237, "BUF", "Bills", "DST", 13, "BUF", 12],
  [238, "CHI", "Bears", "DST", 14, "CHI", 12],
  [239, "7839", "Evan McPherson", "K", 13, "CIN", 12],
  [240, "11792", "Will Reichard", "K", 14, "MIN", 12],
  [241, "7042", "Tyler Bass", "K", 15, "BUF", 12],
  [242, "9758", "CJ Stroud", "QB", 22, "HOU", 13],
  [243, "4943", "Sam Darnold", "QB", 23, "SEA", 13],
  [244, "12522", "Cam Ward", "QB", 24, "TEN", 13],
  [245, "5870", "Daniel Jones", "QB", 25, "NYG", 13],
  [246, "3257", "Jacoby Brissett", "QB", 26, "ARI", 13],
  [247, "9228", "Bryce Young", "QB", 27, "CAR", 13],
  [248, "13269", "Fernando Mendoza", "QB", 28, "LV", 13],
  [249, "1373", "Geno Smith", "QB", 29, "NYJ", 13],
  [250, "5844", "TJ Hockenson", "TE", 25, "MIN", 13],
  [251, "2505", "Darren Waller", "TE", 26, "CAR", 13],
  [252, "8111", "Cade Otton", "TE", 27, "TB", 13],
  [253, "12502", "Gunnar Helm", "TE", 28, "TEN", 13],
  [254, "7600", "Pat Freiermuth", "TE", 29, "PIT", 13],
  [255, "12493", "Oronde Gadsden II", "TE", 30, "LAC", 13],
  [256, "12472", "Raheim Sanders", "RB", 82, "CLE", 13],
  [257, "11589", "Trey Benson", "RB", 83, "ARI", 13],
  [258, "10235", "Roschon Johnson", "RB", 84, "CHI", 13],
  [259, "6130", "Devin Singletary", "RB", 85, "NYG", 13],
  [260, "11435", "Emanuel Wilson", "RB", 86, "SEA", 13],
  [261, "12544", "LeQuint Allen Jr.", "RB", 87, "JAC", 13],
  [262, "12495", "Ollie Gordon II", "RB", 88, "MIA", 13],
  [263, "11729", "Sione Vaki", "RB", 89, "DET", 13],
  [264, "12531", "Trevor Etienne", "RB", 90, "CAR", 13],
  [265, "11199", "Emari Demercado", "RB", 91, "KC", 13],
  [266, "11588", "Jawhar Jordan", "RB", 92, "HOU", 13],
  [267, "12738", "Phil Mafah", "RB", 93, "DAL", 13],
  [268, "12476", "Devin Neal", "RB", 94, "NO", 13],
  [269, "13420", "Bryce Lance", "WR", 87, "NO", 13],
  [270, "4039", "Cooper Kupp", "WR", 88, "SEA", 13],
  [271, "12483", "Jake Bech", "WR", 89, "LV", 13],
  [272, "7670", "Josh Palmer", "WR", 90, "BUF", 13],
  [273, "9501", "Demario Douglas", "WR", 91, "NE", 13],
  [274, "8188", "Tyquan Thornton", "WR", 92, "KC", 13],
  [275, "13329", "Malik Benson", "WR", 93, "LV", 13],
  [276, "4981", "Calvin Ridley", "WR", 94, "TEN", 13],
  [277, "10218", "Xavier Hutchinson", "WR", 95, "HOU", 13],
  [278, "12497", "Tory Horton", "WR", 96, "SEA", 13],
  [279, "9502", "Tank Dell", "WR", 97, "HOU", 13],
  [280, "6149", "Darius Slayton", "WR", 98, "NYG", 13],
  [281, "13402", "Skylar Bell", "WR", 99, "BUF", 13],
  [282, "11637", "Keon Coleman", "WR", 100, "BUF", 13],
  [283, "6427", "Ashton Dulin", "WR", 101, "IND", 13],
  [284, "13380", "Brenen Thompson", "WR", 102, "LAC", 13],
  [285, "12499", "Elic Ayomanor", "WR", 103, "TEN", 13],
  [286, "12503", "Isaiah Bond", "WR", 104, "CLE", 13],
  [287, "13477", "Colbie Young", "WR", 105, "CIN", 13],
  [288, "11627", "Troy Franklin", "WR", 106, "DEN", 13],
  [289, "12547", "Kyle Williams", "WR", 107, "NE", 13],
  [290, "8117", "Jalen Tolbert", "WR", 108, "MIA", 13],
  [291, "12540", "Chimere Dike", "WR", 109, "TEN", 13],
  [292, "12521", "Elijah Arroyo", "TE", 31, "SEA", 13],
  [293, "11592", "Erick All Jr.", "TE", 32, "CIN", 13],
  [294, "12498", "Mason Taylor", "TE", 33, "NYJ", 13],
  [295, "96", "Aaron Rodgers", "QB", 30, "PIT", 13],
  [296, "6768", "Tua Tagovailoa", "QB", 31, "ATL", 13],
  [297, "11559", "Michael Penix Jr.", "QB", 32, "ATL", 13],
  [298, "1166", "Kirk Cousins", "QB", 33, "LV", 13],
  [299, "12524", "Shedeur Sanders", "QB", 34, "CLE", 13],
  [300, "4017", "Deshaun Watson", "QB", 35, "CLE", 13],
];

export const LAB_300: Lab300Entry[] = LAB_300_RAW.map(
  ([rank, sleeperId, name, position, positionRank, team, tierIndex]) => ({
    rank,
    sleeperId,
    name,
    position,
    positionRank,
    team,
    tierIndex,
  }),
);

export const LAB_300_BY_SLEEPER_ID: Record<string, Lab300Entry> =
  Object.fromEntries(LAB_300.map((e) => [e.sleeperId, e]));

/** His tier label for a player, e.g. "3rd Round". Null when unranked. */
export function lab300Tier(sleeperId: string): string | null {
  const e = LAB_300_BY_SLEEPER_ID[sleeperId];
  return e ? (LAB_300_TIERS[e.tierIndex]?.label ?? null) : null;
}

export const JINGLES_CALLS: JinglesCall[] = [
  {
    sleeperId: "8138",
    player: "James Cook",
    position: "RB",
    team: "BUF",
    verdict: "league_winner",
    note: "Lab Certified. Expected to fade him on unsustainable TDs and instead came away calling him a league winner: RB6 in explosive plays, tied 3rd in games with 18+ PPR points, and poised for the biggest receiving workload of his career.",
    sourceUrl:
      "https://www.reddit.com/r/JoeInglesOfficial/comments/1vjzz4j/lab_notes_002_the_cook/",
    postedAt: "2026-08-09",
  },
  {
    sleeperId: "7523",
    player: "Trevor Lawrence",
    position: "QB",
    team: "JAX",
    adp: "QB12",
    jinglesRank: "QB7",
    verdict: "target",
    note: "Yes I’m a tad biased because he’s from my hometown, but TLaw had a YEAR last season.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vl072x/lab_notes_003_black_labs/",
    postedAt: "2026-08-10",
  },
  {
    sleeperId: "8183",
    player: "Brock Purdy",
    position: "QB",
    team: "SF",
    adp: "QB14",
    jinglesRank: "QB10",
    verdict: "target",
    note: "When he actually played he averaged 20.8 fantasy points per game, QB2 pace.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vl072x/lab_notes_003_black_labs/",
    postedAt: "2026-08-10",
  },
  {
    sleeperId: "8151",
    player: "Kenneth Walker",
    position: "RB",
    team: "KC",
    adp: "RB12",
    jinglesRank: "RB7",
    verdict: "target",
    note: "This might be my favorite talent + situation value.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vl072x/lab_notes_003_black_labs/",
    postedAt: "2026-08-10",
  },
  {
    sleeperId: "8408",
    player: "Jordan Mason",
    position: "RB",
    team: "MIN",
    adp: "RB41 / 115 overall",
    jinglesRank: "Top 35 RB / Top 100 overall",
    verdict: "target",
    note: "Top 5 among backs in YPC, explosive run rate, and YAC per attempt.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vl072x/lab_notes_003_black_labs/",
    postedAt: "2026-08-10",
  },
  {
    sleeperId: "12519",
    player: "Luther Burden",
    position: "WR",
    team: "CHI",
    adp: "WR28 / 60 overall",
    jinglesRank: "Top 20 WR / Top 35 overall",
    verdict: "target",
    note: "Ranked before he strained his groin; the injury should push his ADP down further. Buy the dip.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vl072x/lab_notes_003_black_labs/",
    postedAt: "2026-08-10",
  },
  {
    sleeperId: "8167",
    player: "Christian Watson",
    position: "WR",
    team: "GB",
    adp: "WR35 / 79 overall",
    jinglesRank: "Top 25 WR / Top 50 overall",
    verdict: "target",
    note: "Availability is the only knock. On the field he was WR4 in YPRR and WR5 in fantasy points per route run.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vl072x/lab_notes_003_black_labs/",
    postedAt: "2026-08-10",
  },
  {
    sleeperId: "9487",
    player: "Parker Washington",
    position: "WR",
    team: "JAX",
    adp: "WR38 / 87 overall",
    jinglesRank: "Top 30 WR / Top 65 overall",
    verdict: "target",
    note: "This might be the most underrated breakout in the entire group.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vl072x/lab_notes_003_black_labs/",
    postedAt: "2026-08-10",
  },
  {
    sleeperId: "9500",
    player: "Josh Downs",
    position: "WR",
    team: "IND",
    adp: "WR46 / 120 overall",
    jinglesRank: "Top 40 WR / Top 80 overall",
    verdict: "target",
    note: "Downs is the definition of target earning > market price.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vl072x/lab_notes_003_black_labs/",
    postedAt: "2026-08-10",
  },
  {
    sleeperId: "12517",
    player: "Colston Loveland",
    position: "TE",
    team: "CHI",
    adp: "TE3 / 46 overall",
    jinglesRank: "Top 30 overall",
    verdict: "target",
    note: "The late season breakout was beautiful to watch.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vl072x/lab_notes_003_black_labs/",
    postedAt: "2026-08-10",
  },
  {
    sleeperId: "10859",
    player: "Sam LaPorta",
    position: "TE",
    team: "DET",
    adp: "TE8 / 77 overall",
    jinglesRank: "TE6 / Top 60 overall",
    verdict: "target",
    note: "LaPorta is another player where I think the market has forgotten how good he actually is.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vl072x/lab_notes_003_black_labs/",
    postedAt: "2026-08-10",
  },
  {
    sleeperId: "4046",
    player: "Patrick Mahomes",
    position: "QB",
    team: "KC",
    adp: "QB13",
    jinglesRank: "QB16",
    verdict: "fade",
    note: "Ceiling is tied to his legs coming off a Week 15 ACL tear, and KC signed Kenneth Walker to carry the offense.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vlw6d2/10_guys_im_avoiding_at_current_adp/",
    postedAt: "2026-08-11",
  },
  {
    sleeperId: "421",
    player: "Matthew Stafford",
    position: "QB",
    team: "LAR",
    adp: "QB12",
    jinglesRank: "QB17",
    verdict: "fade",
    note: "Paying QB12 for a 38-year-old's outlier year: 7.7% TD rate against a 6.8% career high, and no rushing floor.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vlw6d2/10_guys_im_avoiding_at_current_adp/",
    postedAt: "2026-08-11",
  },
  {
    sleeperId: "7543",
    player: "Travis Etienne",
    position: "RB",
    team: "NO",
    adp: "RB19 / 40 Overall",
    jinglesRank: "RB25 / 60 Overall",
    verdict: "fade",
    note: "Almost entirely price. New Orleans had the 2nd worst YPC and 2nd fewest rushing TDs, and he is already splitting first-team reps with Kamara.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vlw6d2/10_guys_im_avoiding_at_current_adp/",
    postedAt: "2026-08-11",
  },
  {
    sleeperId: "12489",
    player: "RJ Harvey",
    position: "RB",
    team: "DEN",
    adp: "RB33 / 81 Overall",
    jinglesRank: "RB41 / 122 Overall",
    verdict: "fade",
    note: "RJ Harvey is the exact kind of RB I don’t want at his current price.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vlw6d2/10_guys_im_avoiding_at_current_adp/",
    postedAt: "2026-08-11",
  },
  {
    sleeperId: "8150",
    player: "Kyren Williams",
    position: "RB",
    team: "LAR",
    adp: "RB14 / 30 Overall",
    jinglesRank: "RB17 / 42 Overall",
    verdict: "fade",
    note: "Production is TD and red-zone dependent. Corum was the more efficient back, and beat reporters expect closer to a 50/50 split.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vlw6d2/10_guys_im_avoiding_at_current_adp/",
    postedAt: "2026-08-11",
  },
  {
    sleeperId: "10229",
    player: "Rashee Rice",
    position: "WR",
    team: "KC",
    adp: "WR8 / 23 Overall",
    jinglesRank: "WR18 / 37 Overall",
    verdict: "fade",
    note: "Loves the talent, not the price. 12 games played over two seasons through suspension and injury, and Mahomes is coming off an ACL tear.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vlw6d2/10_guys_im_avoiding_at_current_adp/",
    postedAt: "2026-08-11",
  },
  {
    sleeperId: "4983",
    player: "DJ Moore",
    position: "WR",
    team: "BUF",
    adp: "WR23 / 51 Overall",
    jinglesRank: "WR34 / 73 Overall",
    verdict: "fade",
    note: "This is one of my favorite fades in the entire draft.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vlw6d2/10_guys_im_avoiding_at_current_adp/",
    postedAt: "2026-08-11",
  },
  {
    sleeperId: "5846",
    player: "D.K. Metcalf",
    position: "WR",
    team: "PIT",
    adp: "WR30 / 73 Overall",
    jinglesRank: "WR45 / 101 Overall",
    verdict: "fade",
    note: "Career lows across the board, Rodgers had the lowest aDOT of any QB last year, and Pittsburgh added target competition.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vlw6d2/10_guys_im_avoiding_at_current_adp/",
    postedAt: "2026-08-11",
  },
  {
    sleeperId: "11631",
    player: "Brian Thomas Jr.",
    position: "WR",
    team: "JAX",
    adp: "WR23 / 72 Overall",
    jinglesRank: "WR34 / 92 Overall",
    verdict: "fade",
    note: "Sophomore regression plus a route-role change that cut expected volume from 12.4 to 9.2 XFP per game.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vlw6d2/10_guys_im_avoiding_at_current_adp/",
    postedAt: "2026-08-11",
  },
  {
    sleeperId: "5022",
    player: "Dallas Goedert",
    position: "TE",
    team: "PHI",
    adp: "TE10 / 110 Overall",
    jinglesRank: "TE17 / 156 Overall",
    verdict: "fade",
    note: "Touchdown regression: 11 scores last season against 12 total across his previous four seasons combined.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vlw6d2/10_guys_im_avoiding_at_current_adp/",
    postedAt: "2026-08-11",
  },
  {
    sleeperId: "8110",
    player: "Jake Ferguson",
    position: "TE",
    team: "DAL",
    adp: "TE12 / 115 Overall",
    jinglesRank: "TE18 / 157 Overall",
    verdict: "fade",
    note: "Ferguson is another player whose fantasy value was heavily influenced by situations that may not repeat.",
    sourceUrl: "https://www.reddit.com/r/JoeInglesOfficial/comments/1vlw6d2/10_guys_im_avoiding_at_current_adp/",
    postedAt: "2026-08-11",
  },
];

/** Backup RB tiers, posted 2026-08-12. Useful late in a redraft draft. */
export const BACKUP_RB_TIERS_URL =
  "https://www.reddit.com/r/JoeInglesOfficial/comments/1vmtgol/backup_rb_tiers/";

export const BACKUP_RB_TIERS: JinglesTier[] = [
  {
    tier: "Tier 1A",
    label: "Borderline RB2 Starter",
    players: [
      { rank: 1, name: "TreVeyon Henderson", sleeperId: "12529" },
    ],
  },
  {
    tier: "Tier 1B",
    label: "FLEX value with league winning upside",
    players: [
      { rank: 2, name: "Blake Corum", sleeperId: "11586" },
      { rank: 3, name: "Kyle Monangai", sleeperId: "12534" },
      { rank: 4, name: "Jonathon Brooks", sleeperId: "11583" },
      { rank: 5, name: "Jacory Croskey-Merritt", sleeperId: "12533" },
      { rank: 6, name: "Jordan Mason", sleeperId: "8408" },
      { rank: 7, name: "Rico Dowdle", sleeperId: "7021" },
    ],
  },
  {
    tier: "Tier 2",
    label: "Some standalone value, with a high ceiling if lead back gets injured",
    players: [
      // Sleeper lists him as "Kenny Gainwell".
      { rank: 8, name: "Kenneth Gainwell", sleeperId: "7567" },
      { rank: 9, name: "Rachaad White", sleeperId: "8136" },
      { rank: 10, name: "RJ Harvey", sleeperId: "12489" },
    ],
  },
  {
    tier: "Tier 3",
    label: "Requires an injury to the lead back, barely any standalone value",
    players: [
      { rank: 11, name: "Tank Bigsby", sleeperId: "9225" },
      { rank: 12, name: "Jonah Coleman", sleeperId: "13345" },
      { rank: 13, name: "Chris Rodriguez Jr.", sleeperId: "10219" },
      { rank: 14, name: "Isiah Pacheco", sleeperId: "8205" },
      { rank: 15, name: "Keaton Mitchell", sleeperId: "9511" },
    ],
  },
  {
    tier: "Tier 4",
    label: "Proven backups in a committee (but there’s potential)",
    players: [
      { rank: 16, name: "Zach Charbonnet", sleeperId: "9753" },
      { rank: 17, name: "Tyrone Tracy Jr.", sleeperId: "11655" },
      { rank: 18, name: "Tyler Allgeier", sleeperId: "8132" },
      { rank: 19, name: "MarShawn Lloyd", sleeperId: "11581" },
      { rank: 20, name: "Woody Marks", sleeperId: "12474" },
      { rank: 21, name: "Alvin Kamara", sleeperId: "4035" },
      { rank: 22, name: "Brian Robinson Jr.", sleeperId: "8154" },
      { rank: 23, name: "Ray Davis", sleeperId: "11575" },
      { rank: 24, name: "Dylan Sampson", sleeperId: "12469" },
      { rank: 25, name: "Tyjae Spears", sleeperId: "9508" },
    ],
  },
  {
    tier: "Tier 5",
    label: "Rookie backups who could carve out a role",
    players: [
      { rank: 26, name: "Jaydon Blue", sleeperId: "12457" },
      { rank: 27, name: "Nicholas Singleton", sleeperId: "13288" },
      { rank: 28, name: "Mike Washington Jr.", sleeperId: "13305" },
      { rank: 29, name: "Demond Claiborne", sleeperId: "13347" },
      { rank: 30, name: "Emmett Johnson", sleeperId: "13337" },
    ],
  },
];

/** Calls indexed by Sleeper id, for annotating a draft board or player page. */
export const CALLS_BY_SLEEPER_ID: Record<string, JinglesCall> =
  Object.fromEntries(JINGLES_CALLS.map((c) => [c.sleeperId, c]));
