import "server-only";
import { cached, invalidate } from "@/lib/redis/cached";
import type {
  SleeperDraft,
  SleeperDraftPick,
  SleeperLeague,
  SleeperPlayer,
  SleeperPlayersById,
  SleeperRoster,
  SleeperUser,
} from "./types";

const SLEEPER_BASE = "https://api.sleeper.app/v1";

const KEY = {
  league: (id: string) => `sleeper:v1:league:${id}`,
  rosters: (id: string) => `sleeper:v1:league:${id}:rosters`,
  users: (id: string) => `sleeper:v1:league:${id}:users`,
  user: (u: string) => `sleeper:v1:user:${u}`,
  playersSlim: () => `sleeper:v2:players:nfl:slim`,
  drafts: (id: string) => `sleeper:v1:league:${id}:drafts`,
  draft: (id: string) => `sleeper:v1:draft:${id}`,
  draftPicks: (id: string) => `sleeper:v1:draft:${id}:picks`,
};

const TTL = {
  league: 12 * 60 * 60,
  rosters: 60 * 60,
  users: 24 * 60 * 60,
  user: 24 * 60 * 60,
  playersSlim: 24 * 60 * 60,
  drafts: 60 * 60,
  draft: 60 * 60,
  // Draft picks change in real-time during the draft itself; short TTL.
  draftPicks: 60,
};

async function sleeperFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${SLEEPER_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Sleeper request failed: ${res.status} ${res.statusText} (${path})`);
  }
  return (await res.json()) as T;
}

export function getLeague(leagueId: string): Promise<SleeperLeague> {
  return cached(KEY.league(leagueId), TTL.league, () =>
    sleeperFetch<SleeperLeague>(`/league/${leagueId}`),
  );
}

export function getLeagueRosters(leagueId: string): Promise<SleeperRoster[]> {
  return cached(KEY.rosters(leagueId), TTL.rosters, () =>
    sleeperFetch<SleeperRoster[]>(`/league/${leagueId}/rosters`),
  );
}

export function getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
  return cached(KEY.users(leagueId), TTL.users, () =>
    sleeperFetch<SleeperUser[]>(`/league/${leagueId}/users`),
  );
}

export function getUser(usernameOrId: string): Promise<SleeperUser> {
  return cached(KEY.user(usernameOrId), TTL.user, () =>
    sleeperFetch<SleeperUser>(`/user/${usernameOrId}`),
  );
}

type RawPlayer = Partial<SleeperPlayer> & Record<string, unknown>;

function slimPlayer(raw: RawPlayer): SleeperPlayer {
  return {
    player_id: String(raw.player_id ?? ""),
    full_name: typeof raw.full_name === "string" ? raw.full_name : undefined,
    first_name: typeof raw.first_name === "string" ? raw.first_name : undefined,
    last_name: typeof raw.last_name === "string" ? raw.last_name : undefined,
    position: typeof raw.position === "string" ? raw.position : null,
    team: typeof raw.team === "string" ? raw.team : null,
    age: typeof raw.age === "number" ? raw.age : null,
    status: typeof raw.status === "string" ? raw.status : null,
    fantasy_positions: Array.isArray(raw.fantasy_positions)
      ? (raw.fantasy_positions as string[])
      : null,
    years_exp:
      typeof raw.years_exp === "number" ? raw.years_exp : null,
  };
}

function slimAllPlayers(raw: Record<string, RawPlayer>): SleeperPlayersById {
  const out: SleeperPlayersById = {};
  for (const [id, p] of Object.entries(raw)) {
    if (!p || typeof p !== "object") continue;
    if (!p.position && !Array.isArray(p.fantasy_positions)) continue;
    out[id] = slimPlayer(p);
  }
  return out;
}

export function getAllPlayers(): Promise<SleeperPlayersById> {
  return cached(KEY.playersSlim(), TTL.playersSlim, async () => {
    const raw = await sleeperFetch<Record<string, RawPlayer>>(`/players/nfl`);
    return slimAllPlayers(raw);
  });
}

export async function revalidateLeague(leagueId: string): Promise<void> {
  await invalidate(
    KEY.league(leagueId),
    KEY.rosters(leagueId),
    KEY.users(leagueId),
  );
}

export async function revalidateAllPlayers(): Promise<void> {
  await invalidate(KEY.playersSlim());
}

// --- Drafts ---

export function getLeagueDrafts(leagueId: string): Promise<SleeperDraft[]> {
  return cached(KEY.drafts(leagueId), TTL.drafts, () =>
    sleeperFetch<SleeperDraft[]>(`/league/${leagueId}/drafts`),
  );
}

export function getDraft(draftId: string): Promise<SleeperDraft> {
  return cached(KEY.draft(draftId), TTL.draft, () =>
    sleeperFetch<SleeperDraft>(`/draft/${draftId}`),
  );
}

export function getDraftPicks(draftId: string): Promise<SleeperDraftPick[]> {
  return cached(KEY.draftPicks(draftId), TTL.draftPicks, () =>
    sleeperFetch<SleeperDraftPick[]>(`/draft/${draftId}/picks`),
  );
}

export async function revalidateDraft(draftId: string): Promise<void> {
  await invalidate(KEY.draft(draftId), KEY.draftPicks(draftId));
}
