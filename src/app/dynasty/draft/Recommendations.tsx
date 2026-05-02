import { ChevronDown, Sparkles } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import type { Recommendation } from "@/lib/dynasty/draft-recommender";

const RANK_TINTS: Record<
  number,
  { tile: string; shadow: string }
> = {
  1: {
    tile: "from-amber-400 to-orange-500",
    shadow: "shadow-amber-500/40",
  },
  2: {
    tile: "from-zinc-400 to-zinc-600",
    shadow: "shadow-zinc-500/30",
  },
  3: {
    tile: "from-orange-300 to-amber-600",
    shadow: "shadow-orange-500/30",
  },
};

export function Recommendations({
  recommendations,
  nextPickLabel,
}: {
  recommendations: Recommendation[];
  nextPickLabel: string | null;
}) {
  if (recommendations.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Sparkles
            size={18}
            className="text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          <h2 className="text-xl font-semibold tracking-tight">
            Top recommendations
          </h2>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {nextPickLabel
            ? `If your pick was right now (${nextPickLabel}). Ranked by RosterAudit value + position fit + age, with KeepTradeCut as a consensus check.`
            : "Ranked by RosterAudit value + position fit + age, with KeepTradeCut as a consensus check."}
        </p>
      </header>
      <ol className="flex flex-col gap-3">
        {recommendations.map((rec) => {
          const tint = RANK_TINTS[rec.rank] ?? RANK_TINTS[3];
          return (
            <li
              key={rec.player.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 backdrop-blur transition-all hover:border-amber-300 hover:shadow-md hover:shadow-amber-500/10 dark:border-zinc-800/80 dark:bg-zinc-900/80 dark:hover:border-amber-800"
            >
              <div className="flex items-center gap-4 p-4">
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-2xl font-black tracking-tighter text-white shadow-md ${tint.tile} ${tint.shadow}`}
                >
                  {rec.rank}
                </span>
                <PlayerAvatar
                  name={rec.player.name}
                  position={rec.player.position}
                  photoUrl={rec.player.photoUrl}
                  size="md"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-base font-bold">
                      {rec.player.name}
                    </span>
                    {rec.isFit && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        Fit
                      </span>
                    )}
                    {rec.player.buyLow && (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        Buy
                      </span>
                    )}
                    {rec.player.breakout && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                        Break
                      </span>
                    )}
                    {rec.player.sellHigh && (
                      <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                        Risk
                      </span>
                    )}
                    {rec.consensus.level === "high" && (
                      <span
                        title={rec.consensus.note}
                        className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                      >
                        Consensus
                      </span>
                    )}
                    {rec.consensus.level === "split" && (
                      <span
                        title={rec.consensus.note}
                        className="shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        Split
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {[
                      rec.player.team ?? "FA",
                      rec.player.position,
                      rec.player.age ? `age ${rec.player.age}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {" · "}
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {rec.headline}
                    </span>
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <span className="text-lg font-bold tabular-nums">
                    {rec.player.value.toLocaleString()}
                  </span>
                  {Math.abs(rec.surplus) >= 200 && (
                    <span
                      className={`text-[10px] font-bold tabular-nums ${
                        rec.surplus > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {rec.surplus > 0 ? "+" : ""}
                      {rec.surplus.toLocaleString()} vs pick
                    </span>
                  )}
                </div>
              </div>
              <details className="group border-t border-zinc-200/60 dark:border-zinc-800/60">
                <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/40">
                  <span className="uppercase tracking-wider">
                    Why this pick
                  </span>
                  <ChevronDown
                    size={14}
                    className="transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <ul className="flex flex-col gap-1.5 border-t border-zinc-200/60 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800/60 dark:bg-zinc-950/40">
                  {rec.reasoning.map((r, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300"
                    >
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-amber-500" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
