import { CALLS_BY_SLEEPER_ID, type JinglesCall } from "@/lib/jingles/data";

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
  value: number;
  overallRank: number;
  positionRank: number;
  jingles: JinglesCall | null;
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
  const byValue = [...players].sort((a, b) => b.value - a.value);
  if (byValue.length === 0) return [];

  const best = byValue[0].value || 1;

  const scored = byValue.slice(0, 60).map((p) => {
    const fillsNeed = wanted.has(p.position);
    // Value is the dominant term. Need is a tiebreak worth roughly a round,
    // not a reason to reach past a clearly better player.
    let score = p.value / best;
    if (fillsNeed) score += 0.08;
    if (p.jingles?.verdict === "target" || p.jingles?.verdict === "league_winner") {
      score += 0.04;
    }
    if (p.jingles?.verdict === "fade") score -= 0.04;
    return { p, score, fillsNeed };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s, i) => {
    const reasoning: string[] = [];
    reasoning.push(
      `Redraft value ${s.p.value.toLocaleString()}, #${s.p.overallRank} overall`,
    );
    reasoning.push(`${s.p.position}${s.p.positionRank} among all players`);

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
