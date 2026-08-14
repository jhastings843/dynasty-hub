import "server-only";
import {
  applyTePremium,
  getFCValues,
  fcFormatFromProfile,
} from "@/lib/fantasycalc/client";
import type { FCValuesBySleeperId } from "@/lib/fantasycalc/types";
import { getValuesForLeague } from "@/lib/rosteraudit/client";
import type { RAValue, RAValuesBySleeperId } from "@/lib/rosteraudit/types";
import type { LeagueProfile } from "@/lib/league/types";
import type { SleeperLeague } from "@/lib/sleeper/types";

// Player values are format-specific, and the difference is not cosmetic.
// Comparing FantasyCalc's two sets for a 12-team half-PPR league, 87 of the
// 200 players present in both move 20 or more ranks: dynasty pays up for
// Kenyon Sadiq and Cam Ward, redraft pays up for Kelce and Kamara.
//
// RosterAudit only publishes dynasty values, so it serves dynasty leagues.
// Redraft and guillotine read FantasyCalc's redraft set instead.

export interface ValueSourceInfo {
  key: "rosteraudit" | "fantasycalc";
  label: string;
  url: string;
  /** Shown under the values so it's obvious which set is on screen. */
  note: string;
}

export const VALUE_SOURCES: Record<string, ValueSourceInfo> = {
  rosteraudit: {
    key: "rosteraudit",
    label: "RosterAudit",
    url: "https://rosteraudit.com",
    note: "Dynasty values: long-term asset worth, age-adjusted.",
  },
  fantasycalc: {
    key: "fantasycalc",
    label: "FantasyCalc",
    url: "https://fantasycalc.com",
    note: "Redraft values: this season only, no future seasons priced in.",
  },
};

export interface LeagueValues {
  values: RAValuesBySleeperId;
  source: ValueSourceInfo;
}

/** Which source a format reads from, without fetching anything. */
export function valueSourceFor(profile: LeagueProfile): ValueSourceInfo {
  return profile.type === "dynasty"
    ? VALUE_SOURCES.rosteraudit
    : VALUE_SOURCES.fantasycalc;
}

/** Values for a league, from whichever source matches its format. */
export async function getValuesForProfile(
  profile: LeagueProfile,
  league: SleeperLeague,
): Promise<LeagueValues> {
  if (profile.type === "dynasty") {
    return {
      values: await getValuesForLeague(league),
      source: VALUE_SOURCES.rosteraudit,
    };
  }

  const fmt = fcFormatFromProfile(profile);
  let fc = await getFCValues(fmt);
  if (profile.tePremium > 0) fc = applyTePremium(fc, profile.tePremium);

  return {
    values: adaptFCValues(fc),
    source: VALUE_SOURCES.fantasycalc,
  };
}

/**
 * Present FantasyCalc values in the shape the app already renders.
 *
 * The fields FantasyCalc has no equivalent for (age, tier, 7-day trend,
 * buy-low and sell-high flags) are left empty rather than guessed at. Age in
 * particular is a dynasty concern; pages that need it read it from the Sleeper
 * player record directly.
 */
function adaptFCValues(fc: FCValuesBySleeperId): RAValuesBySleeperId {
  const out: RAValuesBySleeperId = {};
  for (const [id, v] of Object.entries(fc)) {
    const adapted: RAValue = {
      sleeperId: v.sleeperId,
      name: v.name,
      position: v.position,
      team: v.team,
      age: null,
      tier: null,
      value: v.value,
      overallRank: v.overallRank,
      positionRank: v.positionRank,
      trend7Day: 0,
      trend30Day: v.trend30Day,
      buyLow: false,
      sellHigh: false,
      breakout: false,
      photoUrl: null,
    };
    out[id] = adapted;
  }
  return out;
}
