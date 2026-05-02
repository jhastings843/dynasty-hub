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
import { RookieList, type NextPickRef, type RookieRow } from "./RookieList";
import { RoundTargets } from "./RoundTargets";
import { Recommendations } from "./Recommendations";
import { buildRecommendations } from "@/lib/dynasty/draft-recommender";

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
  const rookieRows: RookieRow[] = available.map((p) => {
    const v = fcValues[p.player_id];
    return {
      id: p.player_id,
      name: nameOf(p),
      position: p.position ?? null,
      team: p.team ?? null,
      age: typeof p.age === "number" ? p.age : null,
      value: p.value,
      rank: p.rank,
      positionRank: p.positionRank,
      photoUrl: p.photoUrl,
      buyLow: v?.buyLow ?? false,
      sellHigh: v?.sellHigh ?? false,
      breakout: v?.breakout ?? false,
    };
  });

  // Compute weakest positions from the FULL roster + any rookies the
  // user has drafted in this active draft (whether or not Sleeper has
  // already added them to the roster). De-duped via Set so we never
  // double-count.
  const myDraftedIds = picks
    .filter((pk) => pk.picked_by === me.user_id)
    .map((pk) => pk.player_id);
  const effectivePlayerIds = new Set<string>([
    ...(myRoster?.players ?? []),
    ...myDraftedIds,
  ]);

  const localPosValues: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
  const draftedByMeByPos: Record<string, number> = {};
  for (const pid of effectivePlayerIds) {
    const p = players[pid];
    if (!p?.position || !(p.position in localPosValues)) continue;
    localPosValues[p.position] += fcValues[pid]?.value ?? 0;
  }
  for (const pid of myDraftedIds) {
    const p = players[pid];
    if (!p?.position || !(p.position in localPosValues)) continue;
    draftedByMeByPos[p.position] = (draftedByMeByPos[p.position] ?? 0) + 1;
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

  // Find the user's next pick (first unused pick in order).
  const myDraftedPickNoSet = new Set(
    picks
      .filter((pk) => pk.picked_by === me.user_id)
      .map((pk) => pk.pick_no),
  );
  const nextUserPick = userPicks.find(
    (p) => !myDraftedPickNoSet.has(p.pickNo) && p.value != null,
  );
  const nextPickRef: NextPickRef | null = nextUserPick
    ? {
        label: `${nextUserPick.round}.${nextUserPick.slot.toString().padStart(2, "0")}`,
        value: nextUserPick.value!,
      }
    : null;

  const recommendations = buildRecommendations({
    rookies: rookieRows,
    nextPickValue: nextPickRef?.value ?? null,
    nextPickLabel: nextPickRef?.label ?? null,
    weakestPositions: weakestPositions as string[],
    limit: 3,
  });

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
            <div className="flex items-center gap-2">
              <Link
                href="/dynasty/draft/board"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                League board →
              </Link>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  draft.status === "drafting"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
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
          {/* Slot card — sky for "data" feel */}
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white to-sky-50/30 p-5 backdrop-blur dark:border-zinc-800/80 dark:from-zinc-900 dark:to-sky-950/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Your draft slot
            </span>
            <div className="flex items-center gap-4">
              <span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 text-2xl font-black tracking-tighter text-white shadow-lg shadow-sky-500/30">
                {mySlot ? `#${mySlot}` : "—"}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-2xl font-bold tracking-tight tabular-nums">
                  {mySlot ?? "—"}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  of {totalTeams} teams
                </span>
              </div>
            </div>
          </div>

          {/* Picks card */}
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white/80 p-5 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-900/80">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Your picks
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                total{" "}
                <span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {totalPickValue.toLocaleString()}
                </span>
              </span>
            </div>
            {userPicks.length === 0 ? (
              <span className="text-sm text-zinc-400 dark:text-zinc-600">—</span>
            ) : (
              <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {userPicks.map((p) => (
                  <li
                    key={p.pickNo}
                    className="flex items-center justify-between gap-2 py-1.5 text-sm"
                  >
                    <span className="tabular-nums">
                      <span className="font-bold">
                        {p.round}.{p.slot.toString().padStart(2, "0")}
                      </span>
                      <span className="ml-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {p.zone.charAt(0).toUpperCase() + p.zone.slice(1)}{" "}
                        {ordinal(p.round)}
                      </span>
                    </span>
                    <span className="text-xs font-bold tabular-nums text-zinc-700 dark:text-zinc-300">
                      {p.value != null ? p.value.toLocaleString() : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Target positions card — per-position colors */}
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white/80 p-5 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-900/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Target positions
            </span>
            <div className="flex flex-wrap gap-2">
              {weakestPositions.length > 0 ? (
                weakestPositions.map((pos) => {
                  const positionTints: Record<
                    string,
                    { grad: string; shadow: string }
                  > = {
                    QB: {
                      grad: "from-rose-400 to-rose-600",
                      shadow: "shadow-rose-500/30",
                    },
                    RB: {
                      grad: "from-emerald-400 to-emerald-600",
                      shadow: "shadow-emerald-500/30",
                    },
                    WR: {
                      grad: "from-sky-400 to-sky-600",
                      shadow: "shadow-sky-500/30",
                    },
                    TE: {
                      grad: "from-amber-400 to-orange-500",
                      shadow: "shadow-amber-500/30",
                    },
                  };
                  const tint = positionTints[pos] ?? {
                    grad: "from-zinc-400 to-zinc-600",
                    shadow: "shadow-zinc-500/20",
                  };
                  const filledCount = draftedByMeByPos[pos] ?? 0;
                  return (
                    <span
                      key={pos}
                      className="relative inline-flex items-center"
                    >
                      <span
                        className={`rounded-xl bg-gradient-to-br ${tint.grad} ${tint.shadow} px-4 py-2 text-lg font-black tracking-tight text-white shadow-md`}
                      >
                        {pos}
                      </span>
                      {filledCount > 0 && (
                        <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-md ring-2 ring-white dark:ring-zinc-900">
                          ✓
                        </span>
                      )}
                    </span>
                  );
                })
              ) : (
                <span className="text-zinc-500 dark:text-zinc-400">—</span>
              )}
            </div>
            <span className="mt-auto text-xs text-zinc-500 dark:text-zinc-400">
              {Object.keys(draftedByMeByPos).length > 0
                ? `Live update: ${Object.entries(draftedByMeByPos)
                    .map(([p, n]) => `${n} ${p}${n === 1 ? "" : "s"}`)
                    .join(" + ")} drafted`
                : "your weakest by total roster value"}
            </span>
          </div>
        </div>

        <Recommendations
          recommendations={recommendations}
          nextPickLabel={nextPickRef?.label ?? null}
        />

        <section className="flex flex-col gap-3">
          <header className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold tracking-tight">
              Best available rookies
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {available.length} remaining · {drafted.size} drafted
            </span>
          </header>
          <RookieList
            rookies={rookieRows}
            weakestPositions={weakestPositions as string[]}
            nextPick={nextPickRef}
          />
        </section>

        {(() => {
          const myPicks = picks
            .filter((pk) => pk.picked_by === me.user_id)
            .sort((a, b) => a.pick_no - b.pick_no);
          if (myPicks.length === 0) return null;

          // Compute total drafted value + surplus vs the picks I used.
          const drafted = myPicks.reduce(
            (s, pk) => s + (fcValues[pk.player_id]?.value ?? 0),
            0,
          );
          const expected = myPicks.reduce((s, pk) => {
            const u = userPicks.find((up) => up.pickNo === pk.pick_no);
            return s + (u?.value ?? 0);
          }, 0);
          const surplus = drafted - expected;

          return (
            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-semibold tracking-tight">
                  Your draft so far
                </h2>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {myPicks.length} of {userPicks.length} picks
                </span>
              </div>
              <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white to-emerald-50/20 p-4 backdrop-blur dark:border-zinc-800/80 dark:from-zinc-900 dark:to-emerald-950/10">
                <div className="flex flex-wrap items-center gap-6 border-b border-zinc-200/60 pb-3 dark:border-zinc-800/60">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Drafted value
                    </span>
                    <span className="text-2xl font-bold tabular-nums">
                      {drafted.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Expected
                    </span>
                    <span className="text-2xl font-bold tabular-nums text-zinc-500 dark:text-zinc-400">
                      {expected.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Surplus
                    </span>
                    <span
                      className={`text-2xl font-bold tabular-nums ${
                        surplus >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {surplus >= 0 ? "+" : ""}
                      {surplus.toLocaleString()}
                    </span>
                  </div>
                </div>
                <ul className="flex flex-col gap-2">
                  {myPicks.map((pk) => {
                    const p = players[pk.player_id];
                    const v = fcValues[pk.player_id];
                    if (!p) return null;
                    const u = userPicks.find((up) => up.pickNo === pk.pick_no);
                    const playerVal = v?.value ?? 0;
                    const expectedVal = u?.value ?? 0;
                    const pickSurplus = playerVal - expectedVal;
                    return (
                      <li
                        key={pk.pick_no}
                        className="flex items-center gap-3"
                      >
                        <span className="w-14 shrink-0 text-sm font-bold tabular-nums">
                          {pk.round}.{pk.draft_slot.toString().padStart(2, "0")}
                        </span>
                        <PlayerAvatar
                          name={nameOf(p)}
                          position={p.position ?? null}
                          photoUrl={v?.photoUrl ?? null}
                          size="sm"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-sm font-semibold">
                            {nameOf(p)}
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {[p.team ?? "FA", p.position]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                        <div className="flex shrink-0 flex-col items-end">
                          <span className="text-sm font-semibold tabular-nums">
                            {playerVal.toLocaleString()}
                          </span>
                          {Math.abs(pickSurplus) >= 50 && (
                            <span
                              className={`text-[10px] font-bold tabular-nums ${
                                pickSurplus > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {pickSurplus > 0 ? "+" : ""}
                              {pickSurplus.toLocaleString()} vs pick
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          );
        })()}

        <RoundTargets
          userPicks={userPicks}
          rookies={rookieRows}
          weakestPositions={weakestPositions as string[]}
          draftedPickNos={picks
            .filter((pk) => pk.picked_by === me.user_id)
            .map((pk) => pk.pick_no)}
        />

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
