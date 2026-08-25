import Link from "next/link";
import {
  formatKeyFromLeague,
  getPicks,
} from "@/lib/rosteraudit/client";
import { computeTeamSummaries } from "@/lib/dynasty/power-rankings";
import {
  getAllPlayers,
  getLeague,
  getLeagueRosters,
  getLeagueUsers,
  getUser,
} from "@/lib/sleeper/client";
import TradeBuilder from "./TradeBuilder";
import { RefreshButton } from "@/components/RefreshButton";
import { getValuesForProfile } from "@/lib/values";
import { profileFromSleeper } from "@/lib/league/detect";

export const dynamic = "force-dynamic";

function ConfigError({ message }: { message: string }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex max-w-2xl flex-col gap-3">
        <Link
          href="/"
          className="text-sm text-zinc-500 dark:text-zinc-400"
        >
          ‹ Leagues
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          Trade analyzer
        </h1>
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-300">
          {message}
        </p>
      </div>
    </main>
  );
}

export default async function TradePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const username = process.env.SLEEPER_USERNAME;
  if (!username) {
    return <ConfigError message="Missing SLEEPER_USERNAME in .env.local" />;
  }

  const league = await getLeague(leagueId);
  const raFormat = formatKeyFromLeague(league);
  const isSuperflex = raFormat.startsWith("sf");

  const [me, rosters, users, players, fcValues, picks] = await Promise.all([
    getUser(username),
    getLeagueRosters(leagueId),
    getLeagueUsers(leagueId),
    getAllPlayers(),
    getValuesForProfile(profileFromSleeper(league), league).then((r) => r.values),
    getPicks(),
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
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Link
            href={`/l/${leagueId}`}
            className="text-sm text-zinc-500 dark:text-zinc-400"
          >
            ‹ League
          </Link>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              Trade analyzer
            </h1>
            <RefreshButton leagueId={leagueId} />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {league.name} · {league.season}
          </p>
        </div>
        <TradeBuilder
          teams={teams}
          myRosterId={myRoster.roster_id}
          picks={picks}
          isSuperflex={isSuperflex}
        />

      </div>
    </main>
  );
}
