import type { LeagueType } from "./types";

// Which tools apply to which league formats. A tool that doesn't apply is
// hidden from the nav rather than shown broken: a guillotine league has no
// trades, so it gets no trade tab.

export interface ToolDef {
  key: string;
  label: string;
  /** Appended to /l/[leagueId]. Empty string is the league home. */
  segment: string;
  types: LeagueType[];
}

const ALL: LeagueType[] = ["dynasty", "redraft", "guillotine"];

export const TOOLS: ToolDef[] = [
  { key: "home", label: "League", segment: "", types: ALL },
  { key: "plan", label: "Plan", segment: "plan", types: ALL },
  { key: "draft", label: "Draft", segment: "draft", types: ALL },
  // Guillotine has no trades under standard rules.
  { key: "trade", label: "Trade", segment: "trade", types: ["dynasty", "redraft"] },
  { key: "players", label: "Players", segment: "players", types: ALL },
];

export function toolsFor(type: LeagueType): ToolDef[] {
  return TOOLS.filter((t) => t.types.includes(type));
}

export function toolSupports(key: string, type: LeagueType): boolean {
  const tool = TOOLS.find((t) => t.key === key);
  return tool ? tool.types.includes(type) : false;
}

export function leaguePath(leagueId: string, segment: string): string {
  return segment ? `/l/${leagueId}/${segment}` : `/l/${leagueId}`;
}
