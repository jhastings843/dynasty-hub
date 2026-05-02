import Link from "next/link";
import { getMovers } from "@/lib/rosteraudit/client";
import type { RAMover } from "@/lib/rosteraudit/types";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerLink } from "@/components/PlayerLink";

export const dynamic = "force-dynamic";

const POSITION_TINT: Record<string, string> = {
  QB: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  RB: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  WR: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  TE: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

function PositionChip({ position }: { position: string }) {
  const cls =
    POSITION_TINT[position] ??
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${cls}`}
    >
      {position}
    </span>
  );
}

function FlagChip({ label, tone }: { label: string; tone: "buy" | "sell" | "breakout" }) {
  const cls =
    tone === "buy"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
      : tone === "sell"
        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  return (
    <span
      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}

function MoverCard({ m, direction }: { m: RAMover; direction: "up" | "down" }) {
  const trend30 = m.trend30Day;
  const trend7 = m.trend7Day;
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <PlayerAvatar name={m.name} position={m.position} size="sm" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <PlayerLink
              id={m.sleeperId}
              name={m.name}
              className="truncate text-sm font-medium"
            />
            <PositionChip position={m.position} />
          </div>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {m.valueSf.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-zinc-500 dark:text-zinc-400">
          {[m.team ?? "FA", m.age ? `age ${Math.round(m.age * 10) / 10}` : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <div className="flex items-center gap-2 tabular-nums">
          {trend7 !== 0 && (
            <span
              className={
                trend7 > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }
            >
              7d {trend7 > 0 ? "+" : ""}
              {trend7}
            </span>
          )}
          {trend30 !== 0 && (
            <span
              className={
                trend30 > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }
            >
              30d {trend30 > 0 ? "+" : ""}
              {trend30}
            </span>
          )}
          {trend7 === 0 && trend30 === 0 && (
            <span className="text-zinc-400 dark:text-zinc-600">
              {direction === "up" ? "rising" : "falling"}
            </span>
          )}
        </div>
      </div>
      {(m.buyLow || m.sellHigh || m.breakout) && (
        <div className="flex flex-wrap gap-1">
          {m.buyLow && <FlagChip label="Buy low" tone="buy" />}
          {m.sellHigh && <FlagChip label="Sell high" tone="sell" />}
          {m.breakout && <FlagChip label="Breakout" tone="breakout" />}
        </div>
      )}
    </li>
  );
}

export default async function MoversPage() {
  const { risers, fallers } = await getMovers(30);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Link
            href="/dynasty"
            className="text-sm text-zinc-500 dark:text-zinc-400"
          >
            ‹ Dynasty
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">
            Value movers
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Biggest risers and fallers in the dynasty market over the past 30
            days. Useful for buy-low / sell-high targets and rookie spike
            tracking.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="flex flex-col gap-3">
            <header className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold">Risers</h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {risers.length} players
              </span>
            </header>
            <ul className="flex flex-col gap-3">
              {risers.map((m) => (
                <MoverCard key={m.sleeperId} m={m} direction="up" />
              ))}
              {risers.length === 0 && (
                <li className="text-sm text-zinc-500 dark:text-zinc-400">
                  No risers right now.
                </li>
              )}
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <header className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold">Fallers</h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {fallers.length} players
              </span>
            </header>
            <ul className="flex flex-col gap-3">
              {fallers.map((m) => (
                <MoverCard key={m.sleeperId} m={m} direction="down" />
              ))}
              {fallers.length === 0 && (
                <li className="text-sm text-zinc-500 dark:text-zinc-400">
                  No fallers right now.
                </li>
              )}
            </ul>
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
