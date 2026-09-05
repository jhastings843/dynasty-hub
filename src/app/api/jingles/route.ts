import {
  CALLS_BY_SLEEPER_ID,
  LAB_300_APPLIES_TO,
  LAB_300_VERSION,
  LAST_UPDATED,
} from "@/lib/jingles/data";
import { labForScoring } from "@/lib/jingles/active";
import type { Scoring } from "@/lib/jingles/parse";

export const dynamic = "force-dynamic";

// GET /api/jingles - the Lab 300, in rank order, with Jingles' own call
// attached where he has made one.
//
// This exists so Atlas can answer "top 10 from the Jingles list" in the chat
// instead of queueing a job to read a file off Jack's Mac. It told him the list
// was on his Mac, which was wrong: this file is compiled into this deployment
// and always has been. Nothing exposed it.
//
// Read only, and public like the rest of this app's API. Every entry already
// carries the post it came from, because it is research Jingles publishes.
//
// The response says which formats this applies to, and it is not decoration.
// Atlas reads this endpoint and cannot see the league a question is about, so
// without `appliesTo` in the payload the natural thing for it to do is quote a
// redraft rank at a dynasty trade. These are half-PPR redraft rankings: a bet
// on the next four months, not on the next three years.
const MAX_LIMIT = 300;
const DEFAULT_LIMIT = 25;

// Normalised for name matching: case, punctuation and the generational suffixes
// that the same player carries in one source and not the other.
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const SCORINGS: Scoring[] = ["half_ppr", "full_ppr", "standard"];

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  // Whichever of his lists is asked for, defaulting to the one he publishes
  // first and the one most of Jack's redraft leagues are. The list that comes
  // back is the ingested one when there is one, and the shipped file when there
  // is not, and the response says which.
  const asked = (params.get("scoring") ?? "").trim().toLowerCase() as Scoring;
  const scoring: Scoring = SCORINGS.includes(asked) ? asked : "half_ppr";
  const lab = await labForScoring(scoring);

  const rawLimit = Number(params.get("limit"));
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
      : DEFAULT_LIMIT;

  // Jingles labels a defence "DST" where Sleeper says "DEF". Accept either
  // rather than making the caller know which vocabulary this list uses.
  const position = (params.get("position") ?? "").trim().toUpperCase();
  const wanted = position === "DEF" ? "DST" : position;

  // Look a player up by name.
  //
  // Without this the only way to reach rank 93 was to pull 93 players, so on
  // 2026-08-30 Jack asked Atlas "Tony Pollard or Josh Jacobs in redraft" and got
  // "both sit somewhere below rank 57 and I cannot see their exact spots". The
  // answer was in the list the whole time. Comma-separated so a comparison is
  // one call rather than one per player.
  const namesParam = (params.get("player") ?? params.get("q") ?? "").trim();
  const names = namesParam
    ? namesParam.split(",").map((n) => norm(n)).filter(Boolean)
    : [];

  const byPosition = wanted
    ? lab.list.filter((e) => e.position.toUpperCase() === wanted)
    : lab.list;

  // A name search returns everyone asked for, in rank order, and ignores the
  // limit: asking for three players and being handed two because of a default
  // page size is the kind of quiet truncation that started this.
  const matching = names.length
    ? byPosition.filter((e) => {
        const n = norm(e.name);
        return names.some((want) => n === want || n.includes(want) || want.includes(n));
      })
    : byPosition;

  const players = (names.length ? matching : matching.slice(0, limit)).map((e) => {
    const call = CALLS_BY_SLEEPER_ID[e.sleeperId];
    return {
      rank: e.rank,
      name: e.name,
      position: e.position,
      positionRank: e.positionRank,
      team: e.team,
      tier: lab.tierFor(e.sleeperId),
      call: call
        ? {
            verdict: call.verdict,
            note: call.note,
            adp: call.adp ?? null,
            jinglesRank: call.jinglesRank ?? null,
            sourceUrl: call.sourceUrl,
          }
        : null,
    };
  });

  return Response.json({
    ok: true,
    appliesTo: LAB_300_APPLIES_TO,
    scopeNote:
      `${lab.scoring === "full_ppr" ? "Full-PPR" : lab.scoring === "standard" ? "Standard" : "Half-PPR"} redraft rankings. They apply to redraft and guillotine leagues only, and are not a dynasty opinion: do not use them for dynasty values or dynasty trades.`,
    updated: LAST_UPDATED,
    // Which list this actually is. "curated" means nothing has been ingested
    // yet and this is the file that shipped, which is a real answer and is said
    // out loud rather than passed off as the newest thing he posted.
    source: lab.source,
    scoring: lab.scoring,
    labVersion: lab.source === "curated" ? LAB_300_VERSION : null,
    labTitle: lab.title,
    labPosted: lab.postedAt,
    labUrl: lab.url,
    count: players.length,
    total: matching.length,
    // Say when a name found nothing, rather than returning an empty list that
    // reads like "he is not ranked" when it might be a spelling difference.
    notFound: names.length
      ? namesParam
          .split(",")
          .map((n) => n.trim())
          .filter((n) => n && !players.some((p) => norm(p.name) === norm(n) || norm(p.name).includes(norm(n))))
      : [],
    players,
  });
}
