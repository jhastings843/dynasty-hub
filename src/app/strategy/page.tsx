import type { Metadata } from "next";
import { PLAYBOOKS } from "@/lib/strategy/playbooks";
import { LEAGUE_TYPE_LABEL, type LeagueType } from "@/lib/league/types";

export const metadata: Metadata = {
  title: "Strategy playbooks",
  description:
    "How dynasty, redraft, and guillotine leagues are actually played, and why the same roster is worth different things in each.",
};

const TYPE_CHIP: Record<LeagueType, string> = {
  dynasty:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  redraft: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300",
  guillotine:
    "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
};

export default function StrategyPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-10">
        <header className="flex max-w-2xl flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Three formats, three games
          </h1>
          <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            The same roster is worth different things depending on the format.
            These are the principles behind the goals your league pages compute,
            gathered in one place to read before a draft.
          </p>
        </header>

        {PLAYBOOKS.map((pb) => (
          <section key={pb.type} className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {pb.title}
                </h2>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_CHIP[pb.type]}`}
                >
                  {LEAGUE_TYPE_LABEL[pb.type]}
                </span>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {pb.thesis}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {pb.sections.map((sec) => (
                <div
                  key={sec.heading}
                  className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                >
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {sec.heading}
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {sec.points.map((pt, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
                      >
                        <span
                          aria-hidden
                          className="mt-1.5 size-1 shrink-0 rounded-full bg-amber-500"
                        />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold">Sources</span>
              {pb.sources.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-amber-700 hover:underline dark:text-amber-400"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
