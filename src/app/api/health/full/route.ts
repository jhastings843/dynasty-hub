import "server-only";

import { redis } from "@/lib/redis/client";
import { getLeague, getUser } from "@/lib/sleeper/client";

export const dynamic = "force-dynamic";

type Check =
  | { status: "ok"; detail?: string }
  | { status: "fail"; reason: string };

function fail(e: unknown): Check {
  return { status: "fail", reason: e instanceof Error ? e.message : String(e) };
}

async function checkUpstash(): Promise<Check> {
  try {
    const k = "dh:healthcheck";
    const v = `dh-check-${Date.now()}`;
    await redis.set(k, v, { ex: 60 });
    const got = await redis.get<string>(k);
    if (got !== v) {
      return { status: "fail", reason: `round-trip mismatch (got ${typeof got})` };
    }
    return { status: "ok", detail: "set/get round-trip" };
  } catch (e) {
    return fail(e);
  }
}

async function checkSleeper(): Promise<Check> {
  try {
    const username = process.env.SLEEPER_USERNAME;
    const leagueId = process.env.SLEEPER_LEAGUE_ID;
    if (!username) return { status: "fail", reason: "Missing SLEEPER_USERNAME" };
    if (!leagueId) return { status: "fail", reason: "Missing SLEEPER_LEAGUE_ID" };

    const [user, league] = await Promise.all([
      getUser(username),
      getLeague(leagueId),
    ]);
    const displayUser = user.display_name ?? user.username ?? user.user_id;
    return {
      status: "ok",
      detail: `user=${displayUser}, league="${league.name}" season=${league.season}`,
    };
  } catch (e) {
    return fail(e);
  }
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return Response.json(
      { error: "disabled outside development" },
      { status: 404 },
    );
  }

  const [upstash, sleeper] = await Promise.all([
    checkUpstash(),
    checkSleeper(),
  ]);

  const ok = [upstash, sleeper].every((c) => c.status === "ok");

  return Response.json({ ok, upstash, sleeper });
}
