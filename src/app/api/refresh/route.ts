import {
  getLeague,
  getLeagueDrafts,
  getLeagueRosters,
  getLeagueUsers,
  revalidateAllPlayers,
  revalidateDraft,
  revalidateLeague,
} from "@/lib/sleeper/client";
import {
  formatKeyFromLeague,
  revalidateGrades,
  revalidateMovers,
  revalidatePicks,
  revalidateValues,
} from "@/lib/rosteraudit/client";

export const dynamic = "force-dynamic";

// POST /api/refresh — invalidates Upstash cache entries that mirror
// any data that responds to live league activity, then triggers a
// re-fetch on next page render. Covers:
//
//   Sleeper:  league, rosters, users, traded picks, all NFL players,
//             every draft + its picks for the league.
//   RA:       values for the league's format, picks (rolling 4-year
//             window), movers, roster grades for every league member.
//
// Player profile / stats and KTC keep their own TTLs since they
// don't depend on league state. League history likewise.
export async function POST() {
  const leagueId = process.env.SLEEPER_LEAGUE_ID;
  if (!leagueId) {
    return Response.json(
      { ok: false, error: "Missing SLEEPER_LEAGUE_ID" },
      { status: 400 },
    );
  }
  try {
    // Run Sleeper invalidations + RA-format lookup in parallel where we can.
    const [league, drafts, rosters, users] = await Promise.all([
      getLeague(leagueId).catch(() => null),
      getLeagueDrafts(leagueId).catch(() => []),
      getLeagueRosters(leagueId).catch(() => []),
      getLeagueUsers(leagueId).catch(() => []),
    ]);

    const userIds = new Set<string>();
    for (const r of rosters) {
      if (r.owner_id) userIds.add(r.owner_id);
    }
    for (const u of users) {
      if (u.user_id) userIds.add(u.user_id);
    }

    const tasks: Promise<unknown>[] = [
      revalidateLeague(leagueId),
      revalidateAllPlayers(),
      revalidatePicks(),
      revalidateMovers(),
      revalidateGrades(leagueId, [...userIds]),
    ];
    if (league) {
      tasks.push(revalidateValues(formatKeyFromLeague(league)));
    }
    for (const d of drafts) {
      tasks.push(revalidateDraft(d.draft_id));
    }

    await Promise.all(tasks);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
