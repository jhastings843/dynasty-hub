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

export const LAST_UPDATED = "2026-08-17";

// ---------------------------------------------------------------------------
// The Lab 300
// ---------------------------------------------------------------------------
//
// His top-300 half-PPR ranking, posted 2026-08-16 as a Google Drive PDF:
// https://www.reddit.com/r/JoeInglesOfficial/comments/1vqdslf/the_lab_300_halfppr_rankings_81626/
//
// This is his Version 1.0 and he has said it will be updated through the
// preseason as depth charts, injuries, and camp battles resolve. Re-pull it
// when he posts a new version; LAB_300_VERSION is what the UI shows.
//
// Unlike FantasyCalc's redraft set, this covers team defenses and kickers, and
// it is built for half-PPR specifically, which is this league's scoring.
//
// Tiers map to draft rounds, which is the most actionable part: "Tier 4: 3rd
// Round" tells you where he expects a player to go.

export const LAB_300_VERSION = "1.0";
export const LAB_300_POSTED = "2026-08-16";
export const LAB_300_URL =
  "https://www.reddit.com/r/JoeInglesOfficial/comments/1vqdslf/the_lab_300_halfppr_rankings_81626/";

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
  { tier: "Tier 15", label: "Final 50" },
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
  [5, "8138", "James Cook III", "RB", 3, "BUF", 1],
  [6, "9488", "Jaxon Smith-Njigba", "WR", 3, "SEA", 1],
  [7, "4034", "Christian McCaffrey", "RB", 4, "SF", 1],
  [8, "7547", "Amon-Ra St. Brown", "WR", 4, "DET", 1],
  [9, "6813", "Jonathan Taylor", "RB", 5, "IND", 1],
  [10, "12527", "Ashton Jeanty", "RB", 6, "LV", 1],
  [11, "8151", "Kenneth Walker III", "RB", 7, "KC", 1],
  [12, "9224", "Chase Brown", "RB", 8, "CIN", 1],
  [13, "6786", "CeeDee Lamb", "WR", 5, "DAL", 2],
  [14, "6794", "Justin Jefferson", "WR", 6, "MIN", 2],
  [15, "4866", "Saquon Barkley", "RB", 9, "PHI", 2],
  [16, "9226", "De'Von Achane", "RB", 10, "MIA", 2],
  [17, "12507", "Omarion Hampton", "RB", 11, "LAC", 2],
  [18, "8112", "Drake London", "WR", 7, "ATL", 2],
  [19, "11604", "Brock Bowers", "TE", 1, "LV", 2],
  [20, "7569", "Nico Collins", "WR", 8, "HOU", 2],
  [21, "11632", "Malik Nabers", "WR", 9, "NYG", 2],
  [22, "5859", "A.J. Brown", "WR", 10, "NE", 2],
  [23, "7525", "DeVonta Smith", "WR", 11, "PHI", 2],
  [24, "8137", "George Pickens", "WR", 12, "DAL", 2],
  [25, "3198", "Derrick Henry", "RB", 12, "BAL", 3],
  [26, "13287", "Jeremiyah Love", "RB", 13, "ARI", 3],
  [27, "8155", "Breece Hall", "RB", 14, "NYJ", 3],
  [28, "7526", "Jaylen Waddle", "WR", 13, "DEN", 3],
  [29, "9997", "Zay Flowers", "WR", 14, "BAL", 3],
  [30, "8144", "Chris Olave", "WR", 15, "NO", 3],
  [31, "6801", "Tee Higgins", "WR", 16, "CIN", 3],
  [32, "10229", "Rashee Rice", "WR", 17, "KC", 3],
  [33, "4984", "Josh Allen", "QB", 1, "BUF", 3],
  [34, "8130", "Trey McBride", "TE", 2, "ARI", 3],
  [35, "12517", "Colston Loveland", "TE", 3, "CHI", 3],
  [36, "12519", "Luther Burden III", "WR", 18, "CHI", 3],
  [37, "5850", "Josh Jacobs", "RB", 15, "GB", 4],
  [38, "7588", "Javonte Williams", "RB", 16, "DAL", 4],
  [39, "8150", "Kyren Williams", "RB", 17, "LAR", 4],
  [40, "11635", "Ladd McConkey", "WR", 19, "LAC", 4],
  [41, "12526", "Tetairoa McMillan", "WR", 20, "CAR", 4],
  [42, "5927", "Terry McLaurin", "WR", 21, "WAS", 4],
  [43, "12514", "Emeka Egbuka", "WR", 22, "TB", 4],
  [44, "8146", "Garrett Wilson", "WR", 23, "NYJ", 4],
  [45, "8167", "Christian Watson", "WR", 24, "GB", 4],
  [46, "12481", "Cam Skattebo", "RB", 18, "NYG", 4],
  [47, "6790", "D'Andre Swift", "RB", 19, "CHI", 4],
  [48, "2216", "Mike Evans", "WR", 25, "SF", 4],
  [49, "2133", "Davante Adams", "WR", 26, "LAR", 4],
  [50, "9487", "Parker Washington", "WR", 27, "JAC", 4],
  [51, "12518", "Tyler Warren", "TE", 4, "IND", 5],
  [52, "4881", "Lamar Jackson", "QB", 2, "BAL", 5],
  [53, "11564", "Drake Maye", "QB", 3, "NE", 5],
  [54, "11566", "Jayden Daniels", "QB", 4, "WAS", 5],
  [55, "9484", "Tucker Kraft", "TE", 5, "GB", 5],
  [56, "5892", "David Montgomery", "RB", 20, "HOU", 5],
  [57, "12512", "Quinshon Judkins", "RB", 21, "CLE", 5],
  [58, "11584", "Bucky Irving", "RB", 22, "TB", 5],
  [59, "12490", "Bhayshul Tuten", "RB", 23, "JAC", 5],
  [60, "12529", "TreVeyon Henderson", "RB", 24, "NE", 5],
  [61, "7543", "Travis Etienne Jr.", "RB", 25, "NO", 5],
  [62, "11583", "Jonathon Brooks", "RB", 26, "CAR", 5],
  [63, "13286", "Jadarian Price", "RB", 27, "SEA", 5],
  [64, "7611", "Rhamondre Stevenson", "RB", 28, "NE", 5],
  [65, "10859", "Sam LaPorta", "TE", 6, "DET", 6],
  [66, "8148", "Jameson Williams", "WR", 28, "DET", 6],
  [67, "11620", "Rome Odunze", "WR", 29, "CHI", 6],
  [68, "13279", "Carnell Tate", "WR", 30, "TEN", 6],
  [69, "4983", "DJ Moore", "WR", 31, "BUF", 6],
  [70, "6770", "Joe Burrow", "QB", 5, "CIN", 6],
  [71, "6904", "Jalen Hurts", "QB", 6, "PHI", 6],
  [72, "7523", "Trevor Lawrence", "QB", 7, "JAC", 6],
  [73, "11628", "Marvin Harrison Jr.", "WR", 32, "ARI", 6],
  [74, "2449", "Stefon Diggs", "WR", 33, "WAS", 6],
  [75, "9500", "Josh Downs", "WR", 34, "IND", 6],
  [76, "4037", "Chris Godwin Jr.", "WR", 35, "TB", 6],
  [77, "6797", "Justin Herbert", "QB", 8, "LAC", 6],
  [78, "11560", "Caleb Williams", "QB", 9, "CHI", 6],
  [79, "8183", "Brock Purdy", "QB", 10, "SF", 6],
  [80, "3294", "Dak Prescott", "QB", 11, "DAL", 6],
  [81, "13417", "De’Zhaun Stribling", "WR", 36, "SF", 7],
  [82, "11631", "Brian Thomas Jr.", "WR", 37, "JAC", 7],
  [83, "13281", "Jordyn Tyson", "WR", 38, "NO", 7],
  [84, "12506", "Harold Fannin Jr.", "TE", 7, "CLE", 7],
  [85, "4217", "George Kittle", "TE", 8, "SF", 7],
  [86, "8228", "Jaylen Warren", "RB", 29, "PIT", 7],
  [87, "12533", "Jacory Croskey-Merritt", "RB", 30, "WAS", 7],
  [88, "11586", "Blake Corum", "RB", 31, "LAR", 7],
  [89, "12534", "Kyle Monangai", "RB", 32, "CHI", 7],
  [90, "8408", "Jordan Mason", "RB", 33, "MIN", 7],
  [91, "7021", "Rico Dowdle", "RB", 34, "PIT", 7],
  [92, "7567", "Kenny Gainwell", "RB", 35, "TB", 7],
  [93, "8136", "Rachaad White", "RB", 36, "WAS", 7],
  [94, "5967", "Tony Pollard", "RB", 37, "TEN", 7],
  [95, "6806", "J.K. Dobbins", "RB", 38, "DEN", 7],
  [96, "7553", "Kyle Pitts Sr.", "TE", 9, "ATL", 7],
  [97, "13294", "Makai Lemon", "WR", 39, "PHI", 7],
  [98, "5045", "Courtland Sutton", "WR", 40, "DEN", 7],
  [99, "10232", "Michael Wilson", "WR", 41, "ARI", 7],
  [100, "13298", "KC Concepcion", "WR", 42, "CLE", 7],
  [101, "7594", "Chuba Hubbard", "RB", 39, "CAR", 8],
  [102, "5846", "DK Metcalf", "WR", 43, "PIT", 8],
  [103, "9754", "Quentin Johnston", "WR", 44, "LAC", 8],
  [104, "10222", "Jayden Reed", "WR", 45, "GB", 8],
  [105, "8142", "Alec Pierce", "WR", 46, "IND", 8],
  [106, "12508", "Jaxson Dart", "QB", 12, "NYG", 8],
  [107, "11563", "Bo Nix", "QB", 13, "DEN", 8],
  [108, "5849", "Kyler Murray", "QB", 14, "MIN", 8],
  [109, "8126", "Wan'Dale Robinson", "WR", 47, "TEN", 8],
  [110, "9756", "Jordan Addison", "WR", 48, "MIN", 8],
  [111, "11646", "Jalen Coker", "WR", 49, "CAR", 8],
  [112, "12501", "Matthew Golden", "WR", 50, "GB", 8],
  [113, "6819", "Michael Pittman Jr.", "WR", 51, "PIT", 8],
  [114, "5947", "Jakobi Meyers", "WR", 52, "JAC", 8],
  [115, "11624", "Xavier Worthy", "WR", 53, "KC", 8],
  [116, "12484", "Jayden Higgins", "WR", 54, "HOU", 8],
  [117, "8676", "Rashid Shaheed", "WR", 55, "SEA", 8],
  [118, "13346", "Denzel Boston", "WR", 56, "CLE", 8],
  [119, "12489", "RJ Harvey", "RB", 40, "DEN", 8],
  [120, "9508", "Tyjae Spears", "RB", 41, "TEN", 8],
  [121, "10236", "Dalton Kincaid", "TE", 10, "BUF", 8],
  [122, "1466", "Travis Kelce", "TE", 11, "KC", 8],
  [123, "3163", "Jared Goff", "QB", 15, "DET", 8],
  [124, "4046", "Patrick Mahomes II", "QB", 16, "KC", 8],
  [125, "421", "Matthew Stafford", "QB", 17, "LAR", 8],
  [126, "9753", "Zach Charbonnet", "RB", 42, "SEA", 9],
  [127, "4199", "Aaron Jones Sr.", "RB", 43, "MIN", 9],
  [128, "9511", "Keaton Mitchell", "RB", 44, "LAC", 9],
  [129, "10219", "Chris Rodriguez Jr.", "RB", 45, "JAC", 9],
  [130, "11655", "Tyrone Tracy Jr.", "RB", 46, "NYG", 9],
  [131, "13345", "Jonah Coleman", "RB", 47, "DEN", 9],
  [132, "8132", "Tyler Allgeier", "RB", 48, "ARI", 9],
  [133, "9225", "Tank Bigsby", "RB", 49, "PHI", 9],
  [134, "11581", "MarShawn Lloyd", "RB", 50, "GB", 9],
  [135, "12474", "Woody Marks", "RB", 51, "HOU", 9],
  [136, "13288", "Nicholas Singleton", "RB", 52, "TEN", 9],
  [137, "12457", "Jaydon Blue", "RB", 53, "DAL", 9],
  [138, "4035", "Alvin Kamara", "RB", 54, "NO", 9],
  [139, "8154", "Brian Robinson Jr.", "RB", 55, "ATL", 9],
  [140, "12469", "Dylan Sampson", "RB", 56, "CLE", 9],
  [141, "5872", "Deebo Samuel Sr.", "WR", 57, "SF", 9],
  [142, "8121", "Romeo Doubs", "WR", 58, "NE", 9],
  [143, "8180", "Jalen Nailor", "WR", 59, "LV", 9],
  [144, "11618", "Jalen McMillan", "WR", 60, "TB", 9],
  [145, "8134", "Khalil Shakir", "WR", 61, "BUF", 9],
  [146, "12545", "Tyler Shough", "QB", 18, "NO", 9],
  [147, "8161", "Malik Willis", "QB", 19, "MIA", 9],
  [148, "6804", "Jordan Love", "QB", 20, "GB", 9],
  [149, "4892", "Baker Mayfield", "QB", 21, "TB", 9],
  [150, "5012", "Mark Andrews", "TE", 12, "BAL", 9],
  [151, "13347", "Demond Claiborne", "RB", 57, "MIN", 10],
  [152, "11575", "Ray Davis", "RB", 58, "BUF", 10],
  [153, "8205", "Isiah Pacheco", "RB", 59, "DET", 10],
  [154, "13305", "Mike Washington Jr.", "RB", 60, "LV", 10],
  [155, "12048", "George Holani", "RB", 61, "SEA", 10],
  [156, "13405", "Kaytron Allen", "RB", 62, "WAS", 10],
  [157, "13337", "Emmett Johnson", "RB", 63, "KC", 10],
  [158, "11576", "Braelon Allen", "RB", 64, "NYJ", 10],
  [159, "12492", "Pat Bryant", "WR", 62, "DEN", 10],
  [160, "9486", "Dontayvion Wicks", "WR", 63, "PHI", 10],
  [161, "12509", "Tre Harris", "WR", 64, "LAC", 10],
  [162, "11783", "Ryan Flournoy", "WR", 65, "DAL", 10],
  [163, "13276", "Omar Cooper Jr.", "WR", 66, "NYJ", 10],
  [164, "12530", "Travis Hunter", "WR", 67, "JAC", 10],
  [165, "10213", "Tre Tucker", "WR", 68, "LV", 10],
  [166, "11625", "Adonai Mitchell", "WR", 69, "NYJ", 10],
  [167, "13320", "Zachariah Branch", "WR", 70, "ATL", 10],
  [168, "11610", "Malik Washington", "WR", 71, "MIA", 10],
  [169, "13293", "Ja’Kobi Lane", "WR", 72, "BAL", 10],
  [170, "8131", "Isaiah Likely", "TE", 13, "NYG", 10],
  [171, "8210", "Chig Okonkwo", "TE", 14, "WAS", 10],
  [172, "9480", "Brenton Strange", "TE", 15, "JAC", 10],
  [173, "3214", "Hunter Henry", "TE", 16, "NE", 10],
  [174, "5022", "Dallas Goedert", "TE", 17, "PHI", 10],
  [175, "8110", "Jake Ferguson", "TE", 18, "DAL", 10],
  [176, "4137", "James Conner", "RB", 65, "ARI", 11],
  [177, "13414", "Kaelon Black", "RB", 66, "SF", 11],
  [178, "11647", "Kimani Vidal", "RB", 67, "LAC", 11],
  [179, "9506", "Sean Tucker", "RB", 68, "TB", 11],
  [180, "12495", "Ollie Gordon II", "RB", 69, "MIA", 11],
  [181, "12467", "Jordan James", "RB", 70, "SF", 11],
  [182, "11571", "Isaiah Davis", "RB", 71, "NYJ", 11],
  [183, "11199", "Emari Demercado", "RB", 72, "KC", 11],
  [184, "5995", "Justice Hill", "RB", 73, "BAL", 11],
  [185, "13302", "Adam Randall", "RB", 74, "BAL", 11],
  [186, "13424", "Seth McGowan", "RB", 75, "IND", 11],
  [187, "7002", "Juwan Johnson", "TE", 19, "NO", 11],
  [188, "8172", "Greg Dulcich", "TE", 20, "MIA", 11],
  [189, "11603", "AJ Barner", "TE", 21, "SEA", 11],
  [190, "13330", "Kenyon Sadiq", "TE", 22, "NYJ", 11],
  [191, "5001", "Dalton Schultz", "TE", 23, "HOU", 11],
  [192, "7049", "Jauan Jennings", "WR", 73, "MIN", 11],
  [193, "6783", "Jerry Jeudy", "WR", 74, "CLE", 11],
  [194, "13296", "Caleb Douglas", "WR", 75, "MIA", 11],
  [195, "13301", "Antonio Williams", "WR", 76, "WAS", 11],
  [196, "7090", "Darnell Mooney", "WR", 77, "NYG", 11],
  [197, "13285", "Malachi Fields", "WR", 78, "NYG", 11],
  [198, "13413", "Cyrus Allen", "WR", 79, "KC", 11],
  [199, "9502", "Tank Dell", "WR", 80, "HOU", 11],
  [200, "12535", "Isaac TeSlaa", "WR", 81, "DET", 11],
  [201, "11533", "Brandon Aubrey", "K", 1, "DAL", 12],
  [202, "HOU", "Texans", "DST", 1, "HOU", 12],
  [203, "DEN", "Broncos", "DST", 2, "DEN", 12],
  [204, "SEA", "Seahawks", "DST", 3, "SEA", 12],
  [205, "LAR", "Rams", "DST", 4, "LAR", 12],
  [206, "PHI", "Eagles", "DST", 5, "PHI", 12],
  [207, "3451", "Ka’imi Fairbairn", "K", 2, "HOU", 12],
  [208, "8259", "Cameron Dicker", "K", 3, "LAC", 12],
  [209, "11786", "Cam Little", "K", 4, "JAC", 12],
  [210, "2747", "Jason Myers", "K", 5, "SEA", 12],
  [211, "NE", "Patriots", "DST", 6, "NE", 12],
  [212, "BAL", "Ravens", "DST", 7, "BAL", 12],
  [213, "PIT", "Steelers", "DST", 8, "PIT", 12],
  [214, "MIN", "Vikings", "DST", 9, "MIN", 12],
  [215, "JAC", "Jaguars", "DST", 10, "JAC", 12],
  [216, "LAC", "Chargers", "DST", 11, "LAC", 12],
  [217, "GB", "Packers", "DST", 12, "GB", 12],
  [218, "12015", "Harrison Mevis", "K", 6, "LAR", 12],
  [219, "5189", "Eddy Pineiro", "K", 7, "SF", 12],
  [220, "12711", "Tyler Loop", "K", 8, "BAL", 12],
  [221, "2020", "Cairo Santos", "K", 9, "CHI", 12],
  [222, "11539", "Jake Bates", "K", 10, "DET", 12],
  [223, "12713", "Andy Borregales", "K", 11, "NE", 12],
  [224, "6650", "Chase McLaughlin", "K", 12, "TB", 12],
  [225, "KC", "Chiefs", "DST", 13, "KC", 12],
  [226, "BUF", "Bills", "DST", 14, "BUF", 12],
  [227, "DET", "Bears", "DST", 15, "DET", 12],
  [228, "7839", "Evan McPherson", "K", 13, "CIN", 12],
  [229, "11792", "Will Reichard", "K", 14, "MIN", 12],
  [230, "7042", "Tyler Bass", "K", 15, "BUF", 12],
  [231, "9758", "CJ Stroud", "QB", 22, "HOU", 13],
  [232, "4943", "Sam Darnold", "QB", 23, "SEA", 13],
  [233, "12522", "Cam Ward", "QB", 24, "TEN", 13],
  [234, "5870", "Daniel Jones", "QB", 25, "NYG", 13],
  [235, "3257", "Jacoby Brissett", "QB", 26, "ARI", 13],
  [236, "9228", "Bryce Young", "QB", 27, "CAR", 13],
  [237, "13269", "Fernando Mendoza", "QB", 28, "LV", 13],
  [238, "1373", "Geno Smith", "QB", 29, "NYJ", 13],
  [239, "12487", "Terrance Ferguson", "TE", 24, "LAR", 13],
  [240, "5844", "TJ Hockenson", "TE", 25, "MIN", 13],
  [241, "12493", "Oronde Gadsden II", "TE", 26, "LAC", 13],
  [242, "7600", "Pat Freiermuth", "TE", 27, "PIT", 13],
  [243, "2505", "Darren Waller", "TE", 28, "CAR", 13],
  [244, "12502", "Gunnar Helm", "TE", 29, "TEN", 13],
  [245, "8111", "Cade Otton", "TE", 30, "TB", 13],
  [246, "13317", "Ted Hurst III", "WR", 82, "TB", 13],
  [247, "12497", "Tory Horton", "WR", 83, "SEA", 13],
  [248, "1479", "Keenan Allen", "WR", 84, "LAC", 13],
  [249, "7571", "Rashod Bateman", "WR", 85, "BAL", 13],
  [250, "13274", "Germie Bernard", "WR", 86, "PIT", 13],
  [251, "12471", "DJ Giddens", "RB", 76, "IND", 14],
  [252, "12543", "Tajh Brooks", "RB", 77, "CIN", 14],
  [253, "4147", "Semaj Perine", "RB", 78, "CIN", 14],
  [254, "11370", "Chris Brooks", "RB", 79, "GB", 14],
  [255, "11643", "Jaylen Wright", "RB", 80, "MIA", 14],
  [256, "11435", "Emanuel Wilson", "RB", 81, "SEA", 14],
  [257, "11589", "Trey Benson", "RB", 82, "ARI", 14],
  [258, "7528", "Najee Harris", "RB", 83, "LAC", 14],
  [259, "12738", "Phil Mafah", "RB", 84, "DAL", 14],
  [260, "12544", "LeQuint Allen Jr.", "RB", 85, "JAC", 14],
  [261, "12476", "Devin Neal", "RB", 86, "NO", 14],
  [262, "12472", "Raheim Sanders", "RB", 87, "CLE", 14],
  [263, "6130", "Devin Singletary", "RB", 88, "NYG", 14],
  [264, "9757", "Kendre Miller", "RB", 89, "NO", 14],
  [265, "11729", "Sione Vaki", "RB", 90, "DET", 14],
  [266, "12531", "Trevor Etienne", "RB", 91, "CAR", 14],
  [267, "11588", "Jawhar Jordan", "RB", 92, "HOU", 14],
  [268, "8119", "Jahan Dotson", "WR", 87, "ATL", 14],
  [269, "13311", "Chris Bell", "WR", 88, "MIA", 14],
  [270, "13402", "Skylar Bell", "WR", 89, "BUF", 14],
  [271, "9504", "Kayshon Boutte", "WR", 90, "NE", 14],
  [272, "12536", "Jaylin Noel", "WR", 91, "HOU", 14],
  [273, "6149", "Darius Slayton", "WR", 92, "NYG", 14],
  [274, "8188", "Tyquan Thornton", "WR", 93, "KC", 14],
  [275, "6427", "Ashton Dulin", "WR", 94, "IND", 14],
  [276, "11637", "Keon Coleman", "WR", 95, "BUF", 14],
  [277, "4039", "Cooper Kupp", "WR", 96, "SEA", 14],
  [278, "13268", "Elijah Sarratt", "WR", 97, "BAL", 14],
  [279, "8117", "Jalen Tolbert", "WR", 98, "MIA", 14],
  [280, "12499", "Elic Ayomanor", "WR", 99, "TEN", 14],
  [281, "13380", "Brenen Thompson", "WR", 100, "LAC", 14],
  [282, "12483", "Jake Bech", "WR", 101, "LV", 14],
  [283, "13329", "Malik Benson", "WR", 102, "LV", 14],
  [284, "4981", "Calvin Ridley", "WR", 103, "TEN", 14],
  [285, "11627", "Troy Franklin", "WR", 104, "DEN", 14],
  [286, "12547", "Kyle Williams", "WR", 105, "NE", 14],
  [287, "11834", "DeVaughn Vele", "WR", 106, "NO", 14],
  [288, "12540", "Chimere Dike", "WR", 107, "TEN", 14],
  [289, "9501", "Demario Douglas", "WR", 108, "NE", 14],
  [290, "12503", "Isaiah Bond", "WR", 109, "CLE", 14],
  [291, "12521", "Elijah Arroyo", "TE", 31, "SEA", 14],
  [292, "11592", "Erick All Jr.", "TE", 32, "CIN", 14],
  [293, "12498", "Mason Taylor", "TE", 33, "NYJ", 14],
  [294, "96", "Aaron Rodgers", "QB", 30, "PIT", 14],
  [295, "6768", "Tua Tagovailoa", "QB", 31, "ATL", 14],
  [296, "12524", "Shedeur Sanders", "QB", 32, "CLE", 14],
  [297, "4017", "Deshaun Watson", "QB", 33, "CLE", 14],
  [298, "11559", "Michael Penix Jr.", "QB", 34, "ATL", 14],
  [299, "1166", "Kirk Cousins", "QB", 35, "LV", 14],
  [300, "7670", "Josh Palmer", "WR", 110, "BUF", 14],
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
