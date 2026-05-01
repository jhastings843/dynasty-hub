import "server-only";

import createBrowserClient from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/server";
import { redis } from "@/lib/redis/client";
import { getLeague, getUser } from "@/lib/sleeper/client";

export const dynamic = "force-dynamic";

type Check =
  | { status: "ok"; detail?: string }
  | { status: "fail"; reason: string };

function fail(e: unknown): Check {
  return { status: "fail", reason: e instanceof Error ? e.message : String(e) };
}

async function checkSupabase(): Promise<Check> {
  try {
    createBrowserClient();
    createAdminClient();

    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const probe = `${url}/rest/v1/_dh_probe?select=*&limit=0`;

    const realRes = await fetch(probe, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (realRes.status === 401) {
      return { status: "fail", reason: "Service role key rejected (401)" };
    }
    if (realRes.status >= 500) {
      return { status: "fail", reason: `Supabase project unhealthy (${realRes.status})` };
    }

    const badRes = await fetch(probe, {
      headers: { apikey: "not-a-real-key" },
      cache: "no-store",
    });
    if (badRes.status !== 401) {
      return { status: "fail", reason: `Gateway not enforcing auth (bad key returned ${badRes.status})` };
    }

    return {
      status: "ok",
      detail: `creds accepted (real=${realRes.status}, bad=${badRes.status})`,
    };
  } catch (e) {
    return fail(e);
  }
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

  const [supabase, upstash, sleeper] = await Promise.all([
    checkSupabase(),
    checkUpstash(),
    checkSleeper(),
  ]);

  const ok = [supabase, upstash, sleeper].every((c) => c.status === "ok");

  return Response.json({ ok, supabase, upstash, sleeper });
}
