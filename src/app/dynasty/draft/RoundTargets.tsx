import { PlayerAvatar } from "@/components/PlayerAvatar";
import type { RookieRow } from "./RookieList";

interface UserPick {
  pickNo: number;
  round: number;
  slot: number;
  zone: string;
  label: string;
  value: number | null;
}

// Simple model for "who's likely available at pick X":
// assume rookies get drafted in roughly RA-value order, so the top
// (pickNo - 1) are likely gone. Show the next 12 candidates (some
// will be picked before your turn; the rest are realistic gets).
function targetsForPick(
  pick: UserPick,
  rookies: RookieRow[],
  windowSize = 12,
): RookieRow[] {
  const sorted = [...rookies].sort((a, b) => b.value - a.value);
  const start = Math.max(0, pick.pickNo - 1);
  return sorted.slice(start, start + windowSize);
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function FlagChip({
  label,
  tone,
}: {
  label: string;
  tone: "buy" | "sell" | "break";
}) {
  const cls =
    tone === "buy"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
      : tone === "sell"
        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  return (
    <span
      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  );
}

function RookieRowItem({
  r,
  isFit,
  rank,
}: {
  r: RookieRow;
  isFit: boolean;
  rank: number;
}) {
  return (
    <li
      className={`flex items-center gap-2.5 px-3 py-2 ${
        isFit
          ? "bg-amber-50/60 dark:bg-amber-950/20"
          : ""
      }`}
    >
      <span className="w-5 shrink-0 text-[11px] font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
        {rank}
      </span>
      <PlayerAvatar
        name={r.name}
        position={r.position ?? null}
        photoUrl={r.photoUrl}
        size="sm"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-medium">{r.name}</span>
          {isFit && (
            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              Fit
            </span>
          )}
          {r.buyLow && <FlagChip label="Buy" tone="buy" />}
          {r.sellHigh && <FlagChip label="Sell" tone="sell" />}
          {r.breakout && <FlagChip label="Break" tone="break" />}
        </div>
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {[r.team ?? "FA", r.position, r.age ? `age ${r.age}` : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        {r.value.toLocaleString()}
      </span>
    </li>
  );
}

function PickCard({
  pick,
  rookies,
  weakestPositions,
  isPast,
}: {
  pick: UserPick;
  rookies: RookieRow[];
  weakestPositions: string[];
  isPast: boolean;
}) {
  const targets = targetsForPick(pick, rookies);
  const fits = targets.filter(
    (r) => r.position && weakestPositions.includes(r.position),
  );
  const others = targets.filter(
    (r) => !r.position || !weakestPositions.includes(r.position),
  );

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border ${
        isPast
          ? "border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-950"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold tabular-nums">
            {pick.round}.{pick.slot.toString().padStart(2, "0")}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {pick.zone.charAt(0).toUpperCase() + pick.zone.slice(1)}{" "}
            {ordinal(pick.round)}
          </span>
        </div>
        <span className="text-xs tabular-nums text-amber-700 dark:text-amber-400">
          pick value{" "}
          <span className="font-semibold">
            {pick.value != null ? pick.value.toLocaleString() : "—"}
          </span>
        </span>
      </div>

      {targets.length === 0 ? (
        <p className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
          No targets available — pool is empty.
        </p>
      ) : (
        <>
          {fits.length > 0 && (
            <div>
              <div className="bg-amber-50/40 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                Position fits ({weakestPositions.join(" / ")})
              </div>
              <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
                {fits.slice(0, 5).map((r) => (
                  <RookieRowItem
                    key={r.id}
                    r={r}
                    isFit
                    rank={r.rank}
                  />
                ))}
              </ul>
            </div>
          )}
          {others.length > 0 && (
            <div>
              <div className="bg-zinc-100 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
                Best available
              </div>
              <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
                {others.slice(0, 8).map((r) => (
                  <RookieRowItem
                    key={r.id}
                    r={r}
                    isFit={false}
                    rank={r.rank}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function RoundTargets({
  userPicks,
  rookies,
  weakestPositions,
  draftedPickNos = [],
}: {
  userPicks: UserPick[];
  rookies: RookieRow[];
  weakestPositions: string[];
  draftedPickNos?: number[];
}) {
  if (userPicks.length === 0) return null;
  const draftedSet = new Set(draftedPickNos);
  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Round-by-round targets
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Realistic gets at each of your picks, ranked by RosterAudit value.
          Weak-position rookies tagged{" "}
          <span className="font-semibold text-amber-700 dark:text-amber-400">
            Fit
          </span>
          . Updates as the draft progresses.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        {userPicks.map((pick) => (
          <PickCard
            key={pick.pickNo}
            pick={pick}
            rookies={rookies}
            weakestPositions={weakestPositions}
            isPast={draftedSet.has(pick.pickNo)}
          />
        ))}
      </div>
    </section>
  );
}
