// Jingles Labs research, curated from r/JoeInglesOfficial.
//
// Source: https://www.reddit.com/r/JoeInglesOfficial/ (u/JoeInglesOfficial),
// also @JinglesLabs on TikTok, X, and Instagram. Half-PPR redraft focus, which
// matches the "2026 Half PPR" league exactly.
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

export type JinglesVerdict = "target" | "fade";

export interface JinglesCall {
  /** Sleeper player id, resolved at curation time. */
  sleeperId: string;
  player: string;
  position: string;
  team: string | null;
  /** His stated ADP for the player, verbatim. */
  adp: string;
  /** His own ranking, verbatim. Sometimes a range rather than a number. */
  jinglesRank: string;
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

export const LAST_UPDATED = "2026-08-14";

/**
 * The Lab 300, his 2026 top-300 half-PPR ranking, was announced for Sunday
 * 2026-08-16 and is not published yet. When it lands it belongs here as a full
 * ranking source rather than a set of individual calls.
 */
export const LAB_300_EXPECTED = "2026-08-16";
export const LAB_300: null = null;

export const JINGLES_CALLS: JinglesCall[] = [
  {
    sleeperId: "7523",
    player: "Trevor Lawrence",
    position: "QB",
    team: "JAX",
    adp: "QB12",
    jinglesRank: "QB7",
    verdict: "target",
    note: "Yes I’m a tad biased because he’s from my hometown, but TLaw had a YEAR last season.",
    sourceUrl: "https://www.reddit.com/r/fantasyfootballadvice/comments/1vl02ub/10_guys_im_taking_everywhere/",
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
    sourceUrl: "https://www.reddit.com/r/fantasyfootballadvice/comments/1vl02ub/10_guys_im_taking_everywhere/",
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
    sourceUrl: "https://www.reddit.com/r/fantasyfootballadvice/comments/1vl02ub/10_guys_im_taking_everywhere/",
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
    sourceUrl: "https://www.reddit.com/r/fantasyfootballadvice/comments/1vl02ub/10_guys_im_taking_everywhere/",
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
    sourceUrl: "https://www.reddit.com/r/fantasyfootballadvice/comments/1vl02ub/10_guys_im_taking_everywhere/",
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
    sourceUrl: "https://www.reddit.com/r/fantasyfootballadvice/comments/1vl02ub/10_guys_im_taking_everywhere/",
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
    sourceUrl: "https://www.reddit.com/r/fantasyfootballadvice/comments/1vl02ub/10_guys_im_taking_everywhere/",
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
    sourceUrl: "https://www.reddit.com/r/fantasyfootballadvice/comments/1vl02ub/10_guys_im_taking_everywhere/",
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
    sourceUrl: "https://www.reddit.com/r/fantasyfootballadvice/comments/1vl02ub/10_guys_im_taking_everywhere/",
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
    sourceUrl: "https://www.reddit.com/r/fantasyfootballadvice/comments/1vl02ub/10_guys_im_taking_everywhere/",
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
