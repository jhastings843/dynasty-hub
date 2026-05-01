import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Compass,
  ListOrdered,
  Repeat,
  ShieldCheck,
  TrendingUp,
  Trophy,
} from "lucide-react";

const PRIMARY = {
  href: "/dynasty",
  title: "Dynasty",
  blurb:
    "Your roster with live RosterAudit values, league standings, and team-value rankings.",
  icon: Trophy,
};

const SECONDARY = [
  {
    href: "/dynasty/plan",
    title: "Season plan",
    blurb:
      "Trajectory, auto goals from your data, custom goals, and key dates.",
    icon: Compass,
  },
  {
    href: "/dynasty/draft",
    title: "Draft helper",
    blurb:
      "Live rookie board, your draft slot and picks, and weakest-position fits.",
    icon: ListOrdered,
  },
  {
    href: "/dynasty/trade",
    title: "Trade analyzer",
    blurb:
      "Pick a partner, drop in players or 2026-2029 picks, see who wins by how much.",
    icon: Repeat,
  },
  {
    href: "/dynasty/movers",
    title: "Value movers",
    blurb:
      "Risers, fallers, buy-low and sell-high targets across the dynasty market.",
    icon: TrendingUp,
  },
  {
    href: "/resources",
    title: "Resources",
    blurb:
      "Curated calculators, ranking sites, draft prep, and writers worth following.",
    icon: BookOpen,
  },
  {
    href: "/survivor",
    title: "Survivor pool",
    blurb: "NFL survivor strategy tools. Coming soon.",
    icon: ShieldCheck,
  },
];

const STATS = [
  { value: "523+", label: "ranked dynasty players" },
  { value: "60", label: "rookie picks valued (2026 to 2029)" },
  { value: "12", label: "team league, superflex, TE premium" },
  { value: "Live", label: "movers updated daily" },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
      {/* Hero */}
      <section className="mb-16 flex flex-col gap-6">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Dah Dynasty League · 2026
        </span>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
          Your dynasty league,{" "}
          <span className="text-amber-600 dark:text-amber-400">decoded.</span>
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Live values, league-aware power rankings, and a trade analyzer that
          surfaces positional fit. Built on RosterAudit and Sleeper data.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={PRIMARY.href}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400"
          >
            Open dashboard
            <ArrowRight size={16} aria-hidden />
          </Link>
          <Link
            href="/dynasty/trade"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Build a trade
            <ArrowUpRight size={16} aria-hidden />
          </Link>
        </div>

        {/* Stat strip */}
        <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-zinc-200 py-6 sm:grid-cols-4 dark:border-zinc-800">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <dt className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                {s.value}
              </dt>
              <dd className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {s.label}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Cards */}
      <section className="flex flex-col gap-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Tools
        </h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {[PRIMARY, ...SECONDARY].map((c) => {
            const Icon = c.icon;
            return (
              <li key={c.href}>
                <Link
                  href={c.href}
                  className="group flex h-full flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 transition-colors hover:border-amber-300 hover:bg-amber-50/30 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-800 dark:hover:bg-amber-950/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-amber-100 p-2 text-amber-700 transition-colors group-hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:group-hover:bg-amber-900/60">
                      <Icon size={18} aria-hidden />
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight">
                      {c.title}
                    </h3>
                    <span
                      aria-hidden
                      className="ml-auto text-zinc-400 transition-transform group-hover:translate-x-0.5 dark:text-zinc-500"
                    >
                      →
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {c.blurb}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="mt-12 text-xs text-zinc-500 dark:text-zinc-400">
        Player values via{" "}
        <a
          href="https://rosteraudit.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-700 hover:underline dark:text-amber-400"
        >
          RosterAudit
        </a>
        . League data via Sleeper.
      </p>
    </main>
  );
}
