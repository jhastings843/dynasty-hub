import { CALLS_BY_SLEEPER_ID } from "@/lib/jingles/data";

// Jingles Labs annotates values, it does not replace them. The badge shows his
// call and links back to the post it came from.

const STYLE = {
  target:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  fade: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
} as const;

const LABEL = { target: "Jingles target", fade: "Jingles fade" } as const;

/** Compact chip for dense lists. Renders nothing when he has no call. */
export function JinglesBadge({ sleeperId }: { sleeperId: string }) {
  const call = CALLS_BY_SLEEPER_ID[sleeperId];
  if (!call) return null;

  return (
    <a
      href={call.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`${call.note} (ADP ${call.adp}, his rank ${call.jinglesRank})`}
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider hover:underline ${STYLE[call.verdict]}`}
    >
      {call.verdict === "target" ? "Target" : "Fade"}
    </a>
  );
}

/** Full call with reasoning, for a player's own page. */
export function JinglesCallCard({ sleeperId }: { sleeperId: string }) {
  const call = CALLS_BY_SLEEPER_ID[sleeperId];
  if (!call) return null;

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STYLE[call.verdict]}`}
        >
          {LABEL[call.verdict]}
        </span>
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          ADP {call.adp} · his rank {call.jinglesRank}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {call.note}
      </p>
      <a
        href={call.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
      >
        Jingles Labs, {call.postedAt} →
      </a>
    </section>
  );
}
