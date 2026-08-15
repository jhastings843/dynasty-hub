import Link from "next/link";
import { ListOrdered, Sparkles, Target, TriangleAlert } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerLink } from "@/components/PlayerLink";
import { RefreshButton } from "@/components/RefreshButton";
import { JINGLES_CALLS, LAST_UPDATED } from "@/lib/jingles/data";
import type { LeagueProfile } from "@/lib/league/types";
import {
  buildBoard,
  openSlots,
  withJingles,
  type BoardPlayer,
} from "@/lib/redraft/draft-board";
import type { RAValuesBySleeperId } from "@/lib/rosteraudit/types";
import {
  getAllPlayers,
  getDraftPicks,
  getLeagueDrafts,
  getLeagueRosters,
} from "@/lib/sleeper/client";

const POS_CHIP: Record<string, string> = {
  QB: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  RB: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  WR: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  TE: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  DEF: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  K: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

function PosChip({ position }: { position: string }) {
  return (
    <span
      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${POS_CHIP[position] ?? POS_CHIP.DEF}`}
    >
      {position}
    </span>
  );
}

export async function RedraftDraft({
  leagueId,
  profile,
  myUserId,
  values,
}: {
  leagueId: string;
  profile: LeagueProfile;
  myUserId: string;
  values: RAValuesBySleeperId;
}) {
  const [drafts, rosters, players] = await Promise.all([
    getLeagueDrafts(leagueId),
    getLeagueRosters(leagueId),
    getAllPlayers(),
  ]);

  const draft = drafts[0] ?? null;
  const picks = draft
    ? await getDraftPicks(draft.draft_id).catch(() => [])
    : [];
  const drafted = new Set(picks.map((p) => p.player_id));

  const myRoster = rosters.find((r) => r.owner_id === myUserId) ?? null;
  const myPickIds = picks
    .filter((p) => p.picked_by === myUserId)
    .map((p) => p.player_id);

  // Everything on the roster plus anything taken in this draft, de-duped.
  const mine = new Set<string>([...(myRoster?.players ?? []), ...myPickIds]);
  const myPositions = [...mine]
    .map((id) => players[id]?.position)
    .filter((p): p is string => Boolean(p));

  const needs = openSlots(profile.rosterPositions, myPositions);

  // The whole pool, not rookies. Anyone with a redraft value and not yet taken.
  const pool: BoardPlayer[] = Object.values(values)
    .filter((v) => v.value > 0 && !drafted.has(v.sleeperId) && !mine.has(v.sleeperId))
    .map((v) => ({
      id: v.sleeperId,
      name: v.name,
      position: v.position,
      team: v.team,
      value: v.value,
      overallRank: v.overallRank,
      positionRank: v.positionRank,
      jingles: withJingles(v.sleeperId),
    }));

  // FantasyCalc's redraft set covers QB, RB, WR, and TE only. A league that
  // starts a DEF or K has slots this board can never fill, so say so instead
  // of leaving them permanently open with no candidates.
  const covered = new Set(pool.map((p) => p.position));
  const uncoveredSlots = needs.filter(
    (n) => !n.eligible.some((pos) => covered.has(pos)),
  );

  const board = buildBoard(pool, needs, 5);
  const bestAvailable = [...pool].sort((a, b) => b.value - a.value).slice(0, 25);

  // His calls are ADP-relative, which is exactly what a draft board wants.
  // Split into who is still on the table and who to let someone else take.
  const availableIds = new Set(pool.map((p) => p.id));
  const jinglesTargets = JINGLES_CALLS.filter(
    (c) => c.verdict !== "fade" && availableIds.has(c.sleeperId),
  );
  const jinglesFades = JINGLES_CALLS.filter(
    (c) => c.verdict === "fade" && availableIds.has(c.sleeperId),
  );

  const draftStart = draft?.start_time ? new Date(draft.start_time) : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Link
            href={`/l/${leagueId}`}
            className="text-sm text-zinc-500 dark:text-zinc-400"
          >
            ‹ League
          </Link>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Draft board
            </h1>
            <RefreshButton />
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {profile.name} · {draft?.settings?.rounds ?? "?"}-round{" "}
            {draft?.type ?? "snake"}
            {draftStart
              ? ` · starts ${draftStart.toLocaleString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : " · not scheduled"}
          </p>
          <p className="max-w-2xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Ranked on this-season value only. Age and long-term upside are
            ignored on purpose: the roster resets in January.
          </p>
        </div>

        {/* Starting slots still open */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Starting slots
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {needs.map((n) => {
              const done = n.filled >= n.required;
              const unsupported = uncoveredSlots.some((u) => u.slot === n.slot);
              return (
                <li
                  key={n.slot}
                  className={`flex flex-col gap-0.5 rounded-2xl border p-3 ${
                    done || unsupported
                      ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                      : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {n.slot}
                  </span>
                  <span className="text-lg font-bold tabular-nums">
                    {n.filled}/{n.required}
                  </span>
                  {unsupported && (
                    <span className="text-[10px] leading-tight text-zinc-400 dark:text-zinc-500">
                      not valued
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {uncoveredSlots.length > 0 && (
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {uncoveredSlots.map((u) => u.slot).join(", ")}{" "}
              {uncoveredSlots.length === 1 ? "is" : "are"} not in FantasyCalc&apos;s
              redraft set, so this board cannot rank{" "}
              {uncoveredSlots.length === 1 ? "it" : "them"}. Draft{" "}
              {uncoveredSlots.length === 1 ? "that slot" : "those slots"} late
              off a streaming source.
            </p>
          )}
        </section>

        {/* Recommendations */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Sparkles
              size={18}
              className="text-amber-600 dark:text-amber-400"
              aria-hidden
            />
            <h2 className="text-xl font-semibold tracking-tight">
              Top recommendations
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Redraft value from FantasyCalc, weighted toward filling an open
            starting slot, with Jingles Labs calls factored in.
          </p>
          {board.length === 0 ? (
            <p className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              No players available yet.
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {board.map((rec) => (
                <li
                  key={rec.player.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center gap-4 p-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-xl font-black tracking-tighter text-white">
                      {rec.rank}
                    </span>
                    <PlayerAvatar
                      name={rec.player.name}
                      position={rec.player.position}
                      size="md"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <PlayerLink
                          id={rec.player.id}
                          name={rec.player.name}
                          className="truncate text-base font-bold"
                        />
                        <PosChip position={rec.player.position} />
                        {rec.fillsNeed && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                            Need
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {rec.player.team ?? "FA"} ·{" "}
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {rec.headline}
                        </span>
                      </span>
                    </div>
                    <span className="shrink-0 text-lg font-bold tabular-nums">
                      {rec.player.value.toLocaleString()}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1.5 border-t border-zinc-200/60 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800/60 dark:bg-zinc-950/40">
                    {rec.reasoning.map((r, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300"
                      >
                        <span
                          aria-hidden
                          className="mt-1.5 size-1 shrink-0 rounded-full bg-amber-500"
                        />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Jingles ADP calls */}
        {(jinglesTargets.length > 0 || jinglesFades.length > 0) && (
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold tracking-tight">
                Jingles Labs vs ADP
              </h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                pulled {LAST_UPDATED}
              </span>
            </div>
            <p className="max-w-2xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              His half-PPR calls on players still available, his ADP against his
              own rank. He is not a rankings service, so this covers only players
              he has written about.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              <CallList
                title="Taking at this price"
                icon="target"
                calls={jinglesTargets}
              />
              <CallList
                title="Letting someone else have"
                icon="fade"
                calls={jinglesFades}
              />
            </div>
          </section>
        )}

        {/* Best available */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ListOrdered
              size={18}
              className="text-zinc-500 dark:text-zinc-400"
              aria-hidden
            />
            <h2 className="text-xl font-semibold tracking-tight">
              Best available
            </h2>
          </div>
          <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {bestAvailable.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
              >
                <span className="w-6 shrink-0 text-right text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                  {i + 1}
                </span>
                <PlayerAvatar name={p.name} position={p.position} size="sm" />
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                  <PlayerLink
                    id={p.id}
                    name={p.name}
                    className="truncate text-sm font-medium"
                  />
                  <PosChip position={p.position} />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {p.team ?? "FA"} · {p.position}
                    {p.positionRank}
                  </span>
                  {p.jingles && (
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        p.jingles.verdict === "fade"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                      }`}
                    >
                      {p.jingles.verdict === "fade" ? "Fade" : "Target"}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {p.value.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

function CallList({
  title,
  icon,
  calls,
}: {
  title: string;
  icon: "target" | "fade";
  calls: typeof JINGLES_CALLS;
}) {
  const Icon = icon === "target" ? Target : TriangleAlert;
  const tint =
    icon === "target"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <Icon size={15} className={tint} aria-hidden />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {title}
        </h3>
        <span className="ml-auto text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
          {calls.length}
        </span>
      </div>
      {calls.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          None still available.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {calls.map((c) => (
            <li key={c.sleeperId} className="flex flex-col gap-0.5 py-2">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <a
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold hover:text-amber-700 hover:underline dark:hover:text-amber-400"
                >
                  {c.player}
                </a>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {c.position} · {c.team ?? "FA"}
                </span>
              </div>
              {c.adp && (
                <span className="text-xs tabular-nums text-zinc-600 dark:text-zinc-300">
                  ADP {c.adp} → his rank {c.jinglesRank}
                </span>
              )}
              <span className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {c.note}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
