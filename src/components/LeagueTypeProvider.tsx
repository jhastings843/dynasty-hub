"use client";

import { createContext, useContext } from "react";
import type { LeagueType } from "@/lib/league/types";

// What format the league on screen is.
//
// It exists so PlayerLink can decide whether to show a Jingles rank without
// every one of its call sites having to pass a prop it does not otherwise care
// about. PlayerLink is rendered in dozens of places; threading league type
// through all of them to answer one question would be worse than this.
//
// Undefined is the honest default and it means "not known". Anything gated on
// format treats that as no, because showing half-PPR redraft research on a
// dynasty page is the mistake this is here to prevent.
const LeagueTypeContext = createContext<LeagueType | undefined>(undefined);

export function LeagueTypeProvider({
  type,
  children,
}: {
  type: LeagueType | undefined;
  children: React.ReactNode;
}) {
  return <LeagueTypeContext.Provider value={type}>{children}</LeagueTypeContext.Provider>;
}

export function useLeagueType(): LeagueType | undefined {
  return useContext(LeagueTypeContext);
}
