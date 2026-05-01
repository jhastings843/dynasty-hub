import Link from "next/link";

const CARDS = [
  {
    href: "/dynasty",
    title: "Dynasty",
    blurb:
      "Your roster with FantasyCalc values, league standings, and a trade analyzer with positional power rankings.",
  },
  {
    href: "/survivor",
    title: "Survivor",
    blurb: "NFL survivor pool tools. Coming soon.",
  },
  {
    href: "/resources",
    title: "Resources",
    blurb:
      "Curated dynasty calculators, ranking sites, draft prep, and writers worth following.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <section className="mb-10 flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight lg:text-5xl">
          Dynasty Hub
        </h1>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Dynasty fantasy football tools, built on Sleeper league data and
          FantasyCalc community values.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/70"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold tracking-tight">
                {c.title}
              </h2>
              <span
                aria-hidden
                className="text-zinc-400 transition-transform group-hover:translate-x-0.5"
              >
                ›
              </span>
            </div>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {c.blurb}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
