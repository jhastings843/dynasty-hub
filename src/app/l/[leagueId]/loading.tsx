export default function DynastyLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex animate-pulse flex-col gap-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="h-8 w-64 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="h-9 w-36 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
          <div className="flex flex-col gap-4">
            <div className="h-5 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-40 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-40 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-40 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-72 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      </div>
    </main>
  );
}
