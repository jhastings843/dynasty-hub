"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { TOOLS, leaguePath } from "@/lib/league/tools";
import { LEAGUE_TYPE_LABEL, type LeagueProfile } from "@/lib/league/types";

const TYPE_CHIP: Record<string, string> = {
  dynasty:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  redraft: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300",
  guillotine:
    "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
};

/**
 * Which tool the current URL is on, if any. Only the top-level segment carries
 * across a league switch: detail pages are keyed to one league's rosters and
 * members, so following them into another league would land on nothing.
 */
function currentToolSegment(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean); // ["l", id, segment, ...]
  const segment = parts[2] ?? "";
  return TOOLS.some((t) => t.segment === segment && t.segment !== "")
    ? segment
    : "";
}

function targetPath(pathname: string, league: LeagueProfile): string {
  const segment = currentToolSegment(pathname);
  if (!segment) return leaguePath(league.id, "");

  const tool = TOOLS.find((t) => t.segment === segment);
  const supported = tool?.types.includes(league.type) ?? false;
  return leaguePath(league.id, supported ? segment : "");
}

export function LeagueSwitcher({
  leagues,
  current,
}: {
  leagues: LeagueProfile[];
  current: LeagueProfile;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname() ?? "";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Nothing to switch to.
  if (leagues.length < 2) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {current.name}
        <TypeChip type={current.type} />
      </span>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-white/70 px-3 py-1.5 text-sm font-semibold text-zinc-900 transition-colors hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-50 dark:hover:border-zinc-700"
      >
        <span className="max-w-[10rem] truncate">{current.name}</span>
        <TypeChip type={current.type} />
        <ChevronDown
          size={14}
          aria-hidden
          className={`text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 z-50 mt-1.5 w-72 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          {leagues.map((l) => {
            const active = l.id === current.id;
            return (
              <Link
                key={l.id}
                href={targetPath(pathname, l)}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center justify-between gap-3 border-b border-zinc-100 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-amber-50/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 dark:border-zinc-800 dark:hover:bg-amber-950/20"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {l.name}
                  </span>
                  <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                    {l.teams} team {l.superflex ? "superflex" : "single QB"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <TypeChip type={l.type} />
                  {active && (
                    <Check
                      size={14}
                      aria-label="Current league"
                      className="text-amber-600 dark:text-amber-400"
                    />
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TypeChip({ type }: { type: string }) {
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_CHIP[type] ?? TYPE_CHIP.dynasty}`}
    >
      {LEAGUE_TYPE_LABEL[type as keyof typeof LEAGUE_TYPE_LABEL] ?? type}
    </span>
  );
}
