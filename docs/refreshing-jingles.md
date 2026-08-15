# Refreshing Jingles Labs

`src/lib/jingles/data.ts` is a hand-curated snapshot of r/JoeInglesOfficial.
He posts often, so it goes stale quickly. This is how to update it.

## Why it is not automatic

Reddit blocks unauthenticated reads, so there is no path from a Vercel
function to the subreddit. Reaching it needs a logged-in browser session,
which only exists on your machine. Scheduled scraping of one person's
subreddit is also not something this project should do.

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

He announced a top-300 half-PPR ranking and referred to building it in Lab
Notes #002, but it has not been published. `LAB_300` is `null` and nothing in
the app assumes he publishes rankings. If it ships, it belongs here as a
ranking source rather than a set of individual calls, and the `/resources`
entry for him should be updated to say so.

## Attribution

His research, credited and linked wherever it renders. It annotates values
rather than overriding them. If any of this is ever made public, ask him first.
