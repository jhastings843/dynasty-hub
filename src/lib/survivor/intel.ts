import "server-only";
import { cached } from "@/lib/redis/cached";
import { parseInjuries, type EspnInjuryFeed } from "./intel-pure";
import type { InjuryNote } from "./types";

const ESPN_INJURIES =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries";

/**
 * League-wide injury report, cached 30 minutes. The point is not a full injury
 * feed, it is the one line that explains why a 78% favourite is really a 68%
 * favourite and the market has not caught up yet.
 */
export function getInjuries(): Promise<InjuryNote[]> {
  return cached("survivor:injuries:v1", 60 * 30, async () => {
    const res = await fetch(ESPN_INJURIES, { cache: "no-store" });
    if (!res.ok) throw new Error(`ESPN injuries: ${res.status}`);
    return parseInjuries((await res.json()) as EspnInjuryFeed);
  }).catch(() => [] as InjuryNote[]);
}

export { notesForTeam, parseInjuries } from "./intel-pure";
