"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { PlayerRow, TeamSummary } from "@/lib/dynasty/power-rankings";
import { suggestTradeFits } from "@/lib/dynasty/trade-fits";
import {
  evaluateTrade,
  findBestTrades,
  verdictLabel,
  type BestTradeIdea,
  type TradeVerdict,
} from "@/lib/dynasty/trade-recommender";
import type { RAPick } from "@/lib/rosteraudit/types";
import { PlayerAvatar } from "@/components/PlayerAvatar";

const POSITION_TINT: Record<string, string> = {
  QB: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  RB: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  WR: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  TE: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  K: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  DEF: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  PK: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
};

interface RecapItem {
  key: string;
  position: string;
  label: string;
  value: number;
}

const POSITIONS_DISPLAY = ["QB", "RB", "WR", "TE"] as const;

function rankClass(rank: number, totalTeams: number): string {
  if (rank <= 3) return "text-emerald-700 dark:text-emerald-400 font-medium";
  if (rank > totalTeams - 3) return "text-rose-700 dark:text-rose-400 font-medium";
  return "text-zinc-700 dark:text-zinc-300";
}

function PlayerRowItem({
  p,
  checked,
  onChange,
}: {
  p: PlayerRow;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
        checked
          ? "bg-amber-50 dark:bg-amber-950/30"
          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
      }`}
    >
      <input
        type="checkbox"
        className="size-4 shrink-0 rounded border-zinc-300 text-amber-600 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800"
        checked={checked}
        onChange={onChange}
      />
      <PlayerAvatar
        name={p.name}
        position={p.position}
        photoUrl={p.photoUrl}
        size="sm"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-medium">{p.name}</span>
          {p.buyLow && (
            <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              Buy
            </span>
          )}
          {p.sellHigh && (
            <span className="shrink-0 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
              Sell
            </span>
          )}
          {p.breakout && (
            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              Break
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {[p.team ?? "FA", p.position].filter(Boolean).join(" · ")}
          {p.overallRank > 0
            ? ` · #${p.overallRank} ${p.position}${p.positionRank}`
            : ""}
        </span>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        {p.value > 0 ? p.value.toLocaleString() : "—"}
      </span>
    </label>
  );
}

function pickValue(p: RAPick, isSuperflex: boolean): number {
  return isSuperflex ? p.valueSf : p.value1qb;
}

const FILTER_POSITIONS = ["QB", "RB", "WR", "TE"] as const;

function PositionFilter({
  filter,
  setFilter,
  players,
}: {
  filter: string;
  setFilter: (f: string) => void;
  players: PlayerRow[];
}) {
  const counts: Record<string, number> = {
    all: players.length,
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
  };
  for (const p of players) {
    if (p.position in counts && p.position !== "all") {
      counts[p.position] += 1;
    }
  }
  const items = [
    { key: "all", label: "All" },
    ...FILTER_POSITIONS.map((p) => ({ key: p, label: p })),
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => {
        const active = filter === it.key;
        const count = counts[it.key] ?? 0;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => setFilter(it.key)}
            disabled={count === 0 && it.key !== "all"}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              active
                ? "bg-amber-500 text-white"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {it.label}{" "}
            <span className={active ? "opacity-80" : "opacity-60"}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function RecapColumn({
  name,
  items,
  total,
  outcome,
}: {
  name: string;
  items: RecapItem[];
  total: number;
  outcome: "win" | "lose" | "even";
}) {
  const containerCls =
    outcome === "win"
      ? "bg-gradient-to-br from-emerald-50/80 to-transparent border-emerald-200/60 dark:from-emerald-950/30 dark:border-emerald-900/60"
      : outcome === "lose"
        ? "bg-gradient-to-br from-rose-50/80 to-transparent border-rose-200/60 dark:from-rose-950/30 dark:border-rose-900/60"
        : "bg-zinc-50/50 border-zinc-200/60 dark:bg-zinc-900/40 dark:border-zinc-800/60";
  const headColor =
    outcome === "win"
      ? "text-emerald-700 dark:text-emerald-400"
      : outcome === "lose"
        ? "text-rose-700 dark:text-rose-400"
        : "text-zinc-700 dark:text-zinc-300";
  const totalColor =
    outcome === "win"
      ? "bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-emerald-300"
      : outcome === "lose"
        ? "bg-gradient-to-r from-rose-600 to-rose-500 bg-clip-text text-transparent dark:from-rose-400 dark:to-rose-300"
        : "text-zinc-700 dark:text-zinc-300";
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-3 ${containerCls}`}
    >
      <div className={`flex items-center gap-1.5 text-sm font-bold ${headColor}`}>
        <span className="truncate">{name} receives</span>
        {outcome === "win" && (
          <Check size={14} aria-hidden className="shrink-0" strokeWidth={3} />
        )}
      </div>
      {items.length === 0 ? (
        <p className="py-1 text-xs text-zinc-400 dark:text-zinc-600">
          Nothing selected.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((it) => (
            <li key={it.key} className="flex items-center gap-2">
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  POSITION_TINT[it.position] ?? POSITION_TINT.PK
                }`}
              >
                {it.position}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {it.label}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                {it.value.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-zinc-200/60 pt-2 dark:border-zinc-800/60">
        <span className={`text-3xl font-black tracking-tight tabular-nums ${totalColor}`}>
          {total.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function verdictBadgeClass(v: TradeVerdict): string {
  switch (v) {
    case "accept":
      return "bg-emerald-500 text-white";
    case "lean_accept":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "even":
      return "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    case "lean_decline":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300";
    case "decline":
      return "bg-rose-500 text-white";
  }
}

export default function TradeBuilder({
  teams,
  myRosterId,
  picks,
  isSuperflex,
}: {
  teams: TeamSummary[];
  myRosterId: number;
  picks: RAPick[];
  isSuperflex: boolean;
}) {
  const myTeam = teams.find((t) => t.rosterId === myRosterId);
  const otherTeams = useMemo(
    () =>
      teams
        .filter((t) => t.rosterId !== myRosterId)
        .sort((a, b) => a.ownerName.localeCompare(b.ownerName)),
    [teams, myRosterId],
  );

  const [partnerId, setPartnerId] = useState<number>(
    otherTeams[0]?.rosterId ?? -1,
  );
  const [mySel, setMySel] = useState<Set<string>>(new Set());
  const [theirSel, setTheirSel] = useState<Set<string>>(new Set());
  const [myPickIds, setMyPickIds] = useState<Set<number>>(new Set());
  const [theirPickIds, setTheirPickIds] = useState<Set<number>>(new Set());
  const [myPosFilter, setMyPosFilter] = useState<string>("all");
  const [theirPosFilter, setTheirPosFilter] = useState<string>("all");

  const picksById = useMemo(
    () => new Map(picks.map((p) => [p.id, p])),
    [picks],
  );

  const partnerTeam = teams.find((t) => t.rosterId === partnerId);

  const fits = useMemo(() => {
    if (!myTeam || !partnerTeam) return [];
    return suggestTradeFits(myTeam, partnerTeam, teams.length);
  }, [myTeam, partnerTeam, teams.length]);

  const bestTrades = useMemo(() => {
    if (!myTeam) return [];
    return findBestTrades(myTeam, teams, teams.length, 6);
  }, [myTeam, teams]);

  const assessment = useMemo(() => {
    if (!myTeam) return null;
    const proposal = {
      myPlayers: myTeam.players.filter((p) => mySel.has(p.id)),
      myPicks: [...myPickIds]
        .map((id) => picksById.get(id))
        .filter((p): p is RAPick => p !== undefined),
      theirPlayers:
        partnerTeam?.players.filter((p) => theirSel.has(p.id)) ?? [],
      theirPicks: [...theirPickIds]
        .map((id) => picksById.get(id))
        .filter((p): p is RAPick => p !== undefined),
    };
    return evaluateTrade(
      proposal,
      myTeam,
      partnerTeam ?? null,
      teams,
      teams.length,
      isSuperflex,
      picksById,
    );
  }, [
    myTeam,
    partnerTeam,
    teams,
    mySel,
    theirSel,
    myPickIds,
    theirPickIds,
    picksById,
    isSuperflex,
  ]);

  const myGiveValue = useMemo(() => {
    if (!myTeam) return 0;
    const playerSum = myTeam.players
      .filter((p) => mySel.has(p.id))
      .reduce((s, p) => s + p.value, 0);
    const pickSum = [...myPickIds].reduce((s, id) => {
      const pk = picksById.get(id);
      return s + (pk ? pickValue(pk, isSuperflex) : 0);
    }, 0);
    return playerSum + pickSum;
  }, [myTeam, mySel, myPickIds, picksById, isSuperflex]);

  const theirGiveValue = useMemo(() => {
    if (!partnerTeam) return 0;
    const playerSum = partnerTeam.players
      .filter((p) => theirSel.has(p.id))
      .reduce((s, p) => s + p.value, 0);
    const pickSum = [...theirPickIds].reduce((s, id) => {
      const pk = picksById.get(id);
      return s + (pk ? pickValue(pk, isSuperflex) : 0);
    }, 0);
    return playerSum + pickSum;
  }, [partnerTeam, theirSel, theirPickIds, picksById, isSuperflex]);

  if (!myTeam) {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-300">
        Could not find your roster in this league.
      </p>
    );
  }

  const delta = theirGiveValue - myGiveValue;
  const baseline = Math.max(myGiveValue, theirGiveValue);
  const pct = baseline > 0 ? Math.round((delta / baseline) * 100) : 0;
  const verdict =
    baseline === 0
      ? "—"
      : Math.abs(pct) <= 10
        ? "Even"
        : delta > 0
          ? "You win"
          : "They win";

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSet(next);
  }

  function reset() {
    setMySel(new Set());
    setTheirSel(new Set());
    setMyPickIds(new Set());
    setTheirPickIds(new Set());
  }

  function changePartner(id: number) {
    setPartnerId(id);
    setTheirSel(new Set());
    setTheirPickIds(new Set());
  }

  function applyBestTrade(idea: BestTradeIdea) {
    setPartnerId(idea.partnerRosterId);
    setMySel(new Set(idea.send.map((p) => p.id)));
    setTheirSel(new Set(idea.receive.map((p) => p.id)));
    setMyPickIds(new Set());
    setTheirPickIds(new Set());
  }

  function togglePick(
    set: Set<number>,
    setSet: (s: Set<number>) => void,
    id: number,
  ) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSet(next);
  }

  return (
    <div className="flex flex-col gap-6">
      {bestTrades.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold tracking-tight">
              Best trades across the league
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Player-for-player swaps that fill your weakest positions from
              each opponent&apos;s surplus, scored by positional gain and
              value parity. Tap Apply to load into the builder.
            </p>
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {bestTrades.map((idea, i) => (
              <li
                key={`${idea.partnerRosterId}-${i}`}
                className="group flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white/80 p-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/10 dark:border-zinc-800/80 dark:bg-zinc-900/80 dark:hover:border-amber-800"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-bold">
                    vs. {idea.partnerName}
                  </span>
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
                    {idea.positionalGain.position} #
                    {idea.positionalGain.from} → #{idea.positionalGain.to}
                  </span>
                </div>
                <div className="flex items-stretch gap-2 text-sm">
                  <div className="flex flex-1 flex-col gap-1 rounded-lg border border-zinc-200/80 bg-zinc-50/60 p-2 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Send
                    </span>
                    {idea.send.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-1"
                      >
                        <span className="truncate text-xs">{p.name}</span>
                        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                          {p.value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <span className="self-center text-zinc-400">↔</span>
                  <div className="flex flex-1 flex-col gap-1 rounded-lg border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-emerald-50/30 p-2 dark:border-emerald-900/60 dark:from-emerald-950/30 dark:to-emerald-950/15">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Receive
                    </span>
                    {idea.receive.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-1"
                      >
                        <span className="truncate text-xs font-medium">
                          {p.name}
                        </span>
                        <span className="text-xs font-semibold tabular-nums">
                          {p.value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <ul className="flex flex-col gap-0.5">
                  {idea.reasoning.map((r) => (
                    <li
                      key={r}
                      className="text-xs text-zinc-600 dark:text-zinc-400"
                    >
                      • {r}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => applyBestTrade(idea)}
                  className="self-start rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-amber-500/30 transition-all hover:shadow-md hover:shadow-amber-500/50 hover:brightness-110"
                >
                  Apply
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-2">
        <label
          htmlFor="partner"
          className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
        >
          Trade with
        </label>
        <select
          id="partner"
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base font-medium dark:border-zinc-800 dark:bg-zinc-900"
          value={partnerId}
          onChange={(e) => changePartner(Number(e.target.value))}
        >
          {otherTeams.map((t) => (
            <option key={t.rosterId} value={t.rosterId}>
              {t.ownerName}
            </option>
          ))}
        </select>
      </div>

      {partnerTeam && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Position rankings
          </h2>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Team
                  </th>
                  {POSITIONS_DISPLAY.map((p) => (
                    <th
                      key={p}
                      className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                    >
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="px-3 py-2 text-left font-medium">You</td>
                  {POSITIONS_DISPLAY.map((p) => (
                    <td key={p} className="px-2 py-2 text-center tabular-nums">
                      <span className={rankClass(myTeam.positionRanks[p], teams.length)}>
                        {myTeam.positionRanks[p]}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2 text-left font-medium">
                    {partnerTeam.ownerName}
                  </td>
                  {POSITIONS_DISPLAY.map((p) => (
                    <td key={p} className="px-2 py-2 text-center tabular-nums">
                      <span className={rankClass(partnerTeam.positionRanks[p], teams.length)}>
                        {partnerTeam.positionRanks[p]}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            1 = strongest of {teams.length}. Green = top 3, red = bottom 3.
          </p>
        </div>
      )}

      {fits.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Trade fits
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {fits.map((fit) => (
              <div
                key={`${fit.position}-${fit.side}`}
                className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/60 dark:bg-amber-950/20"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold">
                    {fit.side === "send"
                      ? `Send a ${fit.position}`
                      : `Target their ${fit.position}`}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    you #{fit.yourRank} · them #{fit.theirRank}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {fit.side === "send"
                    ? `You have surplus ${fit.position}; they're weak there. Consider offering one of these:`
                    : `They have surplus ${fit.position}; you're weak there. Consider asking for one of these:`}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {fit.suggested.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="truncate flex-1">{p.name}</span>
                      <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                        {p.value > 0 ? p.value.toLocaleString() : "—"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (fit.side === "send") {
                            const next = new Set(mySel);
                            next.add(p.id);
                            setMySel(next);
                          } else {
                            const next = new Set(theirSel);
                            next.add(p.id);
                            setTheirSel(next);
                          }
                        }}
                        className="shrink-0 rounded-md border border-amber-300 bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-amber-600 dark:border-amber-700"
                      >
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {(() => {
        // What I receive = what they give. What they receive = what I give.
        const myReceiveItems: RecapItem[] = [];
        const theirReceiveItems: RecapItem[] = [];

        if (partnerTeam) {
          for (const p of partnerTeam.players.filter((p) => theirSel.has(p.id))) {
            myReceiveItems.push({
              key: `p-${p.id}`,
              position: p.position,
              label: p.name,
              value: p.value,
            });
          }
        }
        for (const id of theirPickIds) {
          const pk = picksById.get(id);
          if (!pk) continue;
          myReceiveItems.push({
            key: `pk-${pk.id}`,
            position: "PK",
            label: pk.label,
            value: isSuperflex ? pk.valueSf : pk.value1qb,
          });
        }
        if (myTeam) {
          for (const p of myTeam.players.filter((p) => mySel.has(p.id))) {
            theirReceiveItems.push({
              key: `p-${p.id}`,
              position: p.position,
              label: p.name,
              value: p.value,
            });
          }
        }
        for (const id of myPickIds) {
          const pk = picksById.get(id);
          if (!pk) continue;
          theirReceiveItems.push({
            key: `pk-${pk.id}`,
            position: "PK",
            label: pk.label,
            value: isSuperflex ? pk.valueSf : pk.value1qb,
          });
        }

        const myReceiveTotal = theirGiveValue;
        const theirReceiveTotal = myGiveValue;
        const meWins = myReceiveTotal > theirReceiveTotal;
        const theyWin = theirReceiveTotal > myReceiveTotal;
        const myOutcome: "win" | "lose" | "even" = meWins
          ? "win"
          : theyWin
            ? "lose"
            : "even";
        const theirOutcome: "win" | "lose" | "even" = theyWin
          ? "win"
          : meWins
            ? "lose"
            : "even";

        return (
          <div className="sticky top-14 z-10 -mx-4 border-y border-zinc-200 bg-zinc-50/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 dark:border-zinc-800 dark:bg-zinc-950/95">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Trade summary
                </h3>
                <div className="flex items-center gap-2">
                  {assessment && (
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${verdictBadgeClass(assessment.verdict)}`}
                    >
                      {verdictLabel(assessment.verdict)}
                    </span>
                  )}
                  {(mySel.size > 0 ||
                    theirSel.size > 0 ||
                    myPickIds.size > 0 ||
                    theirPickIds.size > 0) && (
                    <button
                      type="button"
                      onClick={reset}
                      className="shrink-0 rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <RecapColumn
                  name={myTeam?.ownerName ?? "You"}
                  items={myReceiveItems}
                  total={myReceiveTotal}
                  outcome={myOutcome}
                />
                <RecapColumn
                  name={partnerTeam?.ownerName ?? "Partner"}
                  items={theirReceiveItems}
                  total={theirReceiveTotal}
                  outcome={theirOutcome}
                />
              </div>
              {baseline > 0 && (
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {verdict}
                  {delta !== 0
                    ? ` · ${delta > 0 ? "+" : ""}${delta.toLocaleString()} (${pct > 0 ? "+" : ""}${pct}%)`
                    : ""}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {assessment && (
        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold tracking-tight">
              Verdict: {verdictLabel(assessment.verdict)}
            </h3>
            <ul className="flex flex-col gap-0.5">
              {assessment.reasoning.map((r, i) => (
                <li
                  key={i}
                  className="text-xs text-zinc-600 dark:text-zinc-400"
                >
                  • {r}
                </li>
              ))}
            </ul>
          </div>

          {assessment.counters.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Suggested counters
              </span>
              <ul className="flex flex-col gap-2">
                {assessment.counters.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 dark:border-amber-900/60 dark:bg-amber-950/20"
                  >
                    <span className="flex-1 text-xs text-zinc-700 dark:text-zinc-300">
                      {c.description}
                    </span>
                    {c.pickIdToAdd && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Set(theirPickIds);
                          next.add(c.pickIdToAdd!);
                          setTheirPickIds(next);
                        }}
                        className="shrink-0 rounded-md border border-amber-300 bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-amber-600 dark:border-amber-700"
                      >
                        Add
                      </button>
                    )}
                    {c.playerToAdd && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Set(theirSel);
                          next.add(c.playerToAdd!.id);
                          setTheirSel(next);
                        }}
                        className="shrink-0 rounded-md border border-amber-300 bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-amber-600 dark:border-amber-700"
                      >
                        Add
                      </button>
                    )}
                    {c.playerToRemove && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Set(mySel);
                          next.delete(c.playerToRemove!.id);
                          setMySel(next);
                        }}
                        className="shrink-0 rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            You give ({mySel.size + myPickIds.size})
          </h2>
          <PicksPanel
            picks={picks}
            picksById={picksById}
            selected={myPickIds}
            onToggle={(id) => togglePick(myPickIds, setMyPickIds, id)}
            isSuperflex={isSuperflex}
          />
          <PositionFilter
            filter={myPosFilter}
            setFilter={setMyPosFilter}
            players={myTeam.players}
          />
          <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {myTeam.players
              .filter(
                (p) => myPosFilter === "all" || p.position === myPosFilter,
              )
              .map((p) => (
                <li key={p.id}>
                  <PlayerRowItem
                    p={p}
                    checked={mySel.has(p.id)}
                    onChange={() => toggle(mySel, setMySel, p.id)}
                  />
                </li>
              ))}
          </ul>
        </section>

        {partnerTeam && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              You get ({theirSel.size + theirPickIds.size})
            </h2>
            <PicksPanel
              picks={picks}
              picksById={picksById}
              selected={theirPickIds}
              onToggle={(id) => togglePick(theirPickIds, setTheirPickIds, id)}
              isSuperflex={isSuperflex}
            />
            <PositionFilter
              filter={theirPosFilter}
              setFilter={setTheirPosFilter}
              players={partnerTeam.players}
            />
            <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
              {partnerTeam.players
                .filter(
                  (p) =>
                    theirPosFilter === "all" || p.position === theirPosFilter,
                )
                .map((p) => (
                  <li key={p.id}>
                    <PlayerRowItem
                      p={p}
                      checked={theirSel.has(p.id)}
                      onChange={() => toggle(theirSel, setTheirSel, p.id)}
                    />
                  </li>
                ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function PicksPanel({
  picks,
  picksById,
  selected,
  onToggle,
  isSuperflex,
}: {
  picks: RAPick[];
  picksById: Map<number, RAPick>;
  selected: Set<number>;
  onToggle: (id: number) => void;
  isSuperflex: boolean;
}) {
  const selectedPicks = [...selected]
    .map((id) => picksById.get(id))
    .filter((p): p is RAPick => p !== undefined)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const total = selectedPicks.reduce(
    (s, p) => s + (isSuperflex ? p.valueSf : p.value1qb),
    0,
  );

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Picks
        </span>
        <select
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium dark:border-zinc-800 dark:bg-zinc-950"
          value=""
          onChange={(e) => {
            const id = Number(e.target.value);
            if (id) onToggle(id);
            e.target.value = "";
          }}
        >
          <option value="">+ Add pick</option>
          {picks
            .filter((p) => !selected.has(p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} (
                {(isSuperflex ? p.valueSf : p.value1qb).toLocaleString()})
              </option>
            ))}
        </select>
      </div>
      {selectedPicks.length === 0 ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          No picks selected.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {selectedPicks.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 py-1.5"
            >
              <span className="shrink-0 rounded bg-zinc-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                PK
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {p.label}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {(isSuperflex ? p.valueSf : p.value1qb).toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => onToggle(p.id)}
                className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800 dark:hover:text-rose-400"
                aria-label="Remove pick"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedPicks.length > 0 && (
        <div className="flex items-center justify-between border-t border-zinc-200 pt-2 text-xs dark:border-zinc-800">
          <span className="font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Total picks value
          </span>
          <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-400">
            {total.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
