// Logic for the season plan page. Pure functions; safe for client and
// server.

import type { RATeamGrade } from "@/lib/rosteraudit/types";

// ---------------------------------------------------------------
// Trajectory: where this team is in its dynasty cycle.
// ---------------------------------------------------------------

export type Trajectory =
  | "contender"
  | "compete"
  | "reload"
  | "transition"
  | "rebuild";

const TRAJECTORY_LABEL: Record<Trajectory, string> = {
  contender: "Championship contender",
  compete: "Compete window",
  reload: "Rising / reload",
  transition: "Transitioning",
  rebuild: "Rebuild",
};

const TRAJECTORY_BLURB: Record<Trajectory, string> = {
  contender:
    "Top-tier roster ready to win now. Be aggressive on win-now trades; don't horde picks.",
  compete:
    "Solid roster competing for the title window. Patch weak spots without selling future capital.",
  reload:
    "Strong dynasty value with youth on your side. Time is on your side; resist selling young assets cheap.",
  transition:
    "Mixed roster mid-cycle. Decide direction by trade deadline: go for it or pivot toward youth.",
  rebuild:
    "Stockpile picks and youth; sell aging veterans for future capital.",
};

export function trajectoryLabel(t: Trajectory): string {
  return TRAJECTORY_LABEL[t];
}

export function trajectoryBlurb(t: Trajectory): string {
  return TRAJECTORY_BLURB[t];
}

const GRADE_RANK: Record<string, number> = {
  "A+": 12,
  A: 11,
  "A-": 10,
  "B+": 9,
  B: 8,
  "B-": 7,
  "C+": 6,
  C: 5,
  "C-": 4,
  "D+": 3,
  D: 2,
  "D-": 1,
  F: 0,
};

export function gradeScore(g: string): number {
  return GRADE_RANK[g] ?? 5;
}

export function inferTrajectory(grade: RATeamGrade | null): Trajectory {
  if (!grade) return "transition";
  const dyn = gradeScore(grade.dynastyGrade);
  const con = gradeScore(grade.contenderGrade);
  const age = grade.avgStarterAge || 26;

  if (dyn >= 10 && con >= 9 && age >= 25.5) return "contender";
  if (dyn >= 9 && con >= 8) return "compete";
  if (dyn >= 9 && age < 25) return "reload";
  if (dyn >= 8) return "compete";
  if (dyn >= 6) return "transition";
  return "rebuild";
}

// ---------------------------------------------------------------
// Phase: where we are in the dynasty year.
// ---------------------------------------------------------------

export interface SeasonPhase {
  key:
    | "rookie_draft"
    | "off_season"
    | "preseason"
    | "early_season"
    | "mid_season"
    | "trade_deadline"
    | "playoffs"
    | "championship_week"
    | "post_season";
  label: string;
  blurb: string;
}

export function currentPhase(now: Date, draftStart?: Date | null): SeasonPhase {
  const month = now.getMonth(); // 0=Jan
  const day = now.getDate();

  // If a draft start is in the next 14 days, we're in rookie draft window.
  if (draftStart) {
    const ms = draftStart.getTime() - now.getTime();
    if (ms > -3 * 24 * 60 * 60 * 1000 && ms < 14 * 24 * 60 * 60 * 1000) {
      return {
        key: "rookie_draft",
        label: "Rookie draft window",
        blurb:
          "Land starting-caliber youth to attack your weakest positions. Don't reach for need over value.",
      };
    }
  }

  // Apr 1 - May 31 (without active draft) → off-season pre-rookie
  if (month === 3 || month === 4) {
    return {
      key: "off_season",
      label: "Post-NFL draft window",
      blurb:
        "Buy-low on rookies you missed; sell-high on hyped sophomores. Rookie draft prep is the priority.",
    };
  }

  // June - August → off-season
  if (month >= 5 && month <= 7) {
    return {
      key: "preseason",
      label: "Pre-season",
      blurb:
        "Lineup tweaks, ADP-aware moves, and identify breakout candidates before they spike.",
    };
  }

  // September → early season
  if (month === 8) {
    return {
      key: "early_season",
      label: "Early season",
      blurb:
        "Don't overreact to one or two weeks. Buy low on early disappointments with talent.",
    };
  }

  // October-November → mid season
  if (month === 9 || (month === 10 && day < 11)) {
    return {
      key: "mid_season",
      label: "Mid season",
      blurb:
        "Sample size is meaningful. Make moves before the deadline; identify your real contenders.",
    };
  }

  // Mid-November (typical trade deadline)
  if (month === 10 && day >= 11) {
    return {
      key: "trade_deadline",
      label: "Trade deadline",
      blurb:
        "Last chance to reshape this season. Compete: pay up. Rebuild: dump vets for picks.",
    };
  }

  // December → playoffs
  if (month === 11 && day < 22) {
    return {
      key: "playoffs",
      label: "Fantasy playoffs",
      blurb: "Win-now mode. Stream defenses, monitor injuries, ride hot hands.",
    };
  }

  if (month === 11) {
    return {
      key: "championship_week",
      label: "Championship week",
      blurb: "Weeks 16-17. Lift the trophy.",
    };
  }

  // Jan-Mar → post-season planning
  return {
    key: "post_season",
    label: "Off-season planning",
    blurb:
      "Recap, plan rookie draft, identify trade targets to address weaknesses.",
  };
}

// ---------------------------------------------------------------
// Key dates for the dynasty year.
// ---------------------------------------------------------------

export interface KeyDate {
  label: string;
  date: Date;
  blurb?: string;
}

export function keyDates(season: number, draftStart?: Date | null): KeyDate[] {
  const dates: KeyDate[] = [];
  if (draftStart) {
    dates.push({
      label: "Rookie draft",
      date: draftStart,
      blurb: "Tonight's main event",
    });
  }
  dates.push({
    label: "NFL season opens",
    date: new Date(season, 8, 4), // approx Sep 4
    blurb: "Roster locks for week 1",
  });
  dates.push({
    label: "Trade deadline",
    date: new Date(season, 10, 11), // approx Nov 11 (week 11)
    blurb: "Last chance to reshape",
  });
  dates.push({
    label: "Fantasy playoffs",
    date: new Date(season, 11, 7), // approx Dec 7 (week 14 start)
  });
  dates.push({
    label: "Championship week",
    date: new Date(season, 11, 21), // approx Dec 21 (week 16)
  });
  dates.push({
    label: `${season + 1} rookie draft window`,
    date: new Date(season + 1, 3, 25), // April 25 next year
    blurb: "Plan rookie draft prep through off-season",
  });
  return dates;
}
