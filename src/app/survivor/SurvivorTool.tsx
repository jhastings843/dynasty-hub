"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Trash2 } from "lucide-react";
import {
  NFL_TEAMS,
  TIER_LABEL,
  TIER_TINT,
  logoUrl,
  teamByAbbr,
  type NFLTeam,
} from "@/lib/survivor/teams";

const STORAGE_KEY = "fantasy-hub:survivor:v1";
// Pools saved before the Dynasty Hub -> Fantasy Hub rename live under the old
// key; read it as a fallback so nothing is lost. The next save writes the new key.
const LEGACY_STORAGE_KEY = "dynasty-hub:survivor:v1";

interface PoolConfig {
  poolSize: number | "";
  entriesAlive: number | "";
  strikes: number | "";
  canRebuy: boolean;
  usedTeams: string[]; // team abbrs
  comparator: { a: string | null; b: string | null };
}

const DEFAULT_CONFIG: PoolConfig = {
  poolSize: "",
  entriesAlive: "",
  strikes: 1,
  canRebuy: false,
  usedTeams: [],
  comparator: { a: null, b: null },
};

function saveConfig(c: PoolConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {
    // ignore quota errors
  }
}

function loadConfig(): PoolConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<PoolConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function poolSizeAdvice(size: number | "", alive: number | ""): string {
  const n = typeof alive === "number" ? alive : typeof size === "number" ? size : 0;
  if (!n) return "Enter pool size or entries alive to get strategy guidance.";
  if (n <= 50) {
    return "Small pool. Lean chalk: take the safest pick available, lock in equity when other entries bust on volatile dogs.";
  }
  if (n <= 250) {
    return "Mid-size pool. Moderate leverage works. Pivot off only the single most-popular pick if a strong alternative (70%+ win prob) exists.";
  }
  if (n <= 1000) {
    return "Sizable pool. Look for clear leverage spots. The chalk pick that 35%+ of the field takes is rarely the optimal play here.";
  }
  return "Large pool. Survival alone is not enough — you need leverage to finish first. Actively fade the most-public team when an alternative >= 65% exists.";
}

export default function SurvivorTool() {
  const [config, setConfig] = useState<PoolConfig>(DEFAULT_CONFIG);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadConfig();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig(loaded);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveConfig(config);
  }, [config, hydrated]);

  const usedSet = useMemo(() => new Set(config.usedTeams), [config.usedTeams]);

  function toggleUsed(abbr: string) {
    const next = new Set(usedSet);
    if (next.has(abbr)) next.delete(abbr);
    else next.add(abbr);
    setConfig((c) => ({ ...c, usedTeams: [...next] }));
  }

  function clearUsed() {
    setConfig((c) => ({ ...c, usedTeams: [] }));
  }

  function setComparator(slot: "a" | "b", abbr: string | null) {
    setConfig((c) => ({ ...c, comparator: { ...c.comparator, [slot]: abbr } }));
  }

  const remainingTeams = NFL_TEAMS.filter((t) => !usedSet.has(t.abbr));
  const sortedRemaining = [...remainingTeams].sort(
    (a, b) => b.rating - a.rating,
  );

  const groupedByDivision = useMemo(() => {
    const groups: Record<string, NFLTeam[]> = {};
    for (const t of NFL_TEAMS) {
      const key = `${t.conference} ${t.division}`;
      (groups[key] ??= []).push(t);
    }
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.city.localeCompare(b.city));
    }
    return groups;
  }, []);

  const compA = config.comparator.a ? teamByAbbr(config.comparator.a) : null;
  const compB = config.comparator.b ? teamByAbbr(config.comparator.b) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Pool config */}
      <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <header className="flex items-baseline justify-between">
          <h2 className="text-base font-bold tracking-tight">Pool config</h2>
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            Saved automatically
          </span>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Pool size (entries at start)
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={config.poolSize}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  poolSize:
                    e.target.value === "" ? "" : Math.max(1, Number(e.target.value)),
                }))
              }
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="e.g. 250"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Entries still alive
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={config.entriesAlive}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  entriesAlive:
                    e.target.value === "" ? "" : Math.max(1, Number(e.target.value)),
                }))
              }
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="leave blank pre-week 1"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Strikes per entry
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={5}
              value={config.strikes}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  strikes:
                    e.target.value === "" ? "" : Math.max(1, Number(e.target.value)),
                }))
              }
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Rebuys allowed?
            </span>
            <div className="flex h-[38px] items-center">
              <button
                type="button"
                onClick={() =>
                  setConfig((c) => ({ ...c, canRebuy: !c.canRebuy }))
                }
                className={`inline-flex w-full items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  config.canRebuy
                    ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                }`}
              >
                {config.canRebuy ? "Yes" : "No"}
              </button>
            </div>
          </label>
        </div>
        <p className="rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
          {poolSizeAdvice(config.poolSize, config.entriesAlive)}
        </p>
      </section>

      {/* Used teams + matrix */}
      <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-bold tracking-tight">
              Teams matrix ({config.usedTeams.length} used,{" "}
              {32 - config.usedTeams.length} remaining)
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Tap a team to mark it used. Used teams gray out and drop off your
              remaining list.
            </p>
          </div>
          {config.usedTeams.length > 0 && (
            <button
              type="button"
              onClick={clearUsed}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <Trash2 size={12} aria-hidden />
              Clear all
            </button>
          )}
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {(["AFC", "NFC"] as const).map((conf) => (
            <div key={conf} className="flex flex-col gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {conf}
              </span>
              {(["East", "North", "South", "West"] as const).map((div) => {
                const teams = groupedByDivision[`${conf} ${div}`] ?? [];
                return (
                  <div key={div} className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      {div}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {teams.map((t) => {
                        const used = usedSet.has(t.abbr);
                        return (
                          <button
                            key={t.abbr}
                            type="button"
                            onClick={() => toggleUsed(t.abbr)}
                            className={`group flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-all ${
                              used
                                ? "border-zinc-200 bg-zinc-100 opacity-50 dark:border-zinc-800 dark:bg-zinc-800/40"
                                : "border-zinc-200 bg-white hover:border-amber-300 hover:bg-amber-50/50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-amber-800 dark:hover:bg-amber-950/15"
                            }`}
                          >
                            <Image
                              src={logoUrl(t.abbr)}
                              alt=""
                              width={20}
                              height={20}
                              className={`size-5 shrink-0 ${used ? "grayscale" : ""}`}
                              unoptimized
                            />
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-xs font-bold">
                                {t.abbr}
                              </span>
                              <span className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                                {t.rating}
                              </span>
                            </div>
                            {used && (
                              <Check
                                size={12}
                                aria-hidden
                                className="shrink-0 text-emerald-600 dark:text-emerald-400"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {/* Strongest remaining */}
      <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <header className="flex items-baseline justify-between">
          <h2 className="text-base font-bold tracking-tight">
            Strongest remaining teams
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Sorted by 2026 baseline rating
          </span>
        </header>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sortedRemaining.slice(0, 12).map((t) => (
            <li
              key={t.abbr}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/50"
            >
              <Image
                src={logoUrl(t.abbr)}
                alt=""
                width={28}
                height={28}
                className="size-7 shrink-0"
                unoptimized
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-bold">
                  {t.city} {t.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TIER_TINT[t.tier]}`}
                  >
                    {TIER_LABEL[t.tier]}
                  </span>
                  <span className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                    {t.note}
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums">
                {t.rating}
              </span>
            </li>
          ))}
        </ul>
        {sortedRemaining.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            All teams used. Time to retire.
          </p>
        )}
      </section>

      {/* Comparator */}
      <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <header className="flex items-baseline justify-between">
          <h2 className="text-base font-bold tracking-tight">
            Should I use this team?
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Side-by-side baseline
          </span>
        </header>
        <div className="grid gap-3 md:grid-cols-2">
          {(["a", "b"] as const).map((slot) => {
            const team = slot === "a" ? compA : compB;
            return (
              <div
                key={slot}
                className="flex flex-col gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-zinc-800/80 dark:bg-zinc-950/50"
              >
                <select
                  value={team?.abbr ?? ""}
                  onChange={(e) =>
                    setComparator(slot, e.target.value || null)
                  }
                  className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <option value="">Select team...</option>
                  {NFL_TEAMS.map((t) => (
                    <option key={t.abbr} value={t.abbr}>
                      {t.city} {t.name} {usedSet.has(t.abbr) ? "(used)" : ""}
                    </option>
                  ))}
                </select>
                {team ? (
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center gap-3">
                      <Image
                        src={logoUrl(team.abbr)}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 shrink-0"
                        unoptimized
                      />
                      <div className="flex min-w-0 flex-col">
                        <span className="text-base font-bold">
                          {team.city} {team.name}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {team.conference} {team.division}
                        </span>
                      </div>
                      <span
                        className={`ml-auto rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${TIER_TINT[team.tier]}`}
                      >
                        Tier {team.tier}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 dark:bg-zinc-900">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Baseline rating
                      </span>
                      <span className="text-2xl font-black tabular-nums">
                        {team.rating}
                      </span>
                    </div>
                    {team.note && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {team.note}
                      </p>
                    )}
                    {usedSet.has(team.abbr) && (
                      <span className="rounded-md bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                        Already used in this pool
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="py-3 text-center text-xs text-zinc-400 dark:text-zinc-600">
                    Pick a team to see its profile.
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {compA && compB && (
          <div className="rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
            <strong>Baseline edge:</strong>{" "}
            {compA.rating === compB.rating ? (
              <span>Even. Decide on schedule, ownership, and trap signals.</span>
            ) : compA.rating > compB.rating ? (
              <span>
                {compA.abbr} +{compA.rating - compB.rating} on raw strength. Still
                weigh future scarcity, ownership, and matchup before locking in.
              </span>
            ) : (
              <span>
                {compB.abbr} +{compB.rating - compA.rating} on raw strength. Still
                weigh future scarcity, ownership, and matchup before locking in.
              </span>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
