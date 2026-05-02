// Pure logic for league-wide trade recommendations and proposed-trade
// evaluation. Safe to import from client components.
//
// Includes:
// - findBestTrades: scan all partners for fit-driven trades (legacy)
// - findLeagueWideMatches: given a fixed give side, find ALL competitive
//   trade options across the league
// - evaluateTrade: verdict on a specific proposal
// - suggestCounters: counter-offer suggestions when verdict is unfavorable

import type { PlayerRow, TeamSummary } from "./power-rankings";
import type { RAPick } from "@/lib/rosteraudit/types";

const TRADE_POSITIONS = ["QB", "RB", "WR", "TE"] as const;

function pickValue(p: RAPick, isSuperflex: boolean): number {
  return isSuperflex ? p.valueSf : p.value1qb;
}

// ---------------------------------------------------------------
// Best trades across the league
// ---------------------------------------------------------------

export interface BestTradeIdea {
  partnerRosterId: number;
  partnerName: string;
  send: PlayerRow[];
  receive: PlayerRow[];
  myValue: number;
  theirValue: number;
  reasoning: string[];
  positionalGain: { position: string; from: number; to: number };
  score: number;
}

// Compute the projected new positional value for a team after a swap.
function projectedRoomValue(
  team: TeamSummary,
  position: string,
  giveAway: PlayerRow[],
  receive: PlayerRow[],
): number {
  let v = team.positionTotals[position] ?? 0;
  for (const p of giveAway) {
    if (p.position === position) v -= p.value;
  }
  for (const p of receive) {
    if (p.position === position) v += p.value;
  }
  return v;
}

// Project where the team would rank at a position after a swap.
function projectedRank(
  myTeam: TeamSummary,
  allTeams: TeamSummary[],
  position: string,
  giveAway: PlayerRow[],
  receive: PlayerRow[],
): number {
  const myProjected = projectedRoomValue(myTeam, position, giveAway, receive);
  let rank = 1;
  for (const t of allTeams) {
    if (t.rosterId === myTeam.rosterId) continue;
    const v = t.positionTotals[position] ?? 0;
    if (v > myProjected) rank += 1;
  }
  return rank;
}

export function findBestTrades(
  myTeam: TeamSummary,
  allTeams: TeamSummary[],
  totalTeams: number,
  limit = 6,
): BestTradeIdea[] {
  const ideas: BestTradeIdea[] = [];

  const myRanksByPos = TRADE_POSITIONS.map((p) => ({
    pos: p,
    rank: myTeam.positionRanks[p] ?? 99,
  })).sort((a, b) => b.rank - a.rank);

  // Anything below median is "needs help"; the bottom two are top priority.
  const median = Math.ceil(totalTeams / 2);
  const myWeakPositions = myRanksByPos
    .filter((x) => x.rank > median)
    .map((x) => x.pos);

  if (myWeakPositions.length === 0) {
    // Already balanced; no clear trade priorities. Return empty.
    return [];
  }

  for (const partner of allTeams) {
    if (partner.rosterId === myTeam.rosterId) continue;

    for (const recvPos of myWeakPositions) {
      const partnerRank = partner.positionRanks[recvPos] ?? 99;
      // Partner must be strictly stronger than us at this position.
      if (partnerRank >= (myTeam.positionRanks[recvPos] ?? 99)) continue;

      const theirCandidates = partner.players
        .filter((p) => p.position === recvPos && p.value > 200)
        .sort((a, b) => b.value - a.value)
        .slice(1, 6);

      for (const recvPlayer of theirCandidates) {
        // Find one of my players at fair value. Prefer giving from
        // positions where I'm strong (highest rank-number = strongest).
        const myCandidates = myTeam.players
          .filter((p) => {
            if (p.position === recvPos) return false; // don't trade WITHIN the same position
            const baseline = Math.max(recvPlayer.value, p.value);
            const pct =
              baseline > 0 ? Math.abs(recvPlayer.value - p.value) / baseline : 1;
            return p.value > 200 && pct <= 0.18;
          })
          .map((p) => ({
            p,
            myRank: myTeam.positionRanks[p.position] ?? 99,
            valueDist: Math.abs(p.value - recvPlayer.value),
          }))
          // Prefer giving from my strongest positions (low rank #), then
          // closest in value.
          .sort(
            (a, b) =>
              a.myRank - b.myRank || a.valueDist - b.valueDist,
          )
          .slice(0, 4);

        for (const { p: sendPlayer } of myCandidates) {
          const beforeRank = myTeam.positionRanks[recvPos] ?? 99;
          const afterRank = projectedRank(
            myTeam,
            allTeams,
            recvPos,
            [sendPlayer],
            [recvPlayer],
          );
          if (afterRank >= beforeRank) continue;

          const sendPosRank = myTeam.positionRanks[sendPlayer.position] ?? 99;
          const positionalJump = beforeRank - afterRank;
          const baseline = Math.max(recvPlayer.value, sendPlayer.value);
          const valuePct =
            baseline > 0 ? Math.abs(recvPlayer.value - sendPlayer.value) / baseline : 1;
          const valueParityBonus = 1 - valuePct;
          // Bonus for trading from a strong position (lower rank # is stronger).
          const surplusBonus = Math.max(0, (totalTeams - sendPosRank) / totalTeams);

          const score =
            positionalJump * 10 + valueParityBonus * 4 + surplusBonus * 3;

          const reasoning: string[] = [];
          reasoning.push(
            `Improves ${recvPos} room (#${beforeRank} → projected #${afterRank})`,
          );
          if (sendPosRank <= median) {
            reasoning.push(
              `Trades from your ${sendPlayer.position} surplus (you're #${sendPosRank} of ${totalTeams})`,
            );
          } else {
            reasoning.push(
              `Sends a ${sendPlayer.position} you can spare (you're #${sendPosRank} of ${totalTeams})`,
            );
          }
          const delta = recvPlayer.value - sendPlayer.value;
          if (Math.abs(delta) <= 100) {
            reasoning.push("Value is essentially even");
          } else if (delta > 0) {
            reasoning.push(`You gain +${delta.toLocaleString()} in value`);
          } else {
            reasoning.push(
              `You give up ${Math.abs(delta).toLocaleString()} in value`,
            );
          }

          ideas.push({
            partnerRosterId: partner.rosterId,
            partnerName: partner.ownerName,
            send: [sendPlayer],
            receive: [recvPlayer],
            myValue: sendPlayer.value,
            theirValue: recvPlayer.value,
            reasoning,
            positionalGain: {
              position: recvPos,
              from: beforeRank,
              to: afterRank,
            },
            score,
          });
        }
      }
    }
  }

  // Dedupe by (partner, sendPlayerId, recvPlayerId) — keep the best
  // scoring for each unique pair.
  const seen = new Map<string, BestTradeIdea>();
  for (const idea of ideas) {
    const key = `${idea.partnerRosterId}-${idea.send[0]?.id}-${idea.receive[0]?.id}`;
    const existing = seen.get(key);
    if (!existing || idea.score > existing.score) {
      seen.set(key, idea);
    }
  }

  return [...seen.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

// ---------------------------------------------------------------
// League-wide auto-match: given my selected give side, surface every
// competitive trade option across all partner teams.
// ---------------------------------------------------------------

export interface LeagueWideMatch {
  partnerRosterId: number;
  partnerName: string;
  receivePlayers: PlayerRow[];
  sendValue: number;
  receiveValue: number;
  delta: number; // receive - send (positive = you win)
  pctDelta: number;
  isFit: boolean;
  fitPositions: string[];
  conflictWarning: boolean;
  reasoning: string[];
  score: number;
}

export function findLeagueWideMatches({
  myTeam,
  mySendPlayerIds,
  mySendValue,
  allTeams,
  weakestPositions,
  tolerance = 0.15,
  limit = 10,
}: {
  myTeam: TeamSummary;
  mySendPlayerIds: Set<string>;
  mySendValue: number; // total give value (players + picks)
  allTeams: TeamSummary[];
  weakestPositions: string[];
  isSuperflex?: boolean;
  tolerance?: number;
  limit?: number;
}): LeagueWideMatch[] {
  if (mySendValue === 0) return [];

  // Compute my POST-trade team+position set (for conflict avoidance per
  // Jack's rule).
  const myPostTradePositions = new Set<string>();
  for (const p of myTeam.players) {
    if (mySendPlayerIds.has(p.id)) continue;
    if (p.team && p.position) {
      myPostTradePositions.add(`${p.team}-${p.position}`);
    }
  }

  const matches: LeagueWideMatch[] = [];

  for (const partner of allTeams) {
    if (partner.rosterId === myTeam.rosterId) continue;

    for (const p of partner.players) {
      if (p.value <= 0) continue;

      // Match within tolerance
      const baseline = Math.max(p.value, mySendValue);
      const delta = p.value - mySendValue;
      const pct = baseline > 0 ? Math.abs(delta) / baseline : 1;
      if (pct > tolerance) continue;

      // Skip if receiving them would create a same-team conflict on my
      // post-trade roster.
      const wouldConflict = !!(
        p.team &&
        p.position &&
        myPostTradePositions.has(`${p.team}-${p.position}`)
      );
      if (wouldConflict) continue;

      // Skip the partner's #1 player at any position (they won't trade
      // their best). Heuristic: skip if this is their highest-valued
      // player in this position.
      const partnerPosBest = partner.players
        .filter((x) => x.position === p.position)
        .reduce((max, x) => (x.value > max ? x.value : max), 0);
      if (p.value === partnerPosBest && p.value > 1500) {
        continue;
      }

      const isFit = !!(p.position && weakestPositions.includes(p.position));

      // Score: positional fit > value parity
      let score = 0;
      score += (1 - pct) * 30; // value parity
      if (isFit) score += 35;
      if (p.age != null && p.age <= 23) score += 8;
      if (p.age != null && p.age >= 27) score -= 4;
      if (delta > 0) score += Math.min(delta / 80, 15);

      const reasoning: string[] = [];
      if (isFit && p.position) {
        reasoning.push(`Fills your weak ${p.position} room`);
      }
      if (Math.abs(delta) <= 100) {
        reasoning.push("Value is essentially even");
      } else if (delta > 0) {
        reasoning.push(`+${delta.toLocaleString()} value gain`);
      } else {
        reasoning.push(`${delta.toLocaleString()} value (within tolerance)`);
      }
      if (p.age != null && p.age <= 23) {
        reasoning.push(`Age ${p.age} — long dynasty runway`);
      }

      matches.push({
        partnerRosterId: partner.rosterId,
        partnerName: partner.ownerName,
        receivePlayers: [p],
        sendValue: mySendValue,
        receiveValue: p.value,
        delta,
        pctDelta: baseline > 0 ? delta / baseline : 0,
        isFit,
        fitPositions: isFit && p.position ? [p.position] : [],
        conflictWarning: false,
        reasoning,
        score,
      });
    }
  }

  // Dedup-ish: cap one match per (partnerRosterId, position) to avoid
  // showing 4 RBs from the same partner.
  const bestPerKey = new Map<string, LeagueWideMatch>();
  for (const m of matches) {
    const key = `${m.partnerRosterId}-${m.receivePlayers[0]?.position ?? "X"}`;
    const existing = bestPerKey.get(key);
    if (!existing || m.score > existing.score) {
      bestPerKey.set(key, m);
    }
  }

  return [...bestPerKey.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ---------------------------------------------------------------
// Verdict on a proposed trade
// ---------------------------------------------------------------

export type TradeVerdict =
  | "accept"
  | "lean_accept"
  | "even"
  | "lean_decline"
  | "decline";

export interface ProposedTrade {
  myPlayers: PlayerRow[];
  myPicks: RAPick[];
  theirPlayers: PlayerRow[];
  theirPicks: RAPick[];
}

export interface PositionalImpact {
  position: string;
  beforeRank: number;
  afterRank: number;
  delta: number; // positive = improved (lower rank number)
}

export interface CounterSuggestion {
  type: "ask_for_pick" | "ask_for_player" | "remove_player" | "swap_player";
  description: string;
  side: "add_to_their_side" | "remove_from_my_side" | "replace";
  // Optional concrete asset
  pickIdToAdd?: number;
  playerToAdd?: PlayerRow;
  playerToRemove?: PlayerRow;
}

export interface TradeAssessment {
  verdict: TradeVerdict;
  myValue: number;
  theirValue: number;
  delta: number; // their - mine (positive = you win)
  pctDelta: number;
  reasoning: string[];
  positionalImpact: PositionalImpact[];
  counters: CounterSuggestion[];
}

const VERDICT_LABEL: Record<TradeVerdict, string> = {
  accept: "Accept",
  lean_accept: "Lean accept",
  even: "Even",
  lean_decline: "Lean decline",
  decline: "Decline",
};

export function verdictLabel(v: TradeVerdict): string {
  return VERDICT_LABEL[v];
}

export function evaluateTrade(
  proposal: ProposedTrade,
  myTeam: TeamSummary,
  partner: TeamSummary | null,
  allTeams: TeamSummary[],
  totalTeams: number,
  isSuperflex: boolean,
  picksById: Map<number, RAPick>,
): TradeAssessment | null {
  const empty =
    proposal.myPlayers.length === 0 &&
    proposal.myPicks.length === 0 &&
    proposal.theirPlayers.length === 0 &&
    proposal.theirPicks.length === 0;
  if (empty) return null;

  const myPlayerSum = proposal.myPlayers.reduce((s, p) => s + p.value, 0);
  const myPickSum = proposal.myPicks.reduce(
    (s, p) => s + pickValue(p, isSuperflex),
    0,
  );
  const theirPlayerSum = proposal.theirPlayers.reduce(
    (s, p) => s + p.value,
    0,
  );
  const theirPickSum = proposal.theirPicks.reduce(
    (s, p) => s + pickValue(p, isSuperflex),
    0,
  );

  const myValue = myPlayerSum + myPickSum;
  const theirValue = theirPlayerSum + theirPickSum;
  const delta = theirValue - myValue;
  const baseline = Math.max(myValue, theirValue);
  const pctDelta = baseline > 0 ? delta / baseline : 0;

  // Compute positional impact (only for positions touched).
  const touchedPositions = new Set<string>();
  for (const p of [...proposal.myPlayers, ...proposal.theirPlayers]) {
    touchedPositions.add(p.position);
  }

  const positionalImpact: PositionalImpact[] = [];
  for (const pos of touchedPositions) {
    const beforeRank = myTeam.positionRanks[pos] ?? 99;
    const afterRank = projectedRank(
      myTeam,
      allTeams,
      pos,
      proposal.myPlayers.filter((p) => p.position === pos),
      proposal.theirPlayers.filter((p) => p.position === pos),
    );
    positionalImpact.push({
      position: pos,
      beforeRank,
      afterRank,
      delta: beforeRank - afterRank,
    });
  }

  // Score positional impact: sum of (delta * how-weak-it-was) so improving
  // a weak room counts more than improving an already-strong one.
  let positionalScore = 0;
  for (const imp of positionalImpact) {
    const weakness = Math.max(0, imp.beforeRank - 6);
    positionalScore += imp.delta * (1 + weakness * 0.3);
  }

  // Combine: pct * 100 + positional score * 5 (roughly comparable scales)
  const overallScore = pctDelta * 100 + positionalScore * 5;

  let verdict: TradeVerdict;
  if (overallScore >= 18) verdict = "accept";
  else if (overallScore >= 6) verdict = "lean_accept";
  else if (overallScore > -6) verdict = "even";
  else if (overallScore > -18) verdict = "lean_decline";
  else verdict = "decline";

  const reasoning: string[] = [];
  if (Math.abs(pctDelta) >= 0.05) {
    const pct = Math.round(pctDelta * 100);
    reasoning.push(
      delta > 0
        ? `You gain ${delta.toLocaleString()} value (+${pct}%)`
        : `You lose ${Math.abs(delta).toLocaleString()} value (${pct}%)`,
    );
  } else {
    reasoning.push("Value is essentially even");
  }

  const improvedPositions = positionalImpact.filter((p) => p.delta > 0);
  const worsenedPositions = positionalImpact.filter((p) => p.delta < 0);
  for (const imp of improvedPositions) {
    reasoning.push(
      `Improves ${imp.position} room (#${imp.beforeRank} → projected #${imp.afterRank})`,
    );
  }
  for (const imp of worsenedPositions) {
    reasoning.push(
      `Weakens ${imp.position} room (#${imp.beforeRank} → projected #${imp.afterRank})`,
    );
  }

  // Counter suggestions when not "accept".
  const counters: CounterSuggestion[] = [];
  if (verdict !== "accept" && verdict !== "lean_accept" && partner) {
    if (delta < -200) {
      // Try to balance value: ask for a future pick from their side
      const partnerPicks = [...picksById.values()]
        .filter(
          (p) => !proposal.theirPicks.some((pp) => pp.id === p.id),
        )
        .sort(
          (a, b) =>
            Math.abs(pickValue(a, isSuperflex) + delta) -
            Math.abs(pickValue(b, isSuperflex) + delta),
        );
      const target = partnerPicks.find(
        (p) =>
          pickValue(p, isSuperflex) >= Math.abs(delta) * 0.6 &&
          pickValue(p, isSuperflex) <= Math.abs(delta) * 1.6,
      );
      if (target) {
        counters.push({
          type: "ask_for_pick",
          side: "add_to_their_side",
          description: `Ask for their ${target.label} to balance value`,
          pickIdToAdd: target.id,
        });
      }
    }

    // If a position got weaker, suggest removing the worst player you give in that position
    for (const imp of worsenedPositions) {
      const candidate = proposal.myPlayers
        .filter((p) => p.position === imp.position)
        .sort((a, b) => b.value - a.value)[0];
      if (candidate) {
        counters.push({
          type: "remove_player",
          side: "remove_from_my_side",
          description: `Pull ${candidate.name} from your side — you're already thin at ${imp.position}`,
          playerToRemove: candidate,
        });
      }
    }

    // If we still want a position improvement that didn't happen, suggest
    // an alternate from partner at the unfilled weak position.
    const stillWeakPositions = TRADE_POSITIONS.filter((p) => {
      const beforeRank = myTeam.positionRanks[p] ?? 99;
      const inImpact = positionalImpact.find((x) => x.position === p);
      const afterRank = inImpact?.afterRank ?? beforeRank;
      return beforeRank >= totalTeams - 3 && afterRank >= totalTeams - 3;
    });
    for (const pos of stillWeakPositions.slice(0, 1)) {
      const partnerCandidate = partner.players
        .filter(
          (p) =>
            p.position === pos &&
            p.value > Math.max(theirValue * 0.3, 500) &&
            !proposal.theirPlayers.some((tp) => tp.id === p.id),
        )
        .sort((a, b) => a.value - b.value)[0];
      if (partnerCandidate) {
        counters.push({
          type: "ask_for_player",
          side: "add_to_their_side",
          description: `Ask for ${partnerCandidate.name} (their ${pos}) — your weakest spot`,
          playerToAdd: partnerCandidate,
        });
      }
    }
  }

  return {
    verdict,
    myValue,
    theirValue,
    delta,
    pctDelta,
    reasoning,
    positionalImpact,
    counters: counters.slice(0, 3),
  };
}
