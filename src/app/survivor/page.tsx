import { ArrowUpRight } from "lucide-react";
import { RESOURCES } from "@/lib/resources/data";

export default function SurvivorPage() {
  const survivorTools = RESOURCES.filter(
    (r) => r.category === "survivor_tools",
  );
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            Coming soon
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            NFL survivor pool
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Pick-tracking, EV-aware suggestions, and season-long planning
            against your pool size. Until that ships, lean on the tools below.
          </p>
        </div>

        {survivorTools.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Tools we recommend
            </h2>
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {survivorTools.map((t) => (
                <li
                  key={t.url}
                  className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-amber-300 hover:bg-amber-50/30 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-800 dark:hover:bg-amber-950/10"
                >
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-base font-semibold text-zinc-900 hover:text-amber-700 dark:text-zinc-50 dark:hover:text-amber-400"
                  >
                    {t.name}
                    <ArrowUpRight size={14} aria-hidden />
                  </a>
                  {t.note && (
                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
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
