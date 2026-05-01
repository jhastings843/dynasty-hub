import Link from "next/link";
import {
  getAllPlayers,
  getLeague,
  getLeagueRosters,
  getLeagueUsers,
  getUser,
} from "@/lib/sleeper/client";
import type {
  SleeperPlayer,
  SleeperPlayersById,
  SleeperRoster,
  SleeperUser,
} from "@/lib/sleeper/types";
import {
  formatKeyFromLeague,
  getValues,
} from "@/lib/rosteraudit/client";

export const dynamic = "force-dynamic";

const POSITION_ORDER = ["QB", "RB", "WR", "TE", "K", "DEF"];

function ownerName(roster: SleeperRoster, usersById: Map<string, SleeperUser>) {
  const u = roster.owner_id ? usersById.get(roster.owner_id) : null;
  if (!u) return "Unowned";
  return u.metadata?.team_name || u.display_name || u.username || u.user_id;
}

function totalFpts(r: SleeperRoster): number {
  const i = r.settings?.fpts ?? 0;
  const d = r.settings?.fpts_decimal ?? 0;
  return i + d / 100;
}

function record(r: SleeperRoster): string {
  const s = r.settings ?? {};
  const w = s.wins ?? 0;
  const l = s.losses ?? 0;
  const t = s.ties ?? 0;
  return t > 0 ? `${w}-${l}-${t}` : `${w}-${l}`;
}

function statusBadge(
  status: string | null | undefined,
): { label: string; className: string } | null {
  if (!status || status === "Active") return null;
  const red = "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
  const yellow = "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300";
  const orange = "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300";
  const gray = "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  const map: Record<string, { label: string; className: string }> = {
    Out: { label: "OUT", className: red },
    Questionable: { label: "Q", className: yellow },
    Doubtful: { label: "D", className: orange },
    "Injured Reserve": { label: "IR", className: red },
    IR: { label: "IR", className: red },
    PUP: { label: "PUP", className: gray },
    Suspended: { label: "SUS", className: gray },
    NA: { label: "NA", className: gray },
  };
  return map[status] ?? { label: status, className: gray };
}

function playerName(p: SleeperPlayer): string {
  if (p.full_name) return p.full_name;
  const f = p.first_name ?? "";
  const l = p.last_name ?? "";
  return `${f} ${l}`.trim() || p.player_id;
}

function primaryPosition(p: SleeperPlayer): string {
  return p.fantasy_positions?.[0] ?? p.position ?? "FLEX";
}

function groupRoster(playerIds: string[], players: SleeperPlayersById) {
  const groups = new Map<string, SleeperPlayer[]>();
  for (const id of playerIds) {
    const p = players[id];
    if (!p) continue;
    const pos = primaryPosition(p);
    const list = groups.get(pos) ?? [];
    list.push(p);
    groups.set(pos, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => playerName(a).localeCompare(playerName(b)));
  }
  const ordered: Array<[string, SleeperPlayer[]]> = [];
  for (const pos of POSITION_ORDER) {
    if (groups.has(pos)) ordered.push([pos, groups.get(pos)!]);
  }
  for (const [pos, list] of [...groups.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (!POSITION_ORDER.includes(pos)) ordered.push([pos, list]);
  }
  return ordered;
}

function ConfigError({ message }: { message: string }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Dynasty</h1>
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-300">
          {message}
        </p>
      </div>
    </main>
  );
}

export default async function DynastyPage() {
  const username = process.env.SLEEPER_USERNAME;
  const leagueId = process.env.SLEEPER_LEAGUE_ID;
  if (!username) {
    return <ConfigError message="Missing SLEEPER_USERNAME in .env.local" />;
  }
  if (!leagueId) {
    return <ConfigError message="Missing SLEEPER_LEAGUE_ID in .env.local" />;
  }

  const league = await getLeague(leagueId);
  const raFormat = formatKeyFromLeague(league);

  const [me, rosters, users, players, fcValues] = await Promise.all([
    getUser(username),
    getLeagueRosters(leagueId),
    getLeagueUsers(leagueId),
    getAllPlayers(),
    getValues(raFormat),
  ]);

  const usersById = new Map(users.map((u) => [u.user_id, u]));
  const myRoster = rosters.find((r) => r.owner_id === me.user_id) ?? null;

  function teamValue(r: SleeperRoster): number {
    return (r.players ?? []).reduce(
      (sum, id) => sum + (fcValues[id]?.value ?? 0),
      0,
    );
  }

  const standings = [...rosters].sort((a, b) => {
    const aw = a.settings?.wins ?? 0;
    const bw = b.settings?.wins ?? 0;
    if (aw !== bw) return bw - aw;
    const at = a.settings?.ties ?? 0;
    const bt = b.settings?.ties ?? 0;
    if (at !== bt) return bt - at;
    return totalFpts(b) - totalFpts(a);
  });

  const myGroups = myRoster ? groupRoster(myRoster.players ?? [], players) : [];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              {league.name}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {league.season} season · {rosters.length} teams
            </p>
          </div>
          <Link
            href="/dynasty/trade"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            Trade analyzer →
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <section className="flex flex-col gap-4">
          <header className="flex flex-col gap-0.5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              My Team
            </h2>
            <p className="text-lg font-semibold">
              {myRoster ? ownerName(myRoster, usersById) : "—"}
            </p>
            {myRoster && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {record(myRoster)} · {totalFpts(myRoster).toFixed(2)} PF ·{" "}
                {teamValue(myRoster).toLocaleString()} value
              </p>
            )}
          </header>

          {!myRoster && (
            <p className="rounded-xl bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300">
              No roster found in this league for {username}. Check that
              SLEEPER_USERNAME matches an owner in the league.
            </p>
          )}

          {myRoster && myGroups.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No players on this roster yet.
            </p>
          )}

          {myGroups.map(([pos, list]) => (
            <div key={pos} className="flex flex-col gap-2">
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {pos} · {list.length}
              </div>
              <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                {list.map((p) => {
                  const badge = statusBadge(p.status);
                  const v = fcValues[p.player_id];
                  return (
                    <li
                      key={p.player_id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-base font-medium">
                            {playerName(p)}
                          </span>
                          {badge && (
                            <span
                              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {[
                            p.team ?? "FA",
                            p.position,
                            p.age ? `age ${p.age}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5">
                        {v ? (
                          <>
                            <span className="text-sm font-medium tabular-nums">
                              {v.value.toLocaleString()}
                            </span>
                            <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                              <span>
                                #{v.overallRank} · {v.position}
                                {v.positionRank}
                              </span>
                              {v.trend30Day !== 0 && (
                                <span
                                  className={`ml-1 ${
                                    v.trend30Day > 0
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  {v.trend30Day > 0 ? "+" : ""}
                                  {v.trend30Day}
                                </span>
                              )}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-400 dark:text-zinc-600">
                            —
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Standings
          </h2>
          <ol className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {standings.map((r, i) => {
              const isMe = r.roster_id === myRoster?.roster_id;
              return (
                <li
                  key={r.roster_id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 ${
                    isMe ? "bg-zinc-50 dark:bg-zinc-800/50" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-5 shrink-0 text-sm font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
                      {i + 1}
                    </span>
                    <span className="truncate text-base font-medium">
                      {ownerName(r, usersById)}
                      {isMe ? " (you)" : ""}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-sm font-medium tabular-nums">
                      {record(r)}
                    </span>
                    <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                      {teamValue(r).toLocaleString()} val
                      {totalFpts(r) > 0 ? ` · ${totalFpts(r).toFixed(0)} PF` : ""}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
        </div>

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
