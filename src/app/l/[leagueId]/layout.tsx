import Link from "next/link";
import { notFound } from "next/navigation";
import { LeagueSwitcher } from "@/components/LeagueSwitcher";
import { LeagueTypeProvider } from "@/components/LeagueTypeProvider";
import { NavLink } from "@/components/NavLink";
import { getMyLeagues, resolveLeague } from "@/lib/league/discover";
import { leaguePath, toolsFor } from "@/lib/league/tools";
import { valueSourceFor } from "@/lib/values";
import { LEAGUE_TYPE_LABEL, type LeagueProfile } from "@/lib/league/types";

function ManualLeagueNotice({ name }: { name: string }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
        <p className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          This league is declared manually, so there is no live roster, scoring,
          or waiver data behind it. The tools here need a connected league to
          compute anything. The written playbook for this format is on the{" "}
          <Link
            href="/strategy"
            className="font-medium text-amber-700 hover:underline dark:text-amber-400"
          >
            strategy page
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;

  const league = await resolveLeague(leagueId);
  if (!league) notFound();

  // The switcher is a convenience. If discovery fails (Sleeper down, username
  // unset) the league itself still resolved, so render the page with a
  // single-league switcher rather than failing the whole route.
  let leagues: LeagueProfile[] = [league];
  try {
    const discovered = await getMyLeagues(league.season);
    if (discovered.some((l) => l.id === league.id)) leagues = discovered;
    else leagues = [league, ...discovered];
  } catch {
    // keep the fallback
  }

  const tools = toolsFor(league.type);
  const valueSource = valueSourceFor(league);

  return (
    <>
      <div className="border-b border-zinc-200/60 bg-white/50 backdrop-blur dark:border-zinc-800/60 dark:bg-zinc-950/50">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6 lg:px-8">
          <LeagueSwitcher leagues={leagues} current={league} />
          <div className="-mx-1 flex flex-wrap items-center gap-x-1 gap-y-1 sm:mx-0">
            {tools.map((t) => (
              <NavLink
                key={t.key}
                href={leaguePath(league.id, t.segment)}
                label={t.label}
                exact={t.segment === ""}
              />
            ))}
          </div>
          {/* Dynasty and redraft values are genuinely different sets, so name
              which one is on screen rather than leaving it implied. */}
          <span
            title={valueSource.note}
            className="text-xs text-zinc-500 sm:ml-auto dark:text-zinc-400"
          >
            {LEAGUE_TYPE_LABEL[league.type]} values via{" "}
            <a
              href={valueSource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-amber-700 hover:underline dark:text-amber-400"
            >
              {valueSource.label}
            </a>
          </span>
        </div>
      </div>
      {league.source === "manual" ? (
        <ManualLeagueNotice name={league.name} />
      ) : (
        <LeagueTypeProvider type={league.type}>{children}</LeagueTypeProvider>
      )}
    </>
  );
}
