import "server-only";
import {
  getAllPlayers,
  getLeague,
  getLeagueRosters,
  getLeagueUsers,
  revalidateAllPlayers,
  revalidateLeague,
} from "@/lib/sleeper/client";

export const dynamic = "force-dynamic";

async function timed<T>(label: string, fn: () => Promise<T>) {
  const start = performance.now();
  const value = await fn();
  const ms = Math.round(performance.now() - start);
  let size: number | undefined;
  if (Array.isArray(value)) size = value.length;
  else if (value && typeof value === "object") size = Object.keys(value).length;
  return { label, ms, size };
}

export async function GET(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "disabled outside development" }, { status: 404 });
  }

  const leagueId = process.env.SLEEPER_LEAGUE_ID;
  if (!leagueId) {
    return Response.json({ error: "Missing SLEEPER_LEAGUE_ID" }, { status: 400 });
  }

  const url = new URL(req.url);
  if (url.searchParams.get("flush") === "1") {
    await revalidateLeague(leagueId);
    await revalidateAllPlayers();
  }

  const cold = {
    league: await timed("league", () => getLeague(leagueId)),
    rosters: await timed("rosters", () => getLeagueRosters(leagueId)),
    users: await timed("users", () => getLeagueUsers(leagueId)),
    players: await timed("players", () => getAllPlayers()),
  };

  const warm = {
    league: await timed("league", () => getLeague(leagueId)),
    rosters: await timed("rosters", () => getLeagueRosters(leagueId)),
    users: await timed("users", () => getLeagueUsers(leagueId)),
    players: await timed("players", () => getAllPlayers()),
  };

  return Response.json({ cold, warm });
}
