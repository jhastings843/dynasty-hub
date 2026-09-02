# Guillotine weekly FAAB advisor

Design, 2026-09-01. For Dah Chopped League (Sleeper `1398797523958652928`).

## The problem

Every week a team is chopped and its whole roster hits waivers. FAAB is the
only way to acquire anyone, it never replenishes, and it is worth nothing the
moment you are eliminated. So each week has one real question: spend, or hold,
and if spend, on whom and how much.

Answering it by hand means holding six things in your head at once: your own
elimination risk, where the chop line probably falls, what the pool actually
contains, what each player is worth *to your starting lineup* rather than in
the abstract, what your rivals can still afford to bid, and how much budget you
can spend now without being broke in the endgame. That is the thing to
automate.

## What this league actually is

Read live from Sleeper, not assumed. Several of these differ from the standard
the published guillotine strategy is written against.

| Setting | Value | Consequence |
|---|---|---|
| Teams | 16 | Not the 18-team standard. 15 chops, not 17. Baseline weekly risk 6.25%. |
| Scoring | Full PPR, 4-pt pass TD | The Lab 300 is half PPR. Receiving backs and slot receivers are underpriced by it here. |
| Roster | QB, RB, RB, WR, WR, TE, FLEX, FLEX, 6 BN, 2 IR | Eight starters. No K, no DST: those positions are excluded from the pool entirely. |
| FAAB | $1000, min bid $1 | |
| Waivers | Process day-of-week code 2, clear 1 day | Guide lands Tuesday morning. |
| Trades | **Disabled** | No consolidating two bench pieces into a starter. Every upgrade is a bid. |
| Keepers | 1 | |

Sleeper natively supports guillotine as `settings.type: 3`, which is
undocumented in their API reference and contradicted by their own help article.
The app previously reached "guillotine" by regex-matching the axe emoji in the
league name and marked the format as a guess. It now reads the type code.

## Governing model

Four ideas, each earning its own module.

**1. Elimination risk is a probability, not a rank.** Finishing 12th of 16 is
not "safe"; it is a sample from a distribution whose left tail is elimination.
So the week's posture comes from a Monte Carlo over projected team scores, not
from a bottom-third rank threshold. Output is one number: the chance you are
this week's low scorer.

**2. A player is worth what he adds to your STARTING lineup.** Not his
projection, not his rank. A 14-point WR is worth nothing to a team already
starting four better ones, and a 9-point TE is worth 9 points to a team whose
TE is on bye. Every bid is priced on marginal starting points, which requires
solving the optimal lineup twice: with the player and without.

**3. Budget pacing runs on eliminations remaining, not the calendar.** The
existing `guillotine.ts` gates on month, which was written for an 18-team
league running to December. In a 16-team league starting Week 1, five teams
remain around Week 11. Neutral allowance is `remaining FAAB / eliminations
remaining`, which is about $67 here at the start.

**4. Price against the room, not against an article.** Every rival's remaining
FAAB is public (`waiver_budget_used` on each roster), and every winning bid is
public in the transaction feed. Weeks 1 and 2 have no history, so the model is
seeded with published benchmarks and blends toward observed league behavior as
bids accumulate.

## Modules

All under `src/lib/guillotine/`. Pure logic separated from fetching so the math
is testable without a network.

| Module | Responsibility |
|---|---|
| `scoring.ts` | Score a raw Sleeper projection stat line under a `LeagueProfile`. This is what makes full PPR and 4-pt pass TD real instead of borrowed. |
| `projections.ts` | Fetch and cache Sleeper's weekly projections. |
| `lineup.ts` | Solve the best legal starting lineup for a roster given `roster_positions`. Used for both my team and every rival. |
| `chop-line.ts` | Monte Carlo the field. Returns each team's projected score, the expected chop line, and each team's probability of finishing last. |
| `pool.ts` | Who is actually available, filtered to positions the league starts, flagged by whether they came off the chopped roster. |
| `needs.ts` | My weakest starting slots, bye holes 1 to 4 weeks out, and the marginal starting value of any candidate. |
| `market.ts` | What things cost here: rivals' balances, purchasing-power share, observed winning bids blended with published priors. |
| `budget.ts` | Posture (spend / selective / hold), the week's spend cap, elimination-count pacing. |
| `recommend.ts` | The bid card. Tiers, dollar ranges with walk-away numbers, paired drops, mutually exclusive fallback chains, max possible spend. |
| `report.ts` | Assembles one `WeeklyFaabReport`. Single source of truth. |
| `email.ts` | Renders that report to mobile-first HTML. |

## Delivery

One report object, three consumers, so they cannot drift:

- `/l/[leagueId]/faab` renders it in the app, guillotine leagues only.
- `/api/faab?league=<id>` returns it as JSON, an Atlas source like the draft
  board.
- `/api/cron/faab-email` renders it to email and sends via Resend, Tuesday
  morning.

This is the same extraction the live draft board needed: the assembly lives in
`lib`, and every consumer calls it.

## Degrading honestly

The league has not drafted and the season starts Sep 9, so the first several
runs of this thing have thin inputs. Rather than inventing confidence:

- Before the draft: the report says so and shows nothing else.
- Weeks 1 and 2: no chop has happened, no bids observed. Market prices come
  from published priors and are labeled as such.
- Byes and injuries are read from the projection feed; a player Sleeper has no
  projection for is excluded rather than assumed to be zero or assumed to be
  fine.

Every number in the output carries where it came from. A confident wrong answer
is worse than a hedged right one in a format where one bad week ends the season.

## Sources

Researched 2026-09-01. Full synthesis retained in `docs/guillotine-strategy.md`.

- Fantasy Life, FAAB management and monthly pacing
- Fantasy Life, adjusting bidding strategy / 12 survivors / endgame
- RotoWire, how much FAAB to bid ($200/$40/$10 per $1000 tiers)
- DraftSharks, best guillotine strategy (70-75% to anchors)
- Footballguys, guide to guillotine leagues
- Fantasy Alarm, 2026 guillotine strategy
- guillotineleagues.com, waiver and tie-break rules
- r/GuillotineLeagues and r/fantasyfootball, "Ride the Line" and practitioner pacing
