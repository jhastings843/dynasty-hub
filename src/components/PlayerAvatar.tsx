"use client";

// Renders a player headshot as a rounded avatar. Falls back to a colored
// circle with the player's initials if the photo URL is missing or fails
// to load. The fallback initials sit behind the <img>; on error the img
// hides itself, revealing the initials.

const POSITION_COLOR: Record<string, string> = {
  QB: "bg-rose-200 text-rose-900 dark:bg-rose-900/60 dark:text-rose-100",
  RB: "bg-emerald-200 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100",
  WR: "bg-sky-200 text-sky-900 dark:bg-sky-900/60 dark:text-sky-100",
  TE: "bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100",
};

const SIZE_PX: Record<string, number> = {
  sm: 32,
  md: 40,
  lg: 56,
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PlayerAvatar({
  name,
  position,
  photoUrl,
  size = "md",
}: {
  name: string;
  position?: string | null;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const px = SIZE_PX[size];
  const pos = position ?? "";
  const tint =
    POSITION_COLOR[pos] ??
    "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
  const fontSize = size === "sm" ? "text-[10px]" : size === "lg" ? "text-base" : "text-xs";

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ${tint}`}
      style={{ width: px, height: px }}
    >
      <span
        className={`absolute inset-0 flex items-center justify-center font-semibold tracking-tight ${fontSize}`}
        aria-hidden
      >
        {initials(name)}
      </span>
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
    </div>
  );
}
