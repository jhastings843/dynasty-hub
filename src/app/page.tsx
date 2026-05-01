import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-dvh bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Dynasty Hub</h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            Tools for your dynasty league and survivor pool.
          </p>
        </header>

        <nav className="flex flex-col gap-3">
          <Link
            href="/dynasty"
            className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-lg font-medium shadow-sm active:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800"
          >
            <span>Dynasty</span>
            <span aria-hidden className="text-zinc-400">›</span>
          </Link>
          <Link
            href="/survivor"
            className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-lg font-medium shadow-sm active:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800"
          >
            <span>Survivor</span>
            <span aria-hidden className="text-zinc-400">›</span>
          </Link>
          <Link
            href="/resources"
            className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-lg font-medium shadow-sm active:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800"
          >
            <span>Resources</span>
            <span aria-hidden className="text-zinc-400">›</span>
          </Link>
        </nav>
      </div>
    </main>
  );
}
