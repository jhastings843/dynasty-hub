"use client";

import { useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";

export interface RookieRow {
  id: string;
  name: string;
  position: string | null;
  team: string | null;
  age: number | null;
  value: number;
  rank: number;
  positionRank: number;
  photoUrl: string | null;
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "QB", label: "QB" },
  { key: "RB", label: "RB" },
  { key: "WR", label: "WR" },
  { key: "TE", label: "TE" },
] as const;

export function RookieList({
  rookies,
  weakestPositions,
  limit = 30,
}: {
  rookies: RookieRow[];
  weakestPositions: string[];
  limit?: number;
}) {
  const [filter, setFilter] = useState<string>("all");

  const counts: Record<string, number> = {
    all: rookies.length,
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
  };
  for (const r of rookies) {
    const p = r.position ?? "";
    if (p in counts) counts[p] += 1;
  }

  const filtered =
    filter === "all"
      ? rookies
      : rookies.filter((r) => r.position === filter);
  const visible = filtered.slice(0, limit);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = counts[f.key] ?? 0;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              disabled={count === 0 && f.key !== "all"}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                active
                  ? "bg-amber-500 text-white"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {f.label}{" "}
              <span className={active ? "opacity-80" : "opacity-60"}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((p, idx) => {
          const targetMatch =
            !!p.position && weakestPositions.includes(p.position);
          return (
            <li
              key={p.id}
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
                name={p.name}
                position={p.position ?? null}
                photoUrl={p.photoUrl}
                size="sm"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold">
                  {p.name}
                </span>
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
        {visible.length === 0 && (
          <li className="text-sm text-zinc-500 dark:text-zinc-400">
            No rookies match this filter.
          </li>
        )}
      </ul>
    </div>
  );
}
