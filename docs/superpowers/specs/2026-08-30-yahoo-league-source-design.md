# Yahoo as a second league source

Status: PARKED 2026-08-30, not built and not planned.

Yahoo gates the Fantasy Sports API behind an approval queue. The app was
created and works (token exchange succeeds, oob is accepted, a refresh token is
issued), but the fantasy endpoint answers 401 with
`oauth_problem="additional_authorization_required"` and `scope=fspt-r` is
refused at the authorize endpoint with `invalid_scope`. Access requires an
application at sports.yahoo.com/developer/access/ and a wait measured in weeks.
Jack called it off rather than wait. This document is kept because the findings
below cost real time to establish and would have to be rediscovered otherwise.
Supersedes nothing. Extends the 2026-08-14 multi-league design, which assumed
Sleeper was the only automatic source.

## Goal

A Yahoo redraft league sits alongside the Sleeper leagues in the switcher and
runs the value tools: players, trade builder, draft board. It reads its own
settings and rosters from Yahoo, and it uses the same FantasyCalc redraft values
every other redraft league uses.

## Known facts

Established by reading the Yahoo docs and this repo on 2026-08-30.

- Yahoo requires OAuth 2.0. There is no anonymous read, which is the whole
  difference from Sleeper: Sleeper discovery is one username in `.env.local`.
- `redirect_uri=oob` is still supported by Yahoo. Google deprecated OOB in 2023
  and Yahoo did not follow, so a terminal script can mint a token with no HTTPS
  server, no public callback route, and no exposed endpoint on the deployed app.
- Yahoo access tokens expire in one hour. Refresh tokens persist until revoked,
  including across password changes.
- `game_code` is accepted wherever a `game_key` is, so `nfl` resolves to the
  current season's game id without a hardcoded table that goes stale each year.
- Keys are structured and self-describing: league `449.l.12345`, team
  `449.l.12345.t.1`, player `449.p.5479`. A Yahoo league id therefore always
  contains `.l.` and a Sleeper league id never does, so the two id spaces can
  share one route parameter without a prefix.
- Yahoo's `format=json` is XML wearing a costume. Collections come back as
  objects keyed `"0"`, `"1"`, `"2"` with a sibling `count`, and every numeric
  value is a string.
- This app keys every player value on Sleeper ids (`RAValuesBySleeperId`,
  `FCValuesBySleeperId`). Yahoo has its own ids and no Sleeper id anywhere.
- `normalizeName()` already exists in `src/lib/ktc/client.ts`, doing exactly the
  name reconciliation this needs, for KeepTradeCut.
- Ten page components import `@/lib/sleeper/client` directly. There is no
  provider abstraction to extend.
- `src/lib/league/manual.ts` exists for non-Sleeper leagues but is a stub: a
  manual league renders `ManualLeagueNotice` instead of any tools.
- There are no tests in this repo. The 2026-08-14 spec said "Add Vitest" and it
  was never done.

## Non-goals

- Matchups, standings, scout, and movers for the Yahoo league. Scoped out
  deliberately; those read weekly results and are worth doing only once the
  value tools prove the source works.
- Writing to Yahoo. No lineup edits, no add/drop, no trade proposals. Read only,
  and the OAuth scope requested is read only so this is enforced at the token.
- Multi-user OAuth. This app has one user and no login. The token belongs to
  Jack and lives in his environment.
- Migrating the Sleeper leagues onto a neutral provider interface. Rejected as
  approach B: it rewrites ten working pages to serve one league out of five.

## Architecture

Yahoo is adapted at its edge into the shapes this app already speaks, and the
value layer never learns Yahoo exists. This mirrors how KTC, RosterAudit and
FantasyCalc are each normalised to Sleeper ids on arrival.

### New: `src/lib/yahoo/`

- `oauth.ts` — exchanges `YAHOO_REFRESH_TOKEN` for an access token and caches it
  in Redis under `yahoo:token` for 55 minutes, five short of Yahoo's hour so a
  request never starts on a token that expires mid-flight. Exports
  `getAccessToken()` and a `MissingYahooConfigError` mirroring
  `MissingUsernameError`.
- `client.ts` — one fetch wrapper that appends `format=json`, attaches the
  bearer token, and on a 401 refreshes once and retries once. Never twice: a
  second 401 means the refresh token is revoked, which is a real error Jack must
  see rather than a transient one to paper over.
- `parse.ts` — unwraps Yahoo's numeric-keyed collections into plain arrays and
  coerces its stringy numbers. Pure, no fetching, and the most heavily tested
  file in the change.
- `types.ts` — the Yahoo shapes, as returned, before parsing.
- `playermap.ts` — maps a Yahoo player (name, team, position) to a Sleeper id
  using `normalizeName()` plus position, with team as tie-break. Returns matches
  and a list of unmatched players; it never guesses past a tie.

### Changed: `src/lib/league/`

- `types.ts` — `source` becomes `"sleeper" | "manual" | "yahoo"`.
- `detect.ts` — gains `profileFromYahoo(league, settings)` beside the existing
  `profileFromSleeper`. It reads scoring out of Yahoo's `stat_modifiers`:
  stat 11 is receptions and becomes `ppr`, stat 5 is passing touchdowns and
  becomes `passTd`. Those two stat ids are the commonly used mapping and are
  confirmed against the real league's settings fixture in Phase 1 before
  anything depends on them. Yahoo has no native TE premium, so `tePremium` is 0
  unless a custom modifier says otherwise. An unrecognised format defaults to redraft
  with `typeConfident: false`, the same smaller-claim rule Sleeper detection
  already uses.
- `discover.ts` — `getMyLeagues()` merges Sleeper profiles, Yahoo profiles and
  manual leagues. `resolveLeague()` routes on `.l.` to the Yahoo path.
- `data.ts` (new) — the only new abstraction, and it is thin. `getRosters(league)`,
  `getManagers(league)` and `getDraftPicks(league)` each switch on
  `league.source` and return the app's existing Sleeper-shaped types. Pages call
  these instead of importing the Sleeper client.

### New: `scripts/yahoo-login.mjs`

A terminal script Jack runs once. It prints the Yahoo authorise URL with
`redirect_uri=oob`, he approves in a browser, Yahoo shows him a code, he pastes
it back, and the script exchanges it and prints the refresh token to paste into
`.env.local` and Vercel. No server, no callback route, nothing public.

### Environment

`YAHOO_CLIENT_ID`, `YAHOO_CLIENT_SECRET`, `YAHOO_REFRESH_TOKEN`. All three
absent is the normal state for anyone who is not Jack, and the app must run
fine without them.

## Data flow

```
scripts/yahoo-login.mjs  ->  refresh token  ->  .env.local + Vercel
                                    |
                        oauth.ts (Redis, 55 min)
                                    |
discover.ts -> client.ts -> parse.ts -> profileFromYahoo -> LeagueProfile
                                    |
page -> resolveLeague(id) -> data.ts (switch on source)
                                    |
                     client.ts -> parse.ts -> playermap.ts
                                    |
              SleeperRoster-shaped rosters, keyed by Sleeper player id
                                    |
                        existing values / trade / draft layer
```

### Endpoints read

| Purpose | Path under `fantasy/v2` | Cache TTL |
| --- | --- | --- |
| My leagues | `/users;use_login=1/games;game_keys=nfl/leagues` | 24h |
| League settings | `/league/{key}/settings` | 24h |
| Teams and managers | `/league/{key}/teams` | 6h |
| A team's roster | `/team/{key}/roster` | 1h |
| Draft results | `/league/{key}/draftresults` | 24h |

Caching goes through the existing `cached()` helper under `yahoo:` keys, and
`/api/refresh` gains those keys so the refresh button clears them too.

## Error handling

- Missing Yahoo env: Yahoo leagues do not appear and every Sleeper league keeps
  working. The absence is logged once, not thrown, because a missing optional
  source is not a broken app.
- Revoked refresh token: a 401 that survives one refresh surfaces as a visible
  "reconnect Yahoo" state naming the script to run, not a silent empty league.
- Yahoo unreachable during discovery: fall back to the cached league list with a
  stale marker, matching the Sleeper behaviour already specified.
- Unmatched players: shown, never dropped. A roster that maps 14 of 16 players
  says so on screen and lists the two, because a trade evaluated against a
  roster silently missing two players is worse than one that admits it.

## Testing

Add Vitest, the debt the 2026-08-14 spec named and never paid. Test the pure
functions where being wrong is silent and expensive:

- `parse.ts` against captured fixtures of real Yahoo responses, including an
  empty collection and a single-item collection, which is where numeric-keyed
  JSON usually bites.
- `playermap.ts` on the cases that actually break name matching: suffixes
  (Marvin Harrison Jr), punctuation (Ja'Marr Chase), defences and kickers, and a
  genuine ambiguity that must return unmatched rather than a guess.
- `profileFromYahoo` scoring extraction against a real settings fixture: half
  PPR reads 0.5, a 6-point passing touchdown league reads 6.

Pages are not unit tested, consistent with the existing spec. The production
build plus checking the live league covers them.

## Phasing

**Phase 1, auth and discovery.** The login script, `oauth.ts`, `client.ts`,
`parse.ts`, `profileFromYahoo`, discovery. Done when the Yahoo league appears in
the switcher with the right name, team count and scoring, and no tool is wired.

**Phase 2, rosters.** `playermap.ts`, teams and rosters, unmatched surfaced.
Done when every roster in the league renders with values attached.

**Phase 3, tools.** `data.ts` routing, and the players, trade and draft pages
reading through it for both sources. Done when the trade builder prices a Yahoo
trade.

## Risks

- **Name matching is the whole thing.** If `playermap` is wrong, every value on
  screen is wrong in a way that looks fine. Mitigation: unmatched players are
  surfaced rather than dropped, and the mapper is tested before Phase 2 ships.
- **Yahoo's JSON shape is undocumented in practice.** The official docs describe
  the XML. Mitigation: Phase 1 captures real responses as fixtures first, and
  `parse.ts` is written against those rather than against a guess.
- **`oob` could be withdrawn.** It is deprecated in spirit across the industry
  even though Yahoo still serves it. Mitigation: if it fails, the fallback is a
  local HTTPS server on 127.0.0.1 with a self-signed certificate, which is what
  the Python `yahoofantasy` CLI does. Still no public route.
- **Three pages get a new data path.** Sleeper leagues could regress.
  Mitigation: `data.ts` returns the identical shapes for Sleeper, so the Sleeper
  path changes an import and nothing else, and each page is checked against a
  live Sleeper league before moving to the next.
