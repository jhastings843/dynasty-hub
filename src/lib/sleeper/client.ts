import "server-only";
import type {
  SleeperLeague,
  SleeperPlayersById,
  SleeperRoster,
  SleeperUser,
} from "./types";

const SLEEPER_BASE = "https://api.sleeper.app/v1";

async function sleeperFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${SLEEPER_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Sleeper request failed: ${res.status} ${res.statusText} (${path})`);
  }
  return (await res.json()) as T;
}

export function getLeague(leagueId: string): Promise<SleeperLeague> {
  return sleeperFetch<SleeperLeague>(`/league/${leagueId}`);
}

export function getLeagueRosters(leagueId: string): Promise<SleeperRoster[]> {
  return sleeperFetch<SleeperRoster[]>(`/league/${leagueId}/rosters`);
}

export function getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
  return sleeperFetch<SleeperUser[]>(`/league/${leagueId}/users`);
}

export function getAllPlayers(): Promise<SleeperPlayersById> {
  return sleeperFetch<SleeperPlayersById>(`/players/nfl`);
}

export function getUser(usernameOrId: string): Promise<SleeperUser> {
  return sleeperFetch<SleeperUser>(`/user/${usernameOrId}`);
}
