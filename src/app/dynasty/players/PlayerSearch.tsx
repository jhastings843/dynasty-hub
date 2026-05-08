"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerLink } from "@/components/PlayerLink";

const POSITION_TINT: Record<string, string> = {
  QB: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  RB: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  WR: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  TE: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

const TRACKED_POSITIONS = ["QB", "RB", "WR", "TE"] as const;

type PositionFilter = (typeof TRACKED_POSITIONS)[number] | "all";

export interface SearchablePlayer {
  id: string;
  name: string;
  position: string | null;
  team: string | null;
  value: number;
  photoUrl: string | null;
  rostered: boolean;
  ownerName: string | null;
}

const RESULT_LIMIT = 40;

export function PlayerSearch({ players }: { players: SearchablePlayer[] }) {
  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState<PositionFilter>("all");
  const [waiverOnly, setWaiverOnly] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    let filtered = players;
    if (posFilter !== "all") {
      filtered = filtered.filter((p) => p.position === posFilter);
    }
    if (waiverOnly) {
      filtered = filtered.filter((p) => !p.rostered);
    }
    if (q.length > 0) {
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q));
    } else {
      // Default sort: highest value first when no query
      filtered = [...filtered].sort((a, b) => b.value - a.value);
      return filtered.slice(0, RESULT_LIMIT);
    }
    // When searching, score by: starts-with > contains, then value
    filtered = [...filtered].sort((a, b) => {
      const an = a.name.toLowerCase();
      const bn = b.name.toLowerCase();
      const aStarts = an.startsWith(q) ? 0 : 1;
      const bStarts = bn.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return b.value - a.value;
    });
    return filtered.slice(0, RESULT_LIMIT);
  }, [deferredQuery, posFilter, waiverOnly, players]);

  const showingTotalNote =
    deferredQuery.trim().length > 0 || posFilter !== "all" || waiverOnly;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight">
          Search all players
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {players.length.toLocaleString()} indexed
        </span>
      </header>

      <div className="relative">
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a player name..."
          className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-9 pr-3 text-base focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 dark:border-zinc-800 dark:bg-zinc-900"
          aria-label="Search players"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...TRACKED_POSITIONS] as PositionFilter[]).map((pos) => {
            const active = posFilter === pos;
            return (
              <button
                key={pos}
                type="button"
                onClick={() => setPosFilter(pos)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-amber-500 text-white"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {pos === "all" ? "All" : pos}
              </button>
            );
          })}
        </div>
        <label className="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
          <input
            type="checkbox"
            className="size-3.5 rounded border-zinc-300 text-amber-600 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800"
            checked={waiverOnly}
            onChange={(e) => setWaiverOnly(e.target.checked)}
          />
          Waivers only
        </label>
      </div>

      <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {results.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No players match.
          </li>
        )}
        {results.map((p) => {
          const posChip = p.position
            ? (POSITION_TINT[p.position] ??
              "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300")
            : null;
          return (
            <li
              key={p.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
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
                  {posChip && (
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${posChip}`}
                    >
                      {p.position}
                    </span>
                  )}
                </div>
                <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {p.team ?? "FA"} ·{" "}
                  {p.rostered ? (
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {p.ownerName ?? "rostered"}
                    </span>
                  ) : (
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      Available
                    </span>
                  )}
                </span>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {p.value > 0 ? p.value.toLocaleString() : "—"}
              </span>
            </li>
          );
        })}
      </ul>

      {showingTotalNote && results.length === RESULT_LIMIT && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Showing top {RESULT_LIMIT}. Refine the search to narrow down.
        </p>
      )}
    </section>
  );
}
