"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  label,
  exact = false,
}: {
  href: string;
  label: string;
  /**
   * Match the path exactly instead of prefix-matching. Needed for links whose
   * href is a prefix of every sibling, such as a league home at /l/[id] when
   * its tools live at /l/[id]/draft.
   */
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || (href !== "/" && !!pathname?.startsWith(href + "/"));
  return (
    <Link
      href={href}
      className={`relative whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "text-zinc-900 dark:text-zinc-50"
          : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      }`}
    >
      {label}
      {active && (
        <span
          aria-hidden
          className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
        />
      )}
    </Link>
  );
}
