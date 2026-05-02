// Detect same-NFL-team + same-position duplicates on a roster.
// Per Jack's roster construction rule: avoid stacking two players who
// compete for the same job. The lowest-value player in each conflict
// is the recommended drop.

export interface ConflictPlayer {
  id: string;
  name: string;
  team: string;
  position: string;
  value: number;
  age: number | null;
  photoUrl: string | null;
}

export interface RosterConflict {
  team: string;
  position: string;
  players: ConflictPlayer[];
  dropCandidate: ConflictPlayer;
}

const FLAGGABLE_POSITIONS = new Set(["QB", "RB", "WR", "TE"]);

export function detectRosterConflicts(
  players: ConflictPlayer[],
): RosterConflict[] {
  const groups = new Map<string, ConflictPlayer[]>();
  for (const p of players) {
    if (!FLAGGABLE_POSITIONS.has(p.position) || !p.team) continue;
    const key = `${p.team}-${p.position}`;
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }

  const conflicts: RosterConflict[] = [];
  for (const [key, list] of groups) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => b.value - a.value);
    const dropCandidate = sorted[sorted.length - 1];
    const [team, position] = key.split("-");
    conflicts.push({
      team,
      position,
      players: sorted,
      dropCandidate,
    });
  }

  // Sort: most players in conflict first, then highest combined value
  return conflicts.sort((a, b) => {
    if (a.players.length !== b.players.length) {
      return b.players.length - a.players.length;
    }
    const aSum = a.players.reduce((s, p) => s + p.value, 0);
    const bSum = b.players.reduce((s, p) => s + p.value, 0);
    return bSum - aSum;
  });
}

// Set of player IDs that are flagged as part of any conflict (for chip
// rendering on individual roster rows).
export function conflictedPlayerIds(
  conflicts: RosterConflict[],
): Set<string> {
  const ids = new Set<string>();
  for (const c of conflicts) {
    for (const p of c.players) ids.add(p.id);
  }
  return ids;
}

// IDs flagged as the recommended drop in their conflict.
export function dropCandidateIds(conflicts: RosterConflict[]): Set<string> {
  return new Set(conflicts.map((c) => c.dropCandidate.id));
}
