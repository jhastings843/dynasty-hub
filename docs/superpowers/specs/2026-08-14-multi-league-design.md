# Multi-league Fantasy Hub

Date: 2026-08-14
Status: approved design, not yet implemented

## Goal

One set of tools that works across dynasty, redraft, and guillotine leagues,
with researched, data-driven strategy per league type, and a switcher that makes
moving between leagues trivial.

Today the app serves exactly one league. Every page reads `SLEEPER_LEAGUE_ID`
from the environment and assumes dynasty semantics.

## Known facts

Confirmed against the live Sleeper API on 2026-08-14, not assumed:

- Sleeper user `jhastings843` (id `733460435126353920`) has two 2026 leagues:
  - `1312136721281859584` "Dah Dynasty League", `settings.type: 2`, 12 teams, `in_season`
  - `1389754922777448448` "2026 Half PPR", `settings.type: 0`, 12 teams, `pre_draft`
- `settings.type` encodes format: `0` redraft, `1` keeper, `2` dynasty.
- The redraft league drafts 14 rounds, snake, `scoring_type: half_ppr`.
  Its draft has no `start_time` set yet.
- No guillotine league exists on the account. Sleeper has no guillotine format.
- `getUserLeagues(userId, season)` already exists at `src/lib/sleeper/client.ts:168`
  and is Redis-cached.
- `src/lib/fantasycalc/client.ts:88` hardcodes `isDynasty: true`. The format type
  is otherwise fully plumbed through, including the cache key.
- Dynamic route params are Promises in this Next version. See
  `src/app/dynasty/scout/[userId]/page.tsx:52`, which awaits them.
- The repo has no test framework.

## Non-goals

- Supporting arbitrary users. This is a personal tool for one Sleeper account.
- Scraping Reddit from production. See "Jingles Labs" below.
- Rewriting tool internals. Tools become league-aware; their logic is preserved.
- Building guillotine tools before a guillotine league exists.

## Architecture

### League layer

New `src/lib/league/`:

```ts
export type LeagueType = "dynasty" | "redraft" | "guillotine";

export interface LeagueProfile {
  id: string;
  name: string;
  season: string;
  type: LeagueType;
  teams: number;
  superflex: boolean;
  tePremium: boolean;
  ppr: number;
  rosterPositions: string[];
  status: "pre_draft" | "drafting" | "in_season" | "complete";
  source: "sleeper" | "manual";
}
```

- `discover.ts` — `getMyLeagues(season)` wraps `getUserLeagues`, maps each
  `SleeperLeague` to a `LeagueProfile`, and appends any manual leagues.
- `detect.ts` — `detectLeagueType(league)` reads `settings.type`. Keeper (`1`)
  maps to `dynasty`, since keeper strategy is far closer to dynasty than to
  redraft. A name match on `/guillotine/i` upgrades to `guillotine`.
- `resolve.ts` — `resolveLeague(leagueId)` returns a profile or triggers
  `notFound()`.

Manual leagues (guillotine) live in a committed config array of partial
`LeagueProfile` records with `source: "manual"`. No Sleeper data backs them.

### Routing

Tools move under `src/app/l/[leagueId]/`:

| Now | After |
| --- | --- |
| `/dynasty` | `/l/[leagueId]` |
| `/dynasty/plan` | `/l/[leagueId]/plan` |
| `/dynasty/draft` | `/l/[leagueId]/draft` |
| `/dynasty/draft/board` | `/l/[leagueId]/draft/board` |
| `/dynasty/trade` | `/l/[leagueId]/trade` |
| `/dynasty/players` | `/l/[leagueId]/players` |
| `/dynasty/player/[id]` | `/l/[leagueId]/player/[id]` |
| `/dynasty/scout/[userId]` | `/l/[leagueId]/scout/[userId]` |
| `/dynasty/movers` | `/l/[leagueId]/movers` |

`src/app/l/[leagueId]/layout.tsx` resolves the league once and passes the
profile to children. No page reads `SLEEPER_LEAGUE_ID` after this change.

`/survivor` and `/resources` stay outside `/l/`. Neither belongs to a league.

`/` becomes a league picker listing each league with its type, record, and
status, plus links to the league-independent tools.

`/dynasty/*` redirects permanently to `/l/1312136721281859584/*` so existing
bookmarks survive. `SLEEPER_LEAGUE_ID` is retained solely as the redirect target.

### Tool capability matrix

Each tool declares the league types it supports. The nav renders only supported
tools, so a guillotine league shows no trade tab rather than a broken one.

| Tool | dynasty | redraft | guillotine |
| --- | --- | --- | --- |
| League home | yes | yes | yes |
| Plan | yes | yes | yes |
| Draft | yes | yes | yes |
| Trade | yes | yes | no |
| Players | yes | yes | yes |
| Scout | yes | yes | yes |
| Movers | yes | yes | no |
| Waivers / FAAB (new, Phase 2) | no | yes | yes |

Every tool in this matrix exists today except Waivers / FAAB, which is new work
in Phase 2. Guillotine has no trades in standard rules. Movers tracks dynasty value drift,
which is meaningless when the league dissolves at season end.

### Values by league type

`FCFormat.isDynasty` is driven by `LeagueProfile.type` instead of the hardcoded
`true`. The FantasyCalc cache key already includes the format, so dynasty and
redraft values cache independently with no further change.

RosterAudit stays the dynasty value source. For redraft, FantasyCalc redraft
values plus ADP carry the draft board.

### Jingles Labs

Source: r/JoeInglesOfficial, "Jingles Labs", by u/JoeInglesOfficial. Half-PPR
redraft research, which matches the "2026 Half PPR" league exactly. Publishes
per-player rank-versus-ADP calls in a consistent `ADP QB12 -> My Rank QB17`
format, plus tier lists. "The Lab 300: 2026 Top 300 Half-PPR Rankings" and
auction values are announced but not yet published.

`src/lib/jingles/data.ts`:

```ts
export interface JinglesCall {
  player: string;
  sleeperId?: string;
  position: string;
  adpRank?: string;
  jinglesRank?: string;
  verdict: "fade" | "target" | "tier";
  tier?: string;
  note: string;
  sourceUrl: string;
  postedAt: string;
}
```

There is no production path to Reddit. The subreddit is reachable only through
an authenticated local browser session, and scheduled scraping of one person's
subreddit is not something this project should do. Curation is therefore a local
authoring step: read new posts locally, update the data file, commit. This also
keeps a source URL attached to every call, so the draft board can attribute and
link back to his post.

Surfaced as a badge on the redraft draft board and on player pages. Never
overrides a value source; it annotates.

If the Lab 300 publishes, it slots in as a full ranking source rather than a set
of fades, and becomes a column on the redraft board.

Attribution: his research, credited and linked. If any of this is ever made
public, it needs his blessing first.

### Strategy engine

`src/lib/dynasty/season-plan.ts` generalizes to `src/lib/strategy/` with one
rule set per league type. All rule sets return the existing `AutoGoal[]` shape,
so the plan page renders any league type without change.

- `dynasty.ts` — the current rules, moved unchanged: trajectory, age curves,
  pick capital, positional gaps.
- `redraft.ts` — playoff odds from record and roster strength, buy and sell
  windows against the trade deadline, bye week coverage, streaming needs.
- `guillotine.ts` — survival margin against the weekly elimination line, FAAB
  burn rate against weeks remaining, value available from eliminated rosters.

`AutoGoalContext` gains the `LeagueProfile` so rules can branch on scoring,
roster size, and superflex rather than assuming this league's settings.

### Guillotine

Stubbed until a league exists. `source: "manual"` profiles carry name, teams,
and FAAB budget. Weekly scores are entered by hand, following the pattern
`SurvivorTool.tsx` already uses for pool state. If the eventual platform has an
API, a source adapter replaces manual entry without touching the strategy rules.

## Error handling

- Unknown or inaccessible `leagueId` returns `notFound()`.
- Sleeper unreachable during discovery falls back to the cached league list;
  the switcher shows a stale marker rather than an empty list.
- A tool reached by direct URL for an unsupported league type redirects to that
  league's home with an explanation, rather than rendering a broken page.
- Missing `SLEEPER_USERNAME` keeps today's `ConfigError` treatment.

## Testing

Add Vitest. Test the pure functions where being wrong is silent and costly:

- `detectLeagueType` against captured fixtures of both real leagues.
- Each strategy rule set: given a context, the expected goals appear.
- `JinglesCall` name resolution to Sleeper player IDs.

Pages are not unit tested. The production build plus manual verification against
both live leagues covers them.

## Phasing

Each phase gets its own implementation plan. The plan that follows this spec
covers Phase 1 only; Phases 2 and 3 are scoped here so the Phase 1 boundaries
are clear, not to be built yet.

**Phase 1, before the redraft draft.** League layer, discovery, type detection,
switcher, route migration, `/dynasty` redirects, redraft-aware values, redraft
draft board with ADP and Jingles annotations.

**Phase 2, before Week 1.** Strategy engine split by type. Redraft in-season
tools: waivers, FAAB, bye coverage, start and sit context.

**Phase 3, when a guillotine league exists.** Manual league source, survival
and FAAB rules, elimination pool valuation.

## Risks

- Phase 1 moves eight working pages. Dynasty tools could regress in the window.
  Mitigation: migrate one tool at a time, keeping the old route redirecting, and
  verify against the live dynasty league after each.
- The Lab 300 may not publish before the draft. The board must be useful on
  FantasyCalc and ADP alone, with Jingles annotations as a bonus layer.
- Guillotine rules vary by host. Phase 3 designs against the specific league
  joined, not a generic guess.
