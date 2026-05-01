import Link from "next/link";
import {
  fcFormatFromLeague,
  getDynastyValues,
} from "@/lib/fantasycalc/client";
import { computeTeamSummaries } from "@/lib/dynasty/power-rankings";
import {
  getAllPlayers,
  getLeague,
  getLeagueRosters,
  getLeagueUsers,
  getUser,
} from "@/lib/sleeper/client";
import TradeBuilder from "./TradeBuilder";

export const dynamic = "force-dynamic";

function ConfigError({ message }: { message: string }) {
  return (
    <main className="min-h-dvh bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        <Link
          href="/dynasty"
          className="text-sm text-zinc-500 dark:text-zinc-400"
        >
          ‹ Dynasty
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Trade analyzer
        </h1>
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-300">
          {message}
        </p>
      </div>
    </main>
  );
}

export default async function TradePage() {
  const username = process.env.SLEEPER_USERNAME;
  const leagueId = process.env.SLEEPER_LEAGUE_ID;
  if (!username) {
    return <ConfigError message="Missing SLEEPER_USERNAME in .env.local" />;
  }
  if (!leagueId) {
    return <ConfigError message="Missing SLEEPER_LEAGUE_ID in .env.local" />;
  }

  const league = await getLeague(leagueId);
  const fcFormat = fcFormatFromLeague(league);

  const [me, rosters, users, players, fcValues] = await Promise.all([
    getUser(username),
    getLeagueRosters(leagueId),
    getLeagueUsers(leagueId),
    getAllPlayers(),
    getDynastyValues(fcFormat),
  ]);

  const myRoster = rosters.find((r) => r.owner_id === me.user_id);
  if (!myRoster) {
    return (
      <ConfigError
        message={`No roster found in this league for ${username}.`}
      />
    );
  }

  const teams = computeTeamSummaries(rosters, users, players, fcValues);

  return (
    <main className="min-h-dvh bg-zinc-50 px-4 py-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Link
            href="/dynasty"
            className="text-sm text-zinc-500 dark:text-zinc-400"
          >
            ‹ Dynasty
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Trade analyzer
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {league.name} · {league.season}
          </p>
        </div>
        <TradeBuilder teams={teams} myRosterId={myRoster.roster_id} />
      </div>
    </main>
  );
}
