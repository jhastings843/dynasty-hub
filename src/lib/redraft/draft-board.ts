import {
  CALLS_BY_SLEEPER_ID,
  LAB_300_BY_SLEEPER_ID,
  lab300Tier,
  type JinglesCall,
} from "@/lib/jingles/data";

// Redraft draft board.
//
// The dynasty board ranks rookies, because in dynasty the rookie draft is the
// only draft. A redraft draft is the entire player pool, and nothing about a
// player's age or long-term runway matters: the roster resets in January.
//
// So this ranks on this-season value, weighted by whether a pick fills a
// starting slot you have not filled yet. A bench player scores zero points.

/** Slots that do not start anyone. */
const NON_STARTING = new Set(["BN", "IR", "TAXI"]);

/** What a flex slot will accept. */
const FLEX_ELIGIBLE: Record<string, string[]> = {
  FLEX: ["RB", "WR", "TE"],
  WRRB_FLEX: ["RB", "WR"],
  REC_FLEX: ["WR", "TE"],
  SUPER_FLEX: ["QB", "RB", "WR", "TE"],
  IDP_FLEX: [],
};

export interface BoardPlayer {
  id: string;
  name: string;
  position: string;
  team: string | null;
  /** FantasyCalc redraft value. 0 for players it does not cover (DEF, K). */
  value: number;
  /** FantasyCalc overall rank. 0 when unvalued. */
  overallRank: number;
  positionRank: number;
  jingles: JinglesCall | null;
  /** His Lab 300 rank, when ranked. */
  labRank: number | null;
  /** His position rank, when ranked. Prefer this over FantasyCalc's when set. */
  labPositionRank: number | null;
  /** The draft round he expects, e.g. "3rd Round". */
  labTier: string | null;
}

/**
 * Board ordering. His Lab 300 leads where it covers a player: it is built for
 * half-PPR specifically, it is hand-tiered by expected draft round, and it
 * includes defenses and kickers that FantasyCalc omits entirely. Players he has
 * not ranked fall in behind, ordered by FantasyCalc value.
 */
export function boardRank(p: BoardPlayer): number {
  if (p.labRank !== null) return p.labRank;
  // Unranked players sort after the 300, best FantasyCalc value first.
  return 300 + (p.overallRank || 9999);
}

export function attachRankings(
  base: Omit<BoardPlayer, "jingles" | "labRank" | "labPositionRank" | "labTier">,
): BoardPlayer {
  const lab = LAB_300_BY_SLEEPER_ID[base.id] ?? null;
  return {
    ...base,
    jingles: CALLS_BY_SLEEPER_ID[base.id] ?? null,
    labRank: lab?.rank ?? null,
    labPositionRank: lab?.positionRank ?? null,
    labTier: lab300Tier(base.id),
  };
}

/**
 * Position rank to display. Showing his overall rank beside FantasyCalc's
 * position rank would mix two rankings in one line.
 */
export function displayPositionRank(p: BoardPlayer): number {
  return p.labPositionRank ?? p.positionRank;
}

export interface SlotNeed {
  slot: string;
  required: number;
  filled: number;
  /** Positions that can fill it. */
  eligible: string[];
}

export interface RedraftRecommendation {
  rank: number;
  player: BoardPlayer;
  /** Short line explaining the pick. */
  headline: string;
  reasoning: string[];
  fillsNeed: boolean;
}

/**
 * Starting slots a league requires, keyed by slot name. Flex slots are kept
 * separate from fixed ones because they are filled by whatever is left.
 */
export function startingSlots(rosterPositions: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const slot of rosterPositions) {
    if (NON_STARTING.has(slot)) continue;
    out[slot] = (out[slot] ?? 0) + 1;
  }
  return out;
}

/**
 * Which starting slots are still open, given the positions already drafted.
 *
 * Fixed slots are filled first by their own position, then flex slots take
 * whatever is left over. That ordering matters: two RBs and a fixed RB slot
 * should leave one RB available for the flex, not consume both.
 */
export function openSlots(
  rosterPositions: string[],
  draftedPositions: string[],
): SlotNeed[] {
  const slots = startingSlots(rosterPositions);
  const pool: Record<string, number> = {};
  for (const p of draftedPositions) pool[p] = (pool[p] ?? 0) + 1;

  const needs: SlotNeed[] = [];

  // Fixed slots first.
  for (const [slot, required] of Object.entries(slots)) {
    if (slot in FLEX_ELIGIBLE) continue;
    let filled = 0;
    for (let i = 0; i < required; i++) {
      if ((pool[slot] ?? 0) > 0) {
        pool[slot] -= 1;
        filled += 1;
      }
    }
    needs.push({ slot, required, filled, eligible: [slot] });
  }

  // Then flex, from whatever survived.
  for (const [slot, required] of Object.entries(slots)) {
    const eligible = FLEX_ELIGIBLE[slot];
    if (!eligible) continue;
    let filled = 0;
    for (let i = 0; i < required; i++) {
      const from = eligible.find((p) => (pool[p] ?? 0) > 0);
      if (from) {
        pool[from] -= 1;
        filled += 1;
      }
    }
    needs.push({ slot, required, filled, eligible });
  }

  return needs;
}

/** Positions that would fill an open starting slot right now. */
export function neededPositions(needs: SlotNeed[]): Set<string> {
  const out = new Set<string>();
  for (const n of needs) {
    if (n.filled >= n.required) continue;
    for (const p of n.eligible) out.add(p);
  }
  return out;
}

export function buildBoard(
  players: BoardPlayer[],
  needs: SlotNeed[],
  limit = 5,
): RedraftRecommendation[] {
  const wanted = neededPositions(needs);
  const ordered = [...players].sort((a, b) => boardRank(a) - boardRank(b));
  if (ordered.length === 0) return [];

  const scored = ordered.slice(0, 60).map((p) => {
    const fillsNeed = wanted.has(p.position);
    // Rank dominates. One rank is worth 1/400, so the bonuses below are sized
    // in picks deliberately: filling a starting slot is worth about a round
    // (12 picks), an individual call about a third of a round. Anything larger
    // would let a bonus leapfrog players he has ranked well above.
    const PICK = 1 / 400;
    let score = 1 - boardRank(p) * PICK;
    if (fillsNeed) score += 12 * PICK;
    if (p.jingles?.verdict === "target" || p.jingles?.verdict === "league_winner") {
      score += 4 * PICK;
    }
    if (p.jingles?.verdict === "fade") score -= 8 * PICK;
    return { p, score, fillsNeed };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s, i) => {
    const reasoning: string[] = [];
    if (s.p.labRank !== null) {
      reasoning.push(
        `Lab 300 #${s.p.labRank}${s.p.labTier ? `, his ${s.p.labTier} tier` : ""}`,
      );
    }
    if (s.p.value > 0) {
      reasoning.push(
        `FantasyCalc value ${s.p.value.toLocaleString()}, #${s.p.overallRank} overall`,
      );
    }
    // Where the two sources disagree by more than a couple of rounds, that gap
    // is itself the signal.
    if (s.p.labRank !== null && s.p.overallRank > 0) {
      const gap = s.p.overallRank - s.p.labRank;
      if (Math.abs(gap) >= 24) {
        reasoning.push(
          gap > 0
            ? `He is ${gap} spots higher on him than FantasyCalc`
            : `He is ${-gap} spots lower on him than FantasyCalc`,
        );
      }
    }

    if (s.fillsNeed) {
      const slot = needs.find(
        (n) => n.filled < n.required && n.eligible.includes(s.p.position),
      );
      reasoning.push(
        slot
          ? `Fills an open ${slot.slot} slot (${slot.filled} of ${slot.required} filled)`
          : "Fills an open starting slot",
      );
    } else {
      reasoning.push("Bench depth: every starting slot at this position is filled");
    }

    if (s.p.jingles) {
      const j = s.p.jingles;
      const label =
        j.verdict === "fade"
          ? "Jingles fade"
          : j.verdict === "league_winner"
            ? "Jingles league winner"
            : "Jingles target";
      reasoning.push(
        j.adp ? `${label}: ADP ${j.adp}, his rank ${j.jinglesRank}` : `${label}`,
      );
    }

    const headline = s.fillsNeed
      ? `Fills your ${s.p.position} need`
      : `Best available (${s.p.position})`;

    return {
      rank: i + 1,
      player: s.p,
      headline,
      reasoning,
      fillsNeed: s.fillsNeed,
    };
  });
}

/** Attach Jingles' call to a player, when he has one. */
export function withJingles(id: string): JinglesCall | null {
  return CALLS_BY_SLEEPER_ID[id] ?? null;
}

// --- Your picks ---
//
// Sleeper knows the draft order before the draft starts, so the board can say
// where you are in it and, if the room drafts to the ranking, who is likely to
// be sitting there when you are up.

export interface UpcomingPick {
  round: number;
  /** Overall pick number, 1-based. */
  pickNo: number;
  /** Position within the round, which flips each round in a snake. */
  slotInRound: number;
  /** "1.11" */
  label: string;
}

/**
 * Every pick belonging to one draft slot.
 *
 * Snake drafts reverse each round. Sleeper's `reversal_round` setting (third
 * round reversal and friends) delays the flip: from that round on, the order
 * repeats the previous round instead of alternating, so parity inverts.
 */
export function picksForSlot(
  slot: number,
  teams: number,
  rounds: number,
  type: string | null | undefined,
  reversalRound = 0,
): UpcomingPick[] {
  if (!slot || slot < 1 || teams < 1 || rounds < 1) return [];

  const out: UpcomingPick[] = [];
  for (let round = 1; round <= rounds; round++) {
    let slotInRound = slot;
    if (type === "snake") {
      const flipped = reversalRound > 0 && round >= reversalRound;
      const reversed = round % 2 === 0 ? !flipped : flipped;
      if (reversed) slotInRound = teams - slot + 1;
    }
    const pickNo = (round - 1) * teams + slotInRound;
    out.push({
      round,
      pickNo,
      slotInRound,
      label: `${round}.${slotInRound.toString().padStart(2, "0")}`,
    });
  }
  return out;
}

export interface PickProjection {
  pick: UpcomingPick;
  /** Best available at that pick if every pick before it goes to the board. */
  projected: BoardPlayer[];
  /** True when the board runs out of ranked players before this pick. */
  beyondBoard: boolean;
}

/**
 * Who is left at each of your picks if the room drafts straight down the
 * ranking. That is a deliberately dumb model: it assumes no reaches, no runs,
 * and no one else's roster needs. It is still the useful question the night
 * before a draft, as long as the page says out loud that it is chalk.
 *
 * `nextPickNo` is the next pick the room will make overall, so a live draft
 * projects from where it actually is rather than from the top of the board.
 */
export function projectPicks(
  pool: BoardPlayer[],
  picks: UpcomingPick[],
  nextPickNo: number,
  depth = 3,
): PickProjection[] {
  const ordered = [...pool].sort((a, b) => boardRank(a) - boardRank(b));

  return picks.map((pick) => {
    const gone = Math.max(0, pick.pickNo - nextPickNo);
    return {
      pick,
      projected: ordered.slice(gone, gone + depth),
      beyondBoard: gone >= ordered.length,
    };
  });
}
