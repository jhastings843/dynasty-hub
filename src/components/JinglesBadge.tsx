import {
  CALLS_BY_SLEEPER_ID,
  LAST_UPDATED,
  type JinglesVerdict,
} from "@/lib/jingles/data";
import type { LeagueType } from "@/lib/league/types";

// Jingles Labs annotates values, it does not replace them. The badge shows his
// call and links back to the post it came from.
//
// His research is half-PPR redraft. A redraft fade says nothing about a
// player's dynasty value, so these render only in non-dynasty leagues.

function appliesTo(type: LeagueType | undefined): boolean {
  return type !== undefined && type !== "dynasty";
}

const STYLE: Record<JinglesVerdict, string> = {
  target:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  fade: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  league_winner:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
};

const CHIP: Record<JinglesVerdict, string> = {
  target: "Target",
  fade: "Fade",
  league_winner: "League winner",
};

const LABEL: Record<JinglesVerdict, string> = {
  target: "Jingles target",
  fade: "Jingles fade",
  league_winner: "Jingles league winner",
};

/** Compact chip for dense lists. Renders nothing when he has no call. */
export function JinglesBadge({
  sleeperId,
  leagueType,
}: {
  sleeperId: string;
  leagueType?: LeagueType;
}) {
  const call = CALLS_BY_SLEEPER_ID[sleeperId];
  if (!call || !appliesTo(leagueType)) return null;

  return (
    <a
      href={call.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={
        call.adp
          ? `${call.note} (ADP ${call.adp}, his rank ${call.jinglesRank})`
          : call.note
      }
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider hover:underline ${STYLE[call.verdict]}`}
    >
      {CHIP[call.verdict]}
    </a>
  );
}

/** Full call with reasoning, for a player's own page. */
export function JinglesCallCard({
  sleeperId,
  leagueType,
}: {
  sleeperId: string;
  leagueType?: LeagueType;
}) {
  const call = CALLS_BY_SLEEPER_ID[sleeperId];
  if (!call || !appliesTo(leagueType)) return null;

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STYLE[call.verdict]}`}
        >
          {LABEL[call.verdict]}
        </span>
        {call.adp && (
          <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            ADP {call.adp} · his rank {call.jinglesRank}
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {call.note}
      </p>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <a
          href={call.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
        >
          Jingles Labs, {call.postedAt} →
        </a>
        {/* He posts often. Say when this was last pulled so a stale take is
            obvious rather than looking current. */}
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
          pulled {LAST_UPDATED}
        </span>
      </div>
    </section>
  );
}
