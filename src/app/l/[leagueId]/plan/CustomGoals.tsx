"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

interface CustomGoal {
  id: string;
  text: string;
  category: string;
  done: boolean;
}

const STORAGE_KEY = "fantasy-hub:season-plan:custom-goals";
// Goals saved before the Dynasty Hub -> Fantasy Hub rename live under the old
// key; read it as a fallback so nothing is lost. The next save writes the new key.
const LEGACY_STORAGE_KEY = "dynasty-hub:season-plan:custom-goals";
const CATEGORIES = ["roster", "trade", "draft", "standings", "other"] as const;

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function CustomGoals() {
  const [goals, setGoals] = useState<CustomGoal[]>([]);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY) ??
        localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        // Hydrating from localStorage on client mount is the documented
        // pattern; this rule overfires for it.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGoals(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    } catch {
      // ignore
    }
  }, [goals, hydrated]);

  function add() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setGoals((g) => [
      ...g,
      { id: uid(), text: trimmed, category, done: false },
    ]);
    setText("");
  }

  function toggle(id: string) {
    setGoals((g) =>
      g.map((x) => (x.id === id ? { ...x, done: !x.done } : x)),
    );
  }

  function remove(id: string) {
    setGoals((g) => g.filter((x) => x.id !== id));
  }

  if (!hydrated) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-sm text-zinc-400 dark:text-zinc-600">
          Loading goals...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex flex-wrap items-stretch gap-2"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a goal..."
          className="flex-1 min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm capitalize dark:border-zinc-800 dark:bg-zinc-950"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          disabled={!text.trim()}
        >
          <Plus size={14} aria-hidden />
          Add
        </button>
      </form>

      {goals.length === 0 ? (
        <p className="py-2 text-xs text-zinc-500 dark:text-zinc-400">
          No custom goals yet. Add one above; saved locally to this browser.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {goals.map((g) => (
            <li key={g.id} className="flex items-center gap-3 py-2.5">
              <input
                type="checkbox"
                checked={g.done}
                onChange={() => toggle(g.id)}
                className="size-4 shrink-0 rounded border-zinc-300 text-amber-600 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={`text-sm ${
                    g.done
                      ? "text-zinc-400 line-through dark:text-zinc-600"
                      : ""
                  }`}
                >
                  {g.text}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {g.category}
                </span>
              </div>
              <button
                type="button"
                onClick={() => remove(g.id)}
                className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800 dark:hover:text-rose-400"
                aria-label="Remove goal"
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        Custom goals are saved to this browser only. Clear browser data and
        they reset.
      </p>
    </div>
  );
}
