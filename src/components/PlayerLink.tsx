"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// A consistent name link to the player profile. Used everywhere a
// player name is rendered. `stopPropagation` lets us nest the link
// inside a <label> (e.g. trade builder checkboxes) without toggling
// the parent control on click.
//
// The league comes from the URL rather than a prop. Every caller already
// renders inside /l/[leagueId], and threading the id through dozens of call
// sites would buy nothing.
export function PlayerLink({
  id,
  name,
  className = "",
  stopPropagation = false,
}: {
  id: string;
  name: string;
  className?: string;
  stopPropagation?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const leagueId = pathname.split("/")[2] ?? "";

  return (
    <Link
      href={`/l/${leagueId}/player/${id}`}
      className={`hover:text-amber-700 hover:underline dark:hover:text-amber-400 ${className}`}
      onClick={
        stopPropagation
          ? (e) => {
              e.stopPropagation();
            }
          : undefined
      }
    >
      {name}
    </Link>
  );
}
