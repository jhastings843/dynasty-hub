import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Calendar,
  Compass,
  Layers,
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
  { value: "523+", label: "Ranked dynasty players", icon: BarChart3 },
  { value: "60", label: "Rookie picks valued", icon: Layers },
  { value: "12", label: "Team superflex league", icon: Trophy },
  { value: "Live", label: "Movers updated daily", icon: Calendar },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
      {/* Hero */}
      <section className="relative mb-16 flex flex-col gap-6">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800 shadow-sm shadow-amber-500/5 backdrop-blur dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
          Dah Dynasty League · 2026
        </span>
        <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          <span className="block text-zinc-900 dark:text-zinc-50">
            Your dynasty league,
          </span>
          <span className="block bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text pb-1 text-transparent">
            decoded.
          </span>
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Live values, league-aware power rankings, and a trade analyzer that
          surfaces positional fit. Built on RosterAudit and Sleeper data.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={PRIMARY.href}
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:shadow-amber-500/40 hover:brightness-110"
          >
            Open dashboard
            <ArrowRight
              size={16}
              aria-hidden
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/dynasty/trade"
            className="group inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white/70 px-5 py-3 text-sm font-bold text-zinc-900 backdrop-blur transition-all hover:bg-white hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Build a trade
            <ArrowUpRight
              size={16}
              aria-hidden
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>

        {/* Stat cards */}
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="flex flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-white/70 p-4 shadow-sm backdrop-blur transition-shadow hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-900/70"
              >
                <div className="flex items-center gap-1.5">
                  <Icon
                    size={12}
                    className="text-amber-600 dark:text-amber-400"
                    aria-hidden
                  />
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {s.label}
                  </dt>
                </div>
                <dd className="text-3xl font-bold tracking-tight tabular-nums">
                  {s.value}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      {/* Cards */}
      <section className="flex flex-col gap-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Tools
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {1 + SECONDARY.length} sections
          </span>
        </div>
        <ul className="grid gap-4 md:grid-cols-2">
          {[PRIMARY, ...SECONDARY].map((c) => {
            const Icon = c.icon;
            return (
              <li key={c.href}>
                <Link
                  href={c.href}
                  className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 p-6 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/10 dark:border-zinc-800/80 dark:bg-zinc-900/80 dark:hover:border-amber-800 dark:hover:shadow-amber-500/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 p-2 text-amber-700 transition-all group-hover:from-amber-200 group-hover:to-amber-300 dark:from-amber-950/50 dark:to-amber-900/30 dark:text-amber-300 dark:group-hover:from-amber-900/60">
                      <Icon size={18} aria-hidden />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight">
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
    </main>
  );
}
