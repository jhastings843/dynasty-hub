import { notFound } from "next/navigation";
import { LeagueSwitcher } from "@/components/LeagueSwitcher";
import { NavLink } from "@/components/NavLink";
import { getMyLeagues, resolveLeague } from "@/lib/league/discover";
import { leaguePath, toolsFor } from "@/lib/league/tools";
import type { LeagueProfile } from "@/lib/league/types";

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
        </div>
      </div>
      {children}
    </>
  );
}
