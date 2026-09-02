# Ingesting Jingles Labs from Substack

Design, 2026-09-02. Covers fantasy-hub; the signal-bot half is specified in
that repo.

## Why

`docs/refreshing-jingles.md` opens by explaining that the Lab 300 cannot be
automated: Reddit blocks unauthenticated reads, so reaching his posts needs a
logged-in browser that only exists on Jack's machine. The workflow it prescribes
is "read the posts locally, add entries, commit", which in practice means
re-keying 300 players out of a Google Drive PDF.

He launched a paid Substack on 2026-08-31. That constraint is gone.

Two things follow. The obvious one is that a manual chore disappears. The one
that actually matters is that he has said he will publish **full PPR** rankings
alongside half PPR, and Dah Chopped is a full-PPR league currently being advised
off a half-PPR list. Today the app papers over that with a warning on the draft
board. With both lists it simply becomes correct, and the draft is Friday.

## What his publication actually exposes

Verified against `www.jingleslabs.com` on 2026-09-02. Note the custom domain:
`jingleslabs.substack.com` returns 301.

| Route | Status | Gives |
|---|---|---|
| `/feed` | 200, no auth | Free posts as **complete** text in `content:encoded` |
| `/api/v1/archive` | 200, no auth | Per-post metadata including an `audience` field |
| `/api/v1/posts/{slug}` | undocumented | Per-post JSON, not relied on |

Paid posts appear in both, but the feed truncates their body at roughly 180
words ending in "Read more". Of his first five posts, four are `everyone` and
one is `only_paid`. At $29.99 a month the in-season waiver and betting content
is likely to go paid, so the design does not assume the free path will keep
working.

There is no official Substack API for reading posts. The 2026 developer API is
scoped to public profile lookup. These are frontend internals: cache them, time
them out, tolerate a 403 or an HTML response, and never treat them as a
contract.

## Two sources, one parser

**Free posts** come from the feed, which needs no credentials and works from a
Vercel function.

**Paid posts** come from Jack's Gmail over IMAP, using the app password
signal-bot already holds. This is the legitimate route: Substack delivers the
full post to a paying subscriber's inbox, and reading your own mail is not
circumventing a paywall. The alternative, replaying a Substack session cookie
from a server, is fragile, expires, and sits in a worse place under their terms.

Both paths hand the same HTML to the same parser. The source is recorded per
post so the UI can say where a number came from.

## Parsing

His rankings are far more structured than the prose the old doc was written
against. Each row is `1: Jahmyr Gibbs | RB1 | DET` under a `Tier N: 3rd Round`
heading. A block-aware strip (block tags become newlines, inline tags vanish)
followed by one regex parsed **300 of 300 rows with no gaps and no duplicates**,
carrying position, position rank, team and all 13 tier labels.

So the rule is:

- **Rankings are parsed deterministically and trusted.** They are a list, and a
  list that fails to parse fails loudly rather than partially.
- **Prose is not.** Target, fade and deep-dive posts are paragraphs with
  inconsistent formats: some give exact ranks against ADP, others give ranges.
  Anything drawn out of them is stored as an annotation with its source link and
  labelled as an extract, never as a fact the app asserts.

That line is the same judgement the hand-curated file already made. It is being
kept, not relaxed.

### Resolving names to Sleeper ids

The posts carry name, position and team; the app keys everything on Sleeper
player ids. Matching is normalized name plus position, with team as a
tiebreaker. Unresolved players are **reported, never dropped silently** - the
v2.0 curation resolved 295 of 300 by hand and the 5 that needed a lookup are
exactly the ones an automated pass must surface rather than swallow.

## Format awareness

The reason this work is worth doing before Friday.

`LAB_300_APPLIES_TO` is already `["redraft", "guillotine"]`, so dynasty is
excluded. What is new is that a list now carries its own scoring, and a league
reads the list matching its own:

| League | Scoring | Reads |
|---|---|---|
| Dah Chopped | full PPR | full-PPR list when published, half PPR until then |
| 2026 Half PPR | half PPR | half-PPR list |
| Sunday Scaries #2 | full PPR | full-PPR list when published |
| Dah Dynasty | n/a | neither, as today |

Where a league is served a list that does not match its scoring, the existing
skew note stays. It is a stopgap that should disappear on its own the week he
posts full PPR.

## Storage and scheduling

Ingested lists go to Upstash keyed by scoring and version, with the previous
version retained so a refresh can show what moved rather than silently
replacing 300 rows. The hand-curated `data.ts` stays as the fallback and as the
shape everything downstream already consumes; ingestion fills the same
structures.

**Vercel Hobby allows two cron jobs and both are used** (`/api/snapshot` and
`/api/faab-email`). So ingestion folds into the daily snapshot run, plus an
opportunistic check on page render, which is the pattern the roster-grade
history already uses. No third cron is available and none is needed: he posts a
few times a week, not hourly.

## Scope

Jack's own reading. Content stays inside his apps, is credited and linked to the
original post wherever it renders, and annotates values rather than replacing
them. Nothing is republished.
