import Link from "next/link";
import {
  CATEGORIES,
  REDDITORS,
  RESOURCES,
  type Resource,
  type ResourceStatus,
} from "@/lib/resources/data";

const STATUS_LABEL: Record<ResourceStatus, string> = {
  integrated: "Integrated",
  free: "Free",
  free_tier: "Free tier",
  paid: "Paid",
  scrape_required: "Scrape required",
  outdated: "Verify",
};

const STATUS_CLASS: Record<ResourceStatus, string> = {
  integrated:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  free: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  free_tier: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  paid: "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300",
  scrape_required:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300",
  outdated:
    "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

function StatusBadge({ status }: { status: ResourceStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ResourceItem({ r }: { r: Resource }) {
  return (
    <li className="flex flex-col gap-1.5 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <a
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 text-sm font-medium text-blue-700 dark:text-blue-400"
        >
          {r.name}
          <span className="ml-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            ↗
          </span>
        </a>
        {r.status && r.status.length > 0 && (
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {r.status.map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
        )}
      </div>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        {hostOf(r.url)}
      </span>
      {r.note && (
        <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          {r.note}
        </p>
      )}
    </li>
  );
}

export default function ResourcesPage() {
  return (
    <main className="min-h-dvh bg-zinc-50 px-4 py-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Link href="/" className="text-sm text-zinc-500 dark:text-zinc-400">
            ‹ Home
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Resources</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Curated dynasty FF tools and references. Edit{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
              src/lib/resources/data.ts
            </code>{" "}
            to update.
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-2 text-xs">
          {CATEGORIES.map((c) => (
            <a
              key={c.key}
              href={`#${c.key}`}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center font-medium active:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800"
            >
              {c.title}
            </a>
          ))}
          <a
            href="#redditors"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center font-medium active:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800"
          >
            Redditors
          </a>
        </nav>

        {CATEGORIES.map((cat) => {
          const items = RESOURCES.filter((r) => r.category === cat.key);
          if (items.length === 0) return null;
          return (
            <section
              key={cat.key}
              id={cat.key}
              className="flex flex-col gap-2 scroll-mt-4"
            >
              <header className="flex flex-col gap-0.5">
                <h2 className="text-base font-semibold">{cat.title}</h2>
                {cat.blurb && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {cat.blurb}
                  </p>
                )}
              </header>
              <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                {items.map((r) => (
                  <ResourceItem key={r.url} r={r} />
                ))}
              </ul>
            </section>
          );
        })}

        <section id="redditors" className="flex flex-col gap-2 scroll-mt-4">
          <header className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold">Redditors</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              People worth following for analysis and rookie content.
            </p>
          </header>
          <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {REDDITORS.map((u) => (
              <li key={u.handle} className="flex flex-col gap-1.5 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={u.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 text-sm font-medium text-blue-700 dark:text-blue-400"
                  >
                    {u.handle}
                    <span className="ml-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                      ↗
                    </span>
                  </a>
                  {u.status && u.status.length > 0 && (
                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      {u.status.map((s) => (
                        <StatusBadge key={s} status={s} />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {u.posts}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
