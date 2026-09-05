# Refreshing Jingles Labs

> **Mostly obsolete as of 2026-09-05.** Rankings are ingested automatically now,
> free posts from the Substack feed and paid ones from Jack's email, and the
> app prefers the ingested list over `data.ts` wherever it can reach one.
> `src/lib/jingles/data.ts` is the fallback, not the source. You would follow
> the steps below only to change that fallback, which is rare. Everything about
> what actually runs is in
> `docs/superpowers/specs/2026-09-02-jingles-substack-ingestion-design.md`, and
> `/api/jingles-ingest` with no arguments tells you what has been pulled and
> when.

`src/lib/jingles/data.ts` is a hand-curated snapshot of r/JoeInglesOfficial.
He posts often, so it goes stale quickly. This is how to update it.

## Why it was not automatic

Reddit blocks unauthenticated reads, so there was no path from a Vercel
function to the subreddit. Reaching it needed a logged-in browser session,
which only exists on your machine. Scheduled scraping of one person's
subreddit is also not something this project should do.

He launched a Substack on 2026-08-31, which is where the posts are now, and
that constraint is gone.

So: read the posts locally, add entries, commit. Two minutes when he posts.

## What to capture

He publishes four things. Only the first three belong in the data file.

| Post type | Example | Goes in as |
| --- | --- | --- |
| Players he is high on vs ADP | "Black Labs", "10 guys I'm taking everywhere" | `verdict: "target"` |
| Players he is low on vs ADP | "10 Guys I'm Avoiding At Current ADP" | `verdict: "fade"` |
| Single-player deep dive | "Lab Notes #002: The Cook" | `verdict: "league_winner"` |
| Tier lists | "Backup RB Tiers" | `BACKUP_RB_TIERS` |

Targets and fades usually carry an explicit rank: `Travis Etienne: ADP RB19 /
40 Overall -> My Rank RB25 / 60 Overall`. Copy both sides verbatim, including
ranges like "Top 35 RB", because he is inconsistent about it and the
inconsistency is real information.

Deep dives have no rank. They end in a verdict, usually "Lab Certified" or
"that's a league winner". Leave `adp` and `jinglesRank` off those entries.

Lab Notes that are pure narrative with no player call do not go in.

## Steps

1. List recent posts:

   ```
   opencli reddit subreddit JoeInglesOfficial --limit 30 -f yaml
   ```

2. Read anything new. The default read truncates long posts, so raise the cap:

   ```
   opencli reddit read <post-id> --max-length 30000 --limit 1 --depth 1 -f json
   ```

3. Add entries to `JINGLES_CALLS`. Resolve each player to a Sleeper id against
   `https://api.sleeper.app/v1/players/nfl`. Watch for name mismatches: Sleeper
   lists "Kenny Gainwell" where he writes "Kenneth Gainwell", and he uses joke
   names ("Jackson Mahomes brother" is Patrick Mahomes).

4. Prefer a post on his own subreddit as `sourceUrl` over a crosspost.

5. Bump `LAST_UPDATED`. It renders under every call as "pulled <date>", so a
   stale take looks stale instead of looking current.

## The Lab 300

Shipped 2026-08-16 as Version 1.0. He publishes it as a Google Drive PDF linked
from the post, not as text, and has said it will be updated through the
preseason as depth charts and camp battles resolve. The redraft draft board is
ordered by it.

To re-pull a new version:

1. Get the Drive file id from the post link, then download and extract:

   ```
   curl -sL "https://drive.google.com/uc?export=download&id=<FILE_ID>" -o lab300.pdf
   pdftotext -layout lab300.pdf lab300.txt
   ```

2. Lines look like `12: Chase Brown | RB8 | CIN`, grouped under tier headers
   like `Tier 4: 3rd Round`. Two caveats seen in v1.0: he occasionally drops
   the colon after the rank (`42 Terry McLaurin`), so make it optional, and he
   writes `DST` where Sleeper's roster slot is `DEF`.

3. Resolve names to Sleeper ids. v1.0 had five spelling variants worth knowing
   about: Tajh/Tahj Brooks, Semaj/Samaje Perine, Skylar/Skyler Bell, Jake/Jack
   Bech, and Josh/Joshua Palmer. Team defenses use the team abbreviation as the
   Sleeper id.

4. Regenerate `LAB_300_RAW`, and bump `LAB_300_VERSION` and `LAB_300_POSTED`.
   The board shows the version, so a stale ranking is visible.

Unlike FantasyCalc's redraft set, the Lab 300 covers team defenses and kickers,
which is why the board can rank a DEF slot at all.

## Attribution

His research, credited and linked wherever it renders. It annotates values
rather than overriding them. If any of this is ever made public, ask him first.
