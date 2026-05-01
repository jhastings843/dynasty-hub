import Link from "next/link";
import { Calendar, CheckCircle2, Circle, Compass, Target } from "lucide-react";
import {
  formatKeyFromLeague,
  getRosterGrades,
  getValues,
} from "@/lib/rosteraudit/client";
import type { RAGradesByRosterId } from "@/lib/rosteraudit/types";
import {
  getAllPlayers,
  getLeague,
  getLeagueDrafts,
  getLeagueRosters,
  getLeagueUsers,
  getUser,
} from "@/lib/sleeper/client";
import { computeTeamSummaries } from "@/lib/dynasty/power-rankings";
import {
  buildAutoGoals,
  currentPhase,
  inferTrajectory,
  keyDates,
  trajectoryBlurb,
  trajectoryLabel,
  type AutoGoal,
  type Trajectory,
} from "@/lib/dynasty/season-plan";
import { CustomGoals } from "./CustomGoals";

export const dynamic = "force-dynamic";

const POSITIONS = ["QB", "RB", "WR", "TE"] as const;

const TRAJECTORY_TINT: Record<Trajectory, string> = {
  contender:
    "bg-amber-500 text-white dark:bg-amber-500",
  compete:
    "bg-emerald-500 text-white dark:bg-emerald-500",
  reload:
    "bg-sky-500 text-white dark:bg-sky-500",
  transition:
    "bg-zinc-500 text-white dark:bg-zinc-500",
  rebuild:
    "bg-rose-500 text-white dark:bg-rose-500",
};

const CATEGORY_LABEL: Record<string, string> = {
  roster: "Roster",
  trade: "Trade",
  draft: "Draft",
  standings: "Standings",
  other: "Other",
};

function GoalRow({ g }: { g: AutoGoal }) {
  const Icon = g.status === "done" ? CheckCircle2 : Circle;
  const iconCls =
    g.status === "done"
      ? "text-emerald-600 dark:text-emerald-400"
      : g.status === "in_progress"
        ? "text-amber-600 dark:text-amber-400"
        : "text-zinc-400 dark:text-zinc-600";
  return (
    <li className="flex items-start gap-3 py-3">
      <Icon size={18} className={`mt-0.5 shrink-0 ${iconCls}`} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={`text-sm ${
            g.status === "done"
              ? "text-zinc-500 line-through dark:text-zinc-500"
              : "text-zinc-900 dark:text-zinc-50"
          }`}
        >
          {g.text}
        </span>
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-semibold uppercase tracking-wider">
            {CATEGORY_LABEL[g.category] ?? g.category}
          </span>
          {g.current && <span>· current: {g.current}</span>}
          {g.target && <span>· target: {g.target}</span>}
        </div>
      </div>
    </li>
  );
}

function ConfigError({ message }: { message: string }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex max-w-2xl flex-col gap-3">
        <Link
          href="/dynasty"
          className="text-sm text-zinc-500 dark:text-zinc-400"
        >
          ‹ Dynasty
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Season plan</h1>
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-300">
          {message}
        </p>
      </div>
    </main>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function SeasonPlanPage() {
  const username = process.env.SLEEPER_USERNAME;
  const leagueId = process.env.SLEEPER_LEAGUE_ID;
  if (!username) {
    return <ConfigError message="Missing SLEEPER_USERNAME in .env.local" />;
  }
  if (!leagueId) {
    return <ConfigError message="Missing SLEEPER_LEAGUE_ID in .env.local" />;
  }

  const me = await getUser(username);
  const league = await getLeague(leagueId);
  const raFormat = formatKeyFromLeague(league);

  const [drafts, rosters, users, players, fcValues, grades] =
    await Promise.all([
      getLeagueDrafts(leagueId),
      getLeagueRosters(leagueId),
      getLeagueUsers(leagueId),
      getAllPlayers(),
      getValues(raFormat),
      getRosterGrades(leagueId, me.user_id).catch(
        (): RAGradesByRosterId => ({}),
      ),
    ]);

  const myRoster = rosters.find((r) => r.owner_id === me.user_id);
  if (!myRoster) {
    return (
      <ConfigError message={`No roster found for ${username} in this league.`} />
    );
  }

  const teams = computeTeamSummaries(rosters, users, players, fcValues);
  const myTeam = teams.find((t) => t.rosterId === myRoster.roster_id);
  if (!myTeam) {
    return (
      <ConfigError message="Could not compute your team summary." />
    );
  }

  const grade = grades[myRoster.roster_id] ?? null;
  const trajectory = inferTrajectory(grade);

  const draft = drafts[0] ?? null;
  const draftStart = draft?.start_time ? new Date(draft.start_time) : null;
  const draftSlot = draft?.draft_order?.[me.user_id] ?? null;

  const phase = currentPhase(new Date(), draftStart);

  // Sort positions by league-relative rank (higher rank number = weaker)
  // rather than raw roster value, so what surfaces matches how power
  // rankings work elsewhere on the site.
  const sortedByRank = [...POSITIONS].sort(
    (a, b) =>
      (myTeam.positionRanks[b] ?? 99) - (myTeam.positionRanks[a] ?? 99),
  );
  const weakestPositions = sortedByRank.slice(0, 2);
  const strongestPositions = sortedByRank.slice(-2).reverse();

  const autoGoals = buildAutoGoals({
    myTeam,
    totalTeams: rosters.length,
    grade,
    trajectory,
    draftSlot,
    draftRounds: draft?.settings?.rounds ?? 0,
    weakestPositions,
    strongestPositions,
  });

  const season = Number(league.season ?? new Date().getFullYear());
  const dates = keyDates(season, draftStart);
  const now = new Date();

  const myStandingRank =
    [...teams].sort((a, b) => b.totalValue - a.totalValue).findIndex(
      (t) => t.rosterId === myTeam.rosterId,
    ) + 1;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Link
            href="/dynasty"
            className="text-sm text-zinc-500 dark:text-zinc-400"
          >
            ‹ Dynasty
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Season plan
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {league.name} · {league.season} · {rosters.length}-team superflex
            with TE premium
          </p>
        </div>

        {/* Trajectory + phase hero */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <Compass
                size={18}
                className="shrink-0 text-zinc-500 dark:text-zinc-400"
                aria-hidden
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Team trajectory
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span
                className={`rounded-lg px-3 py-1.5 text-sm font-bold uppercase tracking-wide ${TRAJECTORY_TINT[trajectory]}`}
              >
                {trajectoryLabel(trajectory)}
              </span>
              {grade && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Dynasty {grade.dynastyGrade} · Contender{" "}
                  {grade.contenderGrade} · age{" "}
                  {grade.avgStarterAge.toFixed(1)}
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {trajectoryBlurb(trajectory)}
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <Calendar
                size={18}
                className="shrink-0 text-zinc-500 dark:text-zinc-400"
                aria-hidden
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Current phase
              </span>
            </div>
            <span className="rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 self-start">
              {phase.label}
            </span>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {phase.blurb}
            </p>
          </div>
        </div>

        {/* Live progress */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Live progress</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="flex flex-col gap-0.5 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Team value
              </span>
              <span className="text-2xl font-semibold tabular-nums">
                {myTeam.totalValue.toLocaleString()}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                rank #{myStandingRank} of {rosters.length}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Dynasty rank
              </span>
              <span className="text-2xl font-semibold tabular-nums">
                {grade ? `#${grade.dynastyRank}` : "—"}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {grade ? grade.dynastyGrade : "via RosterAudit"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Weakest spot
              </span>
              <span className="text-2xl font-semibold">
                {weakestPositions[0]}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                #{myTeam.positionRanks[weakestPositions[0]] ?? "—"} of {rosters.length}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Strongest spot
              </span>
              <span className="text-2xl font-semibold">
                {strongestPositions[0]}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                #{myTeam.positionRanks[strongestPositions[0]] ?? "—"} of {rosters.length}
              </span>
            </div>
          </div>
        </section>

        {/* Auto goals */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Target
              size={18}
              className="text-zinc-500 dark:text-zinc-400"
              aria-hidden
            />
            <h2 className="text-xl font-semibold tracking-tight">
              Auto goals
            </h2>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
            <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
              {autoGoals.map((g) => (
                <GoalRow key={g.id} g={g} />
              ))}
            </ul>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Auto goals derive from your trajectory + RosterAudit data and
            update every page load.
          </p>
        </section>

        {/* Custom goals */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Custom goals</h2>
          <CustomGoals />
        </section>

        {/* Key dates */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Key dates</h2>
          <ol className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {dates
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .map((d) => {
                const past = d.date.getTime() < now.getTime();
                return (
                  <li
                    key={d.label}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      past ? "opacity-60" : ""
                    }`}
                  >
                    <span className="w-44 shrink-0 text-xs font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
                      {formatDate(d.date)}
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium">{d.label}</span>
                      {d.blurb && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {d.blurb}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
          </ol>
        </section>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
      </div>
    </main>
  );
}
