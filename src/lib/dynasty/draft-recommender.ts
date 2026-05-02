// Pure logic for ranking the next pick. Composite score across value,
// positional fit, age, surplus vs your next pick, and RA flags.

export interface RookieCandidate {
  id: string;
  name: string;
  position: string | null;
  team: string | null;
  age: number | null;
  value: number;
  rank: number; // global RA rank
  positionRank: number;
  photoUrl: string | null;
  buyLow?: boolean;
  sellHigh?: boolean;
  breakout?: boolean;
}

export interface Recommendation {
  rank: number; // 1, 2, 3
  player: RookieCandidate;
  score: number;
  surplus: number; // value - pick value
  isFit: boolean;
  headline: string;
  reasoning: string[];
}

const TIER_LABELS: Record<number, string> = {
  1: "Tier 1 (elite)",
  2: "Tier 2 (high-end starter)",
  3: "Tier 3 (starter)",
  4: "Tier 4 (depth/upside)",
  5: "Tier 5 (lottery)",
};

function rookiePosRank(c: RookieCandidate, allRookies: RookieCandidate[]): number {
  if (!c.position) return 0;
  const samePos = allRookies
    .filter((r) => r.position === c.position && r.value > 0)
    .sort((a, b) => b.value - a.value);
  return samePos.findIndex((r) => r.id === c.id) + 1;
}

export function buildRecommendations({
  rookies,
  nextPickValue,
  nextPickLabel,
  weakestPositions,
  limit = 3,
}: {
  rookies: RookieCandidate[];
  nextPickValue: number | null;
  nextPickLabel: string | null;
  weakestPositions: string[];
  limit?: number;
}): Recommendation[] {
  if (rookies.length === 0) return [];

  const candidates = rookies.filter((r) => r.value > 0);
  const sortedByValue = [...candidates].sort((a, b) => b.value - a.value);

  const scored = candidates.map((c) => {
    const isFit = !!c.position && weakestPositions.includes(c.position);
    const surplus = nextPickValue ? c.value - nextPickValue : 0;

    let score = 0;
    score += c.value / 100;
    if (surplus > 0) score += Math.min(surplus / 30, 50);
    if (isFit) score += 25;
    if (c.age != null) {
      if (c.age <= 21) score += 12;
      else if (c.age <= 22) score += 8;
      else if (c.age >= 24) score -= 4;
    }
    if (c.buyLow) score += 10;
    if (c.breakout) score += 15;
    if (c.sellHigh) score -= 6;

    // Penalty if extremely above pick value (unrealistic — they'll be gone)
    if (surplus > (nextPickValue ?? 0) * 1.5) score -= 20;

    return { c, score, surplus, isFit };
  });

  const top = [...scored].sort((a, b) => b.score - a.score).slice(0, limit);

  return top.map((entry, idx) => {
    const { c, score, surplus, isFit } = entry;
    const reasoning: string[] = [];

    // Value + rank
    const overallRookieIdx =
      sortedByValue.findIndex((r) => r.id === c.id) + 1;
    reasoning.push(
      `RA value ${c.value.toLocaleString()} (rookie #${overallRookieIdx} of ${sortedByValue.length} available)`,
    );

    // Position rank within rookies
    if (c.position) {
      const posIdx = rookiePosRank(c, candidates);
      reasoning.push(
        `${c.position}${posIdx} among available rookies`,
      );
    }

    // Surplus vs next pick
    if (nextPickValue && nextPickLabel) {
      if (surplus >= 200) {
        reasoning.push(
          `Steal: +${surplus.toLocaleString()} surplus vs your ${nextPickLabel} pick (value ${nextPickValue.toLocaleString()})`,
        );
      } else if (surplus >= -200) {
        reasoning.push(
          `Fair value at ${nextPickLabel} (player ${c.value.toLocaleString()} vs pick ${nextPickValue.toLocaleString()})`,
        );
      } else {
        reasoning.push(
          `Reach: ${surplus.toLocaleString()} below ${nextPickLabel} pick value`,
        );
      }
    }

    // Position fit
    if (isFit && c.position) {
      reasoning.push(
        `Fills your weakest position (${c.position})`,
      );
    } else if (
      c.position &&
      weakestPositions.length > 0 &&
      !weakestPositions.includes(c.position)
    ) {
      reasoning.push(
        `Best player available, not at your top need (${weakestPositions.join("/")})`,
      );
    }

    // Age
    if (c.age != null) {
      if (c.age <= 21) {
        reasoning.push(`Age ${c.age}, max dynasty runway`);
      } else if (c.age <= 22) {
        reasoning.push(`Age ${c.age}, multi-year asset`);
      } else if (c.age >= 24) {
        reasoning.push(`Age ${c.age}, slightly older for a rookie`);
      }
    }

    // RA flags
    if (c.buyLow) reasoning.push("RosterAudit tagged Buy Low");
    if (c.breakout) reasoning.push("RosterAudit tagged Breakout candidate");
    if (c.sellHigh) reasoning.push("RosterAudit tagged Sell High — risk of regression");

    // Headline: most distinctive single reason
    let headline: string;
    if (isFit && surplus >= 200) {
      headline = `Steal at your weakest position`;
    } else if (isFit) {
      headline = `Fills your ${c.position} need`;
    } else if (surplus >= 500) {
      headline = `Major value drop, take BPA`;
    } else if (c.breakout) {
      headline = `Breakout candidate`;
    } else if (c.buyLow) {
      headline = `Buy-low opportunity`;
    } else if (c.age != null && c.age <= 21) {
      headline = `Best young asset on the board`;
    } else {
      headline = `Best player available`;
    }

    return {
      rank: idx + 1,
      player: c,
      score,
      surplus,
      isFit,
      headline,
      reasoning,
    };
  });
}

export function tierLabel(tier: number): string {
  return TIER_LABELS[tier] ?? `Tier ${tier}`;
}
