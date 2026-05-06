import {
  revalidateAllPlayers,
  revalidateDraft,
  revalidateLeague,
  getLeagueDrafts,
} from "@/lib/sleeper/client";

export const dynamic = "force-dynamic";

// POST /api/refresh — invalidates the Upstash cache entries that mirror
// Sleeper's mutable league state (rosters, users, league settings, draft
// picks, all-players slim). Next page render re-fetches fresh from
// Sleeper. RA caches stay on their own TTLs.
export async function POST() {
  const leagueId = process.env.SLEEPER_LEAGUE_ID;
  if (!leagueId) {
    return Response.json(
      { ok: false, error: "Missing SLEEPER_LEAGUE_ID" },
      { status: 400 },
    );
  }
  try {
    await revalidateLeague(leagueId);
    await revalidateAllPlayers();
    // Also bust draft + draft picks caches if any drafts exist
    const drafts = await getLeagueDrafts(leagueId).catch(() => []);
    for (const d of drafts) {
      await revalidateDraft(d.draft_id);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
