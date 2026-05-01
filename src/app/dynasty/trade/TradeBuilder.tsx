"use client";

import { useMemo, useState } from "react";
import type { PlayerRow, TeamSummary } from "@/lib/dynasty/power-rankings";

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
    <label className="flex cursor-pointer items-center gap-3 px-4 py-3 active:bg-zinc-50 dark:active:bg-zinc-800/50">
      <input
        type="checkbox"
        className="size-4 shrink-0 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
        checked={checked}
        onChange={onChange}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{p.name}</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {[p.team ?? "FA", p.position].filter(Boolean).join(" · ")}
          {p.overallRank > 0
            ? ` · #${p.overallRank} ${p.position}${p.positionRank}`
            : ""}
        </span>
      </div>
      <span className="shrink-0 text-sm font-medium tabular-nums">
        {p.value > 0 ? p.value.toLocaleString() : "—"}
      </span>
    </label>
  );
}

export default function TradeBuilder({
  teams,
  myRosterId,
}: {
  teams: TeamSummary[];
  myRosterId: number;
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

  const partnerTeam = teams.find((t) => t.rosterId === partnerId);

  const myGiveValue = useMemo(() => {
    if (!myTeam) return 0;
    return myTeam.players
      .filter((p) => mySel.has(p.id))
      .reduce((s, p) => s + p.value, 0);
  }, [myTeam, mySel]);

  const theirGiveValue = useMemo(() => {
    if (!partnerTeam) return 0;
    return partnerTeam.players
      .filter((p) => theirSel.has(p.id))
      .reduce((s, p) => s + p.value, 0);
  }, [partnerTeam, theirSel]);

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
  }

  function changePartner(id: number) {
    setPartnerId(id);
    setTheirSel(new Set());
  }

  return (
    <div className="flex flex-col gap-6">
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

      <div className="sticky top-0 z-10 -mx-4 border-b border-zinc-200 bg-zinc-50/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3 text-sm tabular-nums">
              <span>{myGiveValue.toLocaleString()}</span>
              <span className="text-zinc-400">→</span>
              <span>{theirGiveValue.toLocaleString()}</span>
            </div>
            <span
              className={`text-xs font-medium ${
                verdict === "You win"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : verdict === "They win"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {verdict}
              {baseline > 0 && delta !== 0
                ? ` · ${delta > 0 ? "+" : ""}${delta.toLocaleString()} (${
                    pct > 0 ? "+" : ""
                  }${pct}%)`
                : ""}
            </span>
          </div>
          {(mySel.size > 0 || theirSel.size > 0) && (
            <button
              type="button"
              onClick={reset}
              className="shrink-0 rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 active:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:active:bg-zinc-800"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          You give ({mySel.size})
        </h2>
        <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {myTeam.players.map((p) => (
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
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            You get ({theirSel.size})
          </h2>
          <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {partnerTeam.players.map((p) => (
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
  );
}
