import Link from "next/link";
import { Clock, Trophy } from "lucide-react";
import {
  formatKeyFromLeague,
  getPicks,
  getValues,
} from "@/lib/rosteraudit/client";
import type { PickSlot, RAPick } from "@/lib/rosteraudit/types";
import {
  getAllPlayers,
  getDraftPicks,
  getLeague,
  getLeagueDrafts,
  getLeagueRosters,
  getUser,
} from "@/lib/sleeper/client";
import type { SleeperPlayer } from "@/lib/sleeper/types";
import { AutoRefresh } from "@/components/AutoRefresh";
import { PlayerAvatar } from "@/components/PlayerAvatar";

export const dynamic = "force-dynamic";

const TRADE_POSITIONS = ["QB", "RB", "WR", "TE"] as const;

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
        <h1 className="text-3xl font-semibold tracking-tight">Draft helper</h1>
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

function formatStartTime(ms: number | null | undefined): string | null {
  if (!ms) return null;
  const d = new Date(ms);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function slotZone(slot: number, teams: number): PickSlot {
  const third = teams / 3;
  if (slot <= Math.ceil(third)) return "early";
  if (slot > Math.ceil(third * 2)) return "late";
  return "mid";
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

interface UserPick {
  pickNo: number;
  round: number;
  slot: number;
  zone: PickSlot;
  label: string;
  value: number | null;
}

function buildUserPicks(
  pickNos: number[],
  totalTeams: number,
  season: number,
  raPicks: RAPick[],
  isSuperflex: boolean,
): UserPick[] {
  return pickNos.map((pickNo) => {
    const round = Math.ceil(pickNo / totalTeams);
    const slot = ((pickNo - 1) % totalTeams) + 1;
    const zone = slotZone(slot, totalTeams);
    const label = `${round}.${slot.toString().padStart(2, "0")} ${zone.charAt(0).toUpperCase() + zone.slice(1)} ${ordinal(round)}`;
    const ra = raPicks.find(
      (p) => p.season === season && p.round === round && p.slot === zone,
    );
    const value = ra ? (isSuperflex ? ra.valueSf : ra.value1qb) : null;
    return { pickNo, round, slot, zone, label, value };
  });
}

export default async function DraftPage() {
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
  const raFormat = formatKeyFromLeague(league);

  const [drafts, rosters, players, fcValues, raPicks] = await Promise.all([
    getLeagueDrafts(leagueId),
    getLeagueRosters(leagueId),
    getAllPlayers(),
    getValues(raFormat),
    getPicks(),
  ]);

  if (drafts.length === 0) {
    return (
      <ConfigError message="No drafts found for this league. Check Sleeper." />
    );
  }

  const draft = drafts[0];
  const picks = await getDraftPicks(draft.draft_id).catch(() => []);
  const myRoster = rosters.find((r) => r.owner_id === me.user_id) ?? null;
  const mySlot = draft.draft_order?.[me.user_id] ?? null;
  const totalRounds = draft.settings?.rounds ?? 4;
  const totalTeams = draft.settings?.teams ?? rosters.length ?? 12;

  const drafted = new Set(picks.map((p) => p.player_id));

  const isRookie = (p: SleeperPlayer) =>
    typeof p.years_exp === "number" && p.years_exp === 0;

  const rookies = Object.values(players)
    .filter(isRookie)
    .map((p) => {
      const v = fcValues[p.player_id];
      return {
        ...p,
        value: v?.value ?? 0,
        rank: v?.overallRank ?? 999999,
        positionRank: v?.positionRank ?? 0,
        photoUrl: v?.photoUrl ?? null,
      };
    })
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value);

  const available = rookies.filter((p) => !drafted.has(p.player_id));
  const top30 = available.slice(0, 30);

  // Compute weakest positions from the FULL roster (not just RA-ranked
  // players) so deep bench gets counted.
  const localPosValues: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
  for (const pid of myRoster?.players ?? []) {
    const p = players[pid];
    if (!p?.position || !(p.position in localPosValues)) continue;
    localPosValues[p.position] += fcValues[pid]?.value ?? 0;
  }
  const weakestPositions = [...TRADE_POSITIONS]
    .sort((a, b) => localPosValues[a] - localPosValues[b])
    .slice(0, 2);

  const myPickNumbers: number[] = [];
  if (mySlot && draft.type === "linear") {
    for (let r = 1; r <= totalRounds; r++) {
      myPickNumbers.push((r - 1) * totalTeams + mySlot);
    }
  } else if (mySlot) {
    for (let r = 1; r <= totalRounds; r++) {
      const slotInRound = r % 2 === 1 ? mySlot : totalTeams - mySlot + 1;
      myPickNumbers.push((r - 1) * totalTeams + slotInRound);
    }
  }

  const isSuperflex = raFormat.startsWith("sf");
  const seasonNum = Number(draft.season ?? new Date().getFullYear());
  const userPicks = buildUserPicks(
    myPickNumbers,
    totalTeams,
    seasonNum,
    raPicks,
    isSuperflex,
  );
  const totalPickValue = userPicks.reduce(
    (s, p) => s + (p.value ?? 0),
    0,
  );

  const startTime = formatStartTime(draft.start_time ?? null);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Link
            href="/dynasty"
            className="text-sm text-zinc-500 dark:text-zinc-400"
          >
            ‹ Dynasty
          </Link>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              Draft helper
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                draft.status === "drafting"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                  : draft.status === "complete"
                    ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              <Clock size={12} aria-hidden />
              {draft.status === "pre_draft"
                ? "Pre-draft"
                : draft.status === "drafting"
                  ? "Drafting"
                  : draft.status === "complete"
                    ? "Complete"
                    : draft.status}
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {league.name} · {draft.season} · {totalRounds}-round {draft.type}{" "}
            draft
            {startTime && ` · starts ${startTime}`}
          </p>
          <AutoRefresh
            intervalMs={
              draft.status === "drafting" ? 60_000 : 5 * 60_000
            }
            label={
              draft.status === "drafting"
                ? "Live updates"
                : "Refreshes"
            }
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Your draft slot
            </span>
            <span className="text-3xl font-semibold tabular-nums">
              {mySlot ? `#${mySlot}` : "—"}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              of {totalTeams} teams
            </span>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Your picks
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                total value{" "}
                <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {totalPickValue.toLocaleString()}
                </span>
              </span>
            </div>
            {userPicks.length === 0 ? (
              <span className="text-sm text-zinc-400 dark:text-zinc-600">—</span>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {userPicks.map((p) => (
                  <li
                    key={p.pickNo}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="tabular-nums">
                      <span className="font-semibold">
                        {p.round}.{p.slot.toString().padStart(2, "0")}
                      </span>
                      <span className="ml-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {p.zone.charAt(0).toUpperCase() + p.zone.slice(1)}{" "}
                        {ordinal(p.round)}
                      </span>
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                      {p.value != null ? p.value.toLocaleString() : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Target positions
            </span>
            <div className="flex flex-wrap gap-1.5">
              {weakestPositions.length > 0 ? (
                weakestPositions.map((pos) => (
                  <span
                    key={pos}
                    className="rounded-full bg-amber-100 px-2.5 py-1 text-sm font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                  >
                    {pos}
                  </span>
                ))
              ) : (
                <span className="text-zinc-500 dark:text-zinc-400">—</span>
              )}
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              your weakest by total value
            </span>
          </div>
        </div>

        <section className="flex flex-col gap-3">
          <header className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold tracking-tight">
              Best available rookies
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {available.length} remaining · {drafted.size} drafted
            </span>
          </header>
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {top30.map((p, idx) => {
              const targetMatch = weakestPositions.includes(
                (p.position ?? "") as (typeof TRADE_POSITIONS)[number],
              );
              return (
                <li
                  key={p.player_id}
                  className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                    targetMatch
                      ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"
                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <span className="w-6 shrink-0 text-sm font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
                    {idx + 1}
                  </span>
                  <PlayerAvatar
                    name={nameOf(p)}
                    position={p.position ?? null}
                    photoUrl={p.photoUrl}
                    size="sm"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold">
                      {nameOf(p)}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {[p.team ?? "FA", p.position, p.age ? `age ${p.age}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-sm font-semibold tabular-nums">
                      {p.value.toLocaleString()}
                    </span>
                    {targetMatch && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                        Fit
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
            {top30.length === 0 && (
              <li className="text-sm text-zinc-500 dark:text-zinc-400">
                No rookies available — draft may be complete.
              </li>
            )}
          </ul>
        </section>

        {picks.length > 0 && (
          <section className="flex flex-col gap-3">
            <header className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold tracking-tight">
                Picks made
              </h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {picks.length} of {totalRounds * totalTeams}
              </span>
            </header>
            <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
              {picks
                .slice(-10)
                .reverse()
                .map((pk) => {
                  const p = players[pk.player_id];
                  const v = fcValues[pk.player_id];
                  if (!p) return null;
                  const isMine = pk.picked_by === me.user_id;
                  return (
                    <li
                      key={pk.pick_no}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        isMine ? "bg-amber-50 dark:bg-amber-950/20" : ""
                      }`}
                    >
                      <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
                        {pk.round}.{pk.draft_slot.toString().padStart(2, "0")}
                      </span>
                      <PlayerAvatar
                        name={nameOf(p)}
                        position={p.position ?? null}
                        photoUrl={v?.photoUrl ?? null}
                        size="sm"
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">
                            {nameOf(p)}
                          </span>
                          {isMine && (
                            <Trophy
                              size={12}
                              className="shrink-0 text-amber-600 dark:text-amber-400"
                              aria-hidden
                            />
                          )}
                        </div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {[p.team ?? "FA", p.position]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {v?.value.toLocaleString() ?? "—"}
                      </span>
                    </li>
                  );
                })}
            </ul>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Showing last 10 picks. Refresh during the draft to see updates
              (60-second cache).
            </p>
          </section>
        )}

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
