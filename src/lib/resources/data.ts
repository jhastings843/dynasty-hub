// Curated dynasty fantasy football resources, rendered by /resources.
// Edit this file to add, remove, or update entries. The page reads from
// RESOURCES, REDDITORS, and CATEGORIES below.
//
// Status flags are advisory and shown as colored badges:
//   "integrated"      = dynasty-hub already pulls data from this source
//   "free"            = freely accessible, no scraping required
//   "free_tier"       = has a useful free tier alongside paid
//   "paid"            = paid only
//   "scrape_required" = data only available by parsing HTML; fragile
//   "outdated"        = link or content known stale; verify before relying
//
// To add a category, add it to CATEGORIES and reference its key in entries.
// To pin a resource at the top of the page, set `featured: true`.

export type ResourceStatus =
  | "integrated"
  | "free"
  | "free_tier"
  | "paid"
  | "scrape_required"
  | "outdated";

export type ResourceCategoryKey =
  | "trade_calculators"
  | "trade_value_charts"
  | "trade_databases"
  | "trade_tracker"
  | "rankings"
  | "league_power_rankings"
  | "rookie_draft_prep"
  | "adp"
  | "mock_draft"
  | "survivor_tools"
  | "devy"
  | "apps"
  | "channels";

export interface Resource {
  name: string;
  url: string;
  category: ResourceCategoryKey;
  status?: ResourceStatus[];
  note?: string;
  featured?: boolean;
}

export interface ResourceCategory {
  key: ResourceCategoryKey;
  title: string;
  blurb?: string;
}

export interface Redditor {
  handle: string;
  url: string;
  posts: string;
  status?: ResourceStatus[];
}

export const CATEGORIES: ResourceCategory[] = [
  { key: "trade_calculators", title: "Trade calculators" },
  { key: "trade_value_charts", title: "Trade value charts" },
  { key: "trade_databases", title: "Trade databases" },
  { key: "trade_tracker", title: "Trade trackers" },
  { key: "rankings", title: "Player rankings" },
  {
    key: "league_power_rankings",
    title: "League power rankings",
    blurb:
      "Useful for spotting trade fits. Dynasty-hub computes this locally on the trade analyzer.",
  },
  { key: "rookie_draft_prep", title: "Rookie draft prep" },
  { key: "adp", title: "ADP" },
  { key: "mock_draft", title: "Mock draft" },
  { key: "survivor_tools", title: "Survivor pool tools" },
  { key: "devy", title: "Devy" },
  { key: "apps", title: "Apps" },
  { key: "channels", title: "YouTube + podcasts" },
];

export const RESOURCES: Resource[] = [
  // --- FEATURED (renders at the top of the page) ---
  {
    name: "RosterAudit",
    url: "https://rosteraudit.com",
    category: "trade_calculators",
    status: ["integrated", "free"],
    featured: true,
    note: "Primary data source for dynasty-hub. Trade calculator, rankings, league hub, and free public API. Values include native TE-premium support matching this league's scoring.",
  },

  // --- Trade calculators ---
  {
    name: "FantasyCalc",
    url: "https://fantasycalc.com/trade-calculator",
    category: "trade_calculators",
    status: ["free"],
    note: "Secondary value source kept in dynasty-hub for cross-reference on close trades.",
  },
  {
    name: "KeepTradeCut",
    url: "https://keeptradecut.com/trade-calculator",
    category: "trade_calculators",
    status: ["scrape_required"],
    note: "Community-sourced values, de-facto standard. Has TE-premium variants (tep/tepp/teppp). Could be added later as a v3 secondary source.",
  },
  {
    name: "Dynasty-Daddy",
    url: "https://dynasty-daddy.com/trade-calculator",
    category: "trade_calculators",
    status: ["free"],
  },
  {
    name: "RotoTrade",
    url: "https://www.rototrade.com/",
    category: "trade_calculators",
    status: ["free"],
    note: "Site is anti-bot (returns 403 to scrapers).",
  },
  {
    name: "DynastyDealer",
    url: "https://www.dynastydealer.com/trade-calculator",
    category: "trade_calculators",
    status: ["free"],
  },

  // --- Trade value charts ---
  {
    name: "The Score (NFL trade value chart)",
    url: "https://www.thescore.com/nflfan/news/3183571",
    category: "trade_value_charts",
    status: ["free"],
  },
  {
    name: "FantasyPros (dynasty trade value, March 2025)",
    url: "https://www.fantasypros.com/2025/03/fantasy-football-rankings-dynasty-trade-value-chart-march-2025-update/",
    category: "trade_value_charts",
    status: ["free", "outdated"],
    note: "Dated March 2025. Look for a current FantasyPros article instead.",
  },
  {
    name: "Draftsharks (dynasty PPR)",
    url: "https://www.draftsharks.com/trade-value-chart/dynasty/ppr",
    category: "trade_value_charts",
    status: ["free"],
    note: "Has TE-premium and superflex variants embedded in the page.",
  },
  {
    name: "PeakedInHighSkool (charts)",
    url: "https://peakedinhighskool.com/dynasty-trade-value-charts/",
    category: "trade_value_charts",
    status: ["free"],
  },

  // --- Trade databases ---
  {
    name: "FantasyCalc trade database",
    url: "https://fantasycalc.com/database",
    category: "trade_databases",
    status: ["free"],
  },
  {
    name: "KeepTradeCut trade database",
    url: "https://keeptradecut.com/dynasty/trade-database",
    category: "trade_databases",
    status: ["free"],
  },
  {
    name: "Dynasty-Daddy trade database",
    url: "https://dynasty-daddy.com/trade-database",
    category: "trade_databases",
    status: ["free"],
  },

  // --- Trade trackers ---
  {
    name: "u/Repulsive_Repeat_681 trade tracker",
    url: "https://www.fantasyamp.com/streamlit/",
    category: "trade_tracker",
    status: ["free"],
    note: "Maps Sleeper trades including rookie picks to the players they became.",
  },

  // --- Player rankings ---
  {
    name: "KeepTradeCut dynasty rankings",
    url: "https://keeptradecut.com/dynasty-rankings",
    category: "rankings",
    status: ["free"],
  },
  {
    name: "Dynasty-Daddy fantasy rankings",
    url: "https://dynasty-daddy.com/fantasy-rankings",
    category: "rankings",
    status: ["free"],
  },
  {
    name: "FantasyCalc dynasty rankings",
    url: "https://fantasycalc.com/dynasty-rankings",
    category: "rankings",
    status: ["free"],
  },

  // --- League power rankings ---
  {
    name: "KeepTradeCut power rankings",
    url: "https://keeptradecut.com/dynasty/power-rankings",
    category: "league_power_rankings",
    status: ["free"],
  },
  {
    name: "Dynasty-Daddy league rankings",
    url: "https://dynasty-daddy.com/fantasy-league-rankings",
    category: "league_power_rankings",
    status: ["free"],
  },
  {
    name: "FantasyCalc league dashboard",
    url: "https://fantasycalc.com/league/dashboard",
    category: "league_power_rankings",
    status: ["free"],
  },
  {
    name: "FantasyPros MyPlaybook",
    url: "https://www.fantasypros.com/nfl/myplaybook/",
    category: "league_power_rankings",
    status: ["free_tier"],
  },

  // --- Rookie draft prep ---
  {
    name: "Pahowdy's College Database",
    url: "https://docs.google.com/spreadsheets/d/19suThny5WpYuBpv7tKrLe6_qtj_j9DQxHA8vftjkRd0/edit?gid=224755041#gid=224755041",
    category: "rookie_draft_prep",
    status: ["free"],
    note: "Advanced college stats spreadsheet.",
  },
  {
    name: "CFBNumbers QB Comparison Tool",
    url: "https://cfbnumbers.shinyapps.io/spiderapp/",
    category: "rookie_draft_prep",
    status: ["free"],
  },
  {
    name: "FantasyCalc rookie rankings",
    url: "https://fantasycalc.com/rookies",
    category: "rookie_draft_prep",
    status: ["free"],
    note: "Verify URL — FantasyCalc rookie page may live elsewhere.",
  },
  {
    name: "Dynasty Data Lab",
    url: "https://dynastydatalab.com/",
    category: "rookie_draft_prep",
    status: ["free"],
    note: "ADP, rookie ADP, draft strategy, and trade tools.",
  },
  {
    name: "2026 Dynasty Rookie Big Board",
    url: "",
    category: "rookie_draft_prep",
    status: ["outdated"],
    note: "Source unclear from notes — fill in URL when confirmed.",
  },

  // --- ADP ---
  {
    name: "FantasyCalc ADP",
    url: "https://www.fantasycalc.com/average-draft-position",
    category: "adp",
    status: ["free"],
    note: "Public website only; no clean public API endpoint for ADP.",
  },
  {
    name: "Dynasty Data Lab rookie ADP",
    url: "https://dynastydatalab.com/adp/rookie/",
    category: "adp",
    status: ["free"],
    note: "Live rookie ADP across formats with heatmap.",
  },

  // --- Mock draft ---
  {
    name: "FantasyMocks",
    url: "https://fantasymocks.com/",
    category: "mock_draft",
    status: ["free"],
  },
  {
    name: "FirstDownStudio (2027 early mock)",
    url: "",
    category: "mock_draft",
    status: ["outdated"],
    note: "Couldn't find a canonical URL — fill in when confirmed.",
  },

  // --- Survivor pool tools ---
  {
    name: "Survivor Grid",
    url: "https://www.survivorgrid.com/",
    category: "survivor_tools",
    status: ["free"],
    note: "Shows EV, Pick %, and Win % per team per week.",
  },
  {
    name: "Survivor Pick Planner",
    url: "https://footballsurvivor.pro/",
    category: "survivor_tools",
    status: ["free"],
    note: "Plan picks across the entire NFL season.",
  },

  // --- Devy ---
  {
    name: "Saturday2Sunday Football",
    url: "https://saturday2sundayfootball.com/",
    category: "devy",
    status: ["free"],
  },
  {
    name: "Campus2Canton",
    url: "https://campus2canton.com/",
    category: "devy",
    status: ["free_tier"],
  },

  // --- Apps ---
  {
    name: "Dynasty Scout (iOS)",
    url: "https://apps.apple.com/us/app/dynasty-scout/id1567748321",
    category: "apps",
    status: ["free_tier"],
    note: "League integration, trade calc, player profiler. iOS only.",
  },

  // --- YouTube + podcasts ---
  {
    name: "Fantasy Stock Exchange",
    url: "https://www.youtube.com/@FantasyStockExchange",
    category: "channels",
    status: ["free"],
    note: "Mock drafts, start/sit, rankings. Hosts also publish at FlockFantasy.com.",
  },
];

export const REDDITORS: Redditor[] = [
  {
    handle: "u/PeakedInHighSkool",
    url: "https://www.reddit.com/user/PeakedInHighSkool",
    posts: "Nicely formatted trade value charts. Also at peakedinhighskool.com.",
  },
  {
    handle: "u/Repulsive_Repeat_681",
    url: "https://www.reddit.com/user/Repulsive_Repeat_681",
    posts: "Sleeper trade tracker tool that resolves rookie picks to actual players.",
  },
  {
    handle: "u/I_dont_watch_film",
    url: "https://www.reddit.com/user/I_dont_watch_film",
    posts: "Data-driven player profiles.",
  },
  {
    handle: "u/Backseat_Scout",
    url: "https://www.reddit.com/user/Backseat_Scout",
    posts: "Scouting profiles.",
  },
  {
    handle: "u/broadly",
    url: "https://www.reddit.com/user/broadly",
    posts: "Prospect grades going back to 2018.",
    status: ["outdated"],
  },
  {
    handle: "u/cjfreel",
    url: "https://www.reddit.com/user/cjfreel",
    posts:
      "Rookie rankings and tiers. See their Deeper Dive: docs.google.com/document/d/19dhWxrvY0MbI5j6T72pepI0oqeJMh0QpGgBoTBZhzBI",
  },
  {
    handle: "u/Bobosbananas",
    url: "https://www.reddit.com/user/Bobosbananas",
    posts:
      "Rookie data back to 2011 for RBs and WRs (great for building your own model).",
  },
  {
    handle: "u/FootballForteConnor",
    url: "https://www.reddit.com/user/FootballForteConnor",
    posts: "Prospect profiles via Football Forte.",
  },
  {
    handle: "u/elboberto",
    url: "https://www.reddit.com/user/elboberto",
    posts: "Yearly custom auction value sheet.",
  },
];
