import Link from "next/link";

// A consistent name link to the player profile. Used everywhere a
// player name is rendered. `stopPropagation` lets us nest the link
// inside a <label> (e.g. trade builder checkboxes) without toggling
// the parent control on click.
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
  return (
    <Link
      href={`/dynasty/player/${id}`}
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
