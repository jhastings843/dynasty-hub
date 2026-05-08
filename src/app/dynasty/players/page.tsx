import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  getValuesForLeague,
  getMovers,
} from "@/lib/rosteraudit/client";
import type { RAMover } from "@/lib/rosteraudit/types";
import {
  getAllPlayers,
  getLeague,
  getLeagueRosters,
  getLeagueUsers,
  getUser,
} from "@/lib/sleeper/client";
import type { SleeperPlayer, SleeperUser } from "@/lib/sleeper/types";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerLink } from "@/components/PlayerLink";
import { RefreshButton } from "@/components/RefreshButton";
import { computeTeamSummaries } from "@/lib/dynasty/power-rankings";
import { PlayerSearch, type SearchablePlayer } from "./PlayerSearch";

export const dynamic = "force-dynamic";

const TRACKED_POSITIONS = ["QB", "RB", "WR", "TE"] as const;

const POSITION_TINT: Record<string, string> = {
  QB: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  RB: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  WR: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  TE: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

function ConfigError({ message }: { message: string }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex max-w-2xl flex-col gap-3">
        <Link
          href="/dynasty"
          className="text-sm text-zinc-500 dark:text-zinc-400"
        >
          ‹ Dynasty
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Players</h1>
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-300">
          {message}
        </p>
      </div>
    </main>
  );
}

function nameOf(p: SleeperPlayer): string {
  if (p.full_name) return p.full_name;
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.player_id;
}

function PositionChip({ position }: { position: string }) {
  const cls =
    POSITION_TINT[position] ??
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {position}
    </span>
  );
}

function MoverCard({ m, direction }: { m: RAMover; direction: "up" | "down" }) {
  const trend30 = m.trend30Day;
  const trend7 = m.trend7Day;
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <PlayerAvatar name={m.name} position={m.position} size="sm" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <PlayerLink
              id={m.sleeperId}
              name={m.name}
              className="truncate text-sm font-medium"
            />
            <PositionChip position={m.position} />
          </div>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {m.valueSf.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-zinc-500 dark:text-zinc-400">
          {[m.team ?? "FA", m.age ? `age ${Math.round(m.age * 10) / 10}` : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <div className="flex items-center gap-2 tabular-nums">
          {trend7 !== 0 && (
            <span
              className={
                trend7 > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }
            >
              7d {trend7 > 0 ? "+" : ""}
              {trend7}
            </span>
          )}
          {trend30 !== 0 && (
            <span
              className={
                trend30 > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }
            >
              30d {trend30 > 0 ? "+" : ""}
              {trend30}
            </span>
          )}
          {trend7 === 0 && trend30 === 0 && (
            <span className="text-zinc-400 dark:text-zinc-600">
              {direction === "up" ? "rising" : "falling"}
            </span>
          )}
        </div>
      </div>
      {(m.buyLow || m.sellHigh || m.breakout) && (
        <div className="flex flex-wrap gap-1">
          {m.buyLow && (
            <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              Buy low
            </span>
          )}
          {m.sellHigh && (
            <span className="shrink-0 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
              Sell high
            </span>
          )}
          {m.breakout && (
            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              Breakout
            </span>
          )}
        </div>
      )}
    </li>
  );
}

export default async function PlayersPage() {
  const username = process.env.SLEEPER_USERNAME;
  const leagueId = process.env.SLEEPER_LEAGUE_ID;
  if (!username) {
    return <ConfigError message="Missing SLEEPER_USERNAME in .env.local" />;
  }
  if (!leagueId) {
    return <ConfigError message="Missing SLEEPER_LEAGUE_ID in .env.local" />;
  }

  const me = await getUser(username);
  const league = await getLeague(leagueId);

  const [rosters, users, allPlayers, raValues, movers] = await Promise.all([
    getLeagueRosters(leagueId),
    getLeagueUsers(leagueId),
    getAllPlayers(),
    getValuesForLeague(league),
    getMovers(30),
  ]);

  const usersById = new Map(users.map((u: SleeperUser) => [u.user_id, u]));
  const myRoster = rosters.find((r) => r.owner_id === me.user_id);

  // Set of every player ID currently rostered by anyone in the league.
  const rosteredIds = new Set<string>();
  const ownerByPlayerId = new Map<string, string>();
  for (const r of rosters) {
    const owner = r.owner_id ? usersById.get(r.owner_id) : null;
    const ownerName =
      owner?.metadata?.team_name ||
      owner?.display_name ||
      owner?.username ||
      `Roster ${r.roster_id}`;
    for (const id of r.players ?? []) {
      rosteredIds.add(id);
      ownerByPlayerId.set(id, ownerName);
    }
  }

  // Compute my weakest positions so we can suggest waiver fits there.
  const teams = computeTeamSummaries(rosters, users, allPlayers, raValues);
  const myTeam = teams.find((t) => t.rosterId === myRoster?.roster_id);
  const myWeakPositions = myTeam
    ? (TRACKED_POSITIONS as readonly string[])
        .map((p) => ({ p, rank: myTeam.positionRanks[p] ?? 99 }))
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 2)
        .map((x) => x.p)
    : [];

  // Build the searchable index across the whole NFL slim set. Skip
  // players with no name or no position (mostly noise rows).
  const searchablePlayers: SearchablePlayer[] = [];
  for (const p of Object.values(allPlayers)) {
    const name = nameOf(p);
    if (!name) continue;
    const position = p.position ?? null;
    if (
      position &&
      !TRACKED_POSITIONS.includes(position as (typeof TRACKED_POSITIONS)[number])
    ) {
      // Skip K/DEF/etc. for the searchable pool — Jack only cares about
      // skill positions.
      continue;
    }
    const v = raValues[p.player_id];
    searchablePlayers.push({
      id: p.player_id,
      name,
      position,
      team: p.team ?? null,
      value: v?.value ?? 0,
      photoUrl: v?.photoUrl ?? null,
      rostered: rosteredIds.has(p.player_id),
      ownerName: ownerByPlayerId.get(p.player_id) ?? null,
    });
  }

  // Waiver fits: unrostered, in my weakest positions, sorted by value.
  const waiverFits = searchablePlayers
    .filter((p) => !p.rostered)
    .filter((p) => p.position && myWeakPositions.includes(p.position))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  // Top waivers overall (any position) as a fallback list.
  const topWaiversOverall = searchablePlayers
    .filter((p) => !p.rostered)
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <Link
            href="/dynasty"
            className="text-sm text-zinc-500 dark:text-zinc-400"
          >
            ‹ Dynasty
          </Link>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">Players</h1>
            <RefreshButton />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Search the league, scout the waiver wire, and track value momentum
            across the dynasty market.
          </p>
        </div>

        {/* Waiver fits */}
        <section className="flex flex-col gap-3">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold tracking-tight">
              Waiver fits for your roster
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {myWeakPositions.length > 0
                ? `Targets ${myWeakPositions.join(" + ")} (your weak rooms)`
                : "Top unrostered overall"}
            </span>
          </header>
          {(waiverFits.length > 0 ? waiverFits : topWaiversOverall).length ===
          0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-300 bg-white/40 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
              No unrostered players found with value &gt; 0.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {(waiverFits.length > 0 ? waiverFits : topWaiversOverall).map(
                (p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <PlayerAvatar
                      name={p.name}
                      position={p.position}
                      photoUrl={p.photoUrl}
                      size="sm"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <PlayerLink
                          id={p.id}
                          name={p.name}
                          className="truncate text-sm font-medium"
                        />
                        {p.position && (
                          <PositionChip position={p.position} />
                        )}
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {p.team ?? "FA"} · waiver wire
                      </span>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {p.value.toLocaleString()}
                    </span>
                  </li>
                ),
              )}
            </ul>
          )}
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Players not currently on any league roster. Sorted by RA value
            (TE-premium adjusted). Pickups improve depth without a trade.
          </p>
        </section>

        {/* Movers */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="flex flex-col gap-3">
            <header className="flex items-baseline justify-between">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" aria-hidden />
                Risers
              </h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {movers.risers.length} players
              </span>
            </header>
            <ul className="flex flex-col gap-3">
              {movers.risers.map((m) => (
                <MoverCard key={m.sleeperId} m={m} direction="up" />
              ))}
              {movers.risers.length === 0 && (
                <li className="text-sm text-zinc-500 dark:text-zinc-400">
                  No risers right now.
                </li>
              )}
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <header className="flex items-baseline justify-between">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <TrendingDown size={18} className="text-rose-600 dark:text-rose-400" aria-hidden />
                Fallers
              </h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {movers.fallers.length} players
              </span>
            </header>
            <ul className="flex flex-col gap-3">
              {movers.fallers.map((m) => (
                <MoverCard key={m.sleeperId} m={m} direction="down" />
              ))}
              {movers.fallers.length === 0 && (
                <li className="text-sm text-zinc-500 dark:text-zinc-400">
                  No fallers right now.
                </li>
              )}
            </ul>
          </section>
        </div>

        {/* Search */}
        <PlayerSearch players={searchablePlayers} />

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Player values via{" "}
          <a
            href="https://rosteraudit.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-700 hover:underline dark:text-amber-400"
          >
            RosterAudit
          </a>
          .
        </p>
      </div>
    </main>
  );
}
