import { ArrowUpRight, BookOpen, ChevronDown, Target } from "lucide-react";
import { RESOURCES } from "@/lib/resources/data";
import { STRATEGY_ARTICLES } from "@/lib/survivor/strategy";
import SurvivorTool from "./SurvivorTool";

export const dynamic = "force-dynamic";

export default function SurvivorPage() {
  const survivorTools = RESOURCES.filter(
    (r) => r.category === "survivor_tools",
  );
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              <Target size={12} aria-hidden />
              Phase 1 of 3
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Pool config, used-teams matrix, baseline ratings, strategy library
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            NFL survivor strategy
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Plan your survivor entry around future scarcity, pool size, and
            leverage, not just the biggest favorite each week. The chassis is
            here. Vegas lines, public pick percentages, and the weekly
            recommendation engine come online closer to Week 1.
          </p>
        </header>

        {/* The interactive tool (client component) */}
        <SurvivorTool />

        {/* Strategy articles */}
        <section className="flex flex-col gap-3">
          <header className="flex items-center gap-2">
            <BookOpen
              size={18}
              aria-hidden
              className="text-zinc-500 dark:text-zinc-400"
            />
            <h2 className="text-xl font-semibold tracking-tight">
              Strategy library
            </h2>
          </header>
          <ul className="flex flex-col gap-2">
            {STRATEGY_ARTICLES.map((article) => (
              <li key={article.id}>
                <details className="group flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
                  <summary className="flex cursor-pointer items-start justify-between gap-3 list-none">
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="text-sm font-bold">{article.title}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {article.hook}
                      </span>
                    </div>
                    <ChevronDown
                      size={16}
                      aria-hidden
                      className="mt-1 shrink-0 text-zinc-400 transition-transform group-open:rotate-180 dark:text-zinc-500"
                    />
                  </summary>
                  <div className="flex flex-col gap-3 pt-2">
                    <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {article.body}
                    </p>
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 dark:border-amber-900/60 dark:bg-amber-950/20">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        Rule of thumb
                      </span>
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {article.takeaway}
                      </p>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>

        {/* What's coming */}
        <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-5 dark:border-zinc-700 dark:bg-zinc-900/40">
          <h2 className="text-base font-bold tracking-tight">Coming next</h2>
          <ul className="flex flex-col gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>
              <strong>Phase 2 (mid-May):</strong> Future scarcity grid mapping
              your remaining teams against the 2026 schedule (drops in mid-May).
            </li>
            <li>
              <strong>Phase 2 (August):</strong> Vegas lines via the-odds-api,
              implied win probabilities per game, weekly recommendation engine
              that combines strength + odds + your remaining teams.
            </li>
            <li>
              <strong>Phase 3 (Week 1+):</strong> Sleeper survivor pool
              integration to pull your specific pool&apos;s pick distribution and
              entries-still-alive count automatically. Public pick percentages,
              injury overlays, and leverage scoring.
            </li>
          </ul>
        </section>

        {/* External tools (kept for reference) */}
        {survivorTools.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              External tools
            </h2>
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {survivorTools.map((t) => (
                <li
                  key={t.url}
                  className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 transition-colors hover:border-amber-300 hover:bg-amber-50/30 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-800 dark:hover:bg-amber-950/10"
                >
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-semibold text-zinc-900 hover:text-amber-700 dark:text-zinc-50 dark:hover:text-amber-400"
                  >
                    {t.name}
                    <ArrowUpRight size={14} aria-hidden />
                  </a>
                  {t.note && (
                    <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {t.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
