export default function DynastyLoading() {
  return (
    <main className="min-h-dvh bg-zinc-50 px-4 py-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-md animate-pulse flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-12 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-7 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-40 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-40 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-56 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    </main>
  );
}
