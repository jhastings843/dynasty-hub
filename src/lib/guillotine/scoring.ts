// Score a projection under the league's own scoring settings.
//
// Sleeper's projection feed hands back component stats (rec, rush_yd, pass_td,
// bonus_rec_rb, ...) alongside three precomputed totals: pts_std, pts_half_ppr
// and pts_ppr. Reaching for one of those totals is the tempting shortcut and
// it is wrong here in two directions at once: Dah Chopped is full PPR but pays
// 4 per passing touchdown, so pts_ppr overvalues every quarterback in the pool
// by two points a score, and no precomputed total exists for a league with
// bonuses.
//
// The stat keys and the scoring-setting keys are the same vocabulary, so the
// honest version is a dot product over the keys the league actually pays. That
// makes TE premium, first-down bonuses and yardage bonuses fall out for free
// rather than each needing a special case.

/** A Sleeper projection or stat line: component stat keys to values. */
export type StatLine = Record<string, number>;

/** A league's scoring settings: the same keys, mapped to points paid. */
export type ScoringSettings = Record<string, number>;

/**
 * Keys that appear in a projection line but describe the projection rather
 * than the performance. None of them are scoring keys, so they would normally
 * multiply by nothing, but a league that happens to pay a key of the same name
 * would otherwise score average draft position as if it were production.
 */
const NOT_PRODUCTION = new Set([
  "gp",
  "adp_dd_ppr",
  "pos_adp_dd_ppr",
  "pts_std",
  "pts_half_ppr",
  "pts_ppr",
]);

/**
 * Points this stat line is worth under these scoring settings.
 *
 * Missing on either side contributes nothing: a league that does not pay for
 * first downs ignores rec_fd, and a player with no passing attempts ignores
 * pass_yd.
 */
export function scoreStatLine(stats: StatLine, scoring: ScoringSettings): number {
  let total = 0;
  for (const [key, value] of Object.entries(stats)) {
    if (NOT_PRODUCTION.has(key)) continue;
    const points = scoring[key];
    if (typeof points !== "number" || typeof value !== "number") continue;
    total += value * points;
  }
  return total;
}

/**
 * How far this league's scoring pulls away from the half-PPR assumption the
 * Lab 300 is built on, expressed as human-readable notes rather than a number.
 *
 * Exists because a ranking list quoted at the wrong scoring is not slightly
 * off, it is systematically off in a direction you can name: full PPR lifts
 * pass-catching backs and slot receivers, and a 4-point passing touchdown
 * flattens the quarterback position.
 */
export function scoringSkewNotes(
  scoring: ScoringSettings,
  /**
   * The scoring of the list actually being quoted.
   *
   * Half PPR was the only possible answer until 2026-09-05, when he published
   * full PPR and standard as well. Once a league is reading his matching list
   * there is no receiving skew left to warn about, and the warning became worse
   * than useless: Dah Chopped was told "full PPR against a half-PPR list" on the
   * same screen as "ranked on his full ppr list, which matches this league's
   * scoring". Two sentences, one of them wrong, and no way for Jack to know
   * which.
   *
   * Defaults to half PPR so a caller that has not been told keeps the old
   * behaviour rather than silently dropping a true warning.
   */
  listScoring: string = "half_ppr",
): string[] {
  const notes: string[] = [];

  const rec = scoring.rec ?? 0;
  const leagueScoring = rec >= 1 ? "full_ppr" : rec === 0 ? "standard" : "half_ppr";
  // A list whose scoring could not be read is not a match for anything, so the
  // warning stays. Unknown is a reason to be careful, not a reason to go quiet.
  const say = (s: string) =>
    s === "full_ppr" ? "full-PPR" : s === "standard" ? "standard" : "half-PPR";

  // Only when the two actually differ. The direction is named rather than
  // implied: a list read at the wrong scoring is not vaguely off, it is off in
  // a way you can act on.
  if (leagueScoring !== listScoring) {
    if (leagueScoring === "full_ppr") {
      notes.push(
        `Full PPR against a ${say(listScoring)} list: receiving backs and slot receivers are worth more here than their rank says.`,
      );
    } else if (leagueScoring === "standard") {
      notes.push(
        `Standard scoring against a ${say(listScoring)} list: high-volume receivers are worth less here than their rank says.`,
      );
    } else {
      notes.push(
        `Half PPR against a ${say(listScoring)} list: ${
          listScoring === "full_ppr"
            ? "pass-catching backs and slot receivers are worth slightly less here than their rank says."
            : "receivers are worth more here than their rank says."
        }`,
      );
    }
  }

  const passTd = scoring.pass_td ?? 6;
  if (passTd <= 4) {
    notes.push(
      `${passTd} points per passing touchdown flattens the quarterback position: the gap between QB1 and QB12 is smaller here than in a 6-point league.`,
    );
  }

  const bonuses = Object.entries(scoring).filter(
    ([k, v]) => k.startsWith("bonus") && v !== 0,
  );
  if (bonuses.length > 0) {
    notes.push(
      `League pays ${bonuses.length} scoring ${bonuses.length === 1 ? "bonus" : "bonuses"} no ranking list accounts for.`,
    );
  }

  return notes;
}
