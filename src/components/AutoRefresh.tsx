"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Calls router.refresh() on a fixed interval. Pause / resume controls
// let you stop polling during a slow draft (12hr clocks) when you step
// away.
export function AutoRefresh({
  intervalMs = 60_000,
  label = "Auto-refresh",
}: {
  intervalMs?: number;
  label?: string;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs, router]);

  const seconds = Math.round(intervalMs / 1000);

  return (
    <div className="inline-flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
      <span
        className={`inline-block size-2 rounded-full ${
          enabled
            ? "bg-emerald-500 dark:bg-emerald-400"
            : "bg-zinc-400 dark:bg-zinc-600"
        }`}
        aria-hidden
      />
      <span>
        {label} {seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)}m`}
        {enabled ? "" : " · paused"}
      </span>
      <button
        type="button"
        onClick={() => setEnabled((e) => !e)}
        className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {enabled ? "Pause" : "Resume"}
      </button>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Refresh
      </button>
    </div>
  );
}
