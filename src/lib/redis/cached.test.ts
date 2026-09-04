import { describe, expect, it } from "vitest";
import { cachedWithFallback, type KVStore } from "./cached";

function memoryStore(): KVStore & { data: Map<string, unknown>; sets: string[] } {
  const data = new Map<string, unknown>();
  const sets: string[] = [];
  return {
    data,
    sets,
    async get<T>(key: string) {
      return (data.get(key) as T) ?? null;
    },
    async set<T>(key: string, value: T) {
      sets.push(key);
      data.set(key, value);
    },
  };
}

const base = {
  key: "k",
  ttlSeconds: 60,
  empty: [] as number[],
  isComplete: (v: number[]) => v.length === 3,
};

describe("cachedWithFallback", () => {
  it("returns and stores a complete fetch", async () => {
    const store = memoryStore();
    const r = await cachedWithFallback(
      { ...base, fetcher: async () => [1, 2, 3] },
      store,
    );
    expect(r.value).toEqual([1, 2, 3]);
    expect(r.stale).toBe(false);
    expect(store.sets).toContain("k");
    expect(store.sets).toContain("k:lkg");
  });

  it("serves the cached copy without refetching", async () => {
    const store = memoryStore();
    let calls = 0;
    const fetcher = async () => {
      calls++;
      return [1, 2, 3];
    };
    await cachedWithFallback({ ...base, fetcher }, store);
    await cachedWithFallback({ ...base, fetcher }, store);
    expect(calls).toBe(1);
  });

  it("falls back to the last good copy when a fetch throws", async () => {
    const store = memoryStore();
    await cachedWithFallback({ ...base, fetcher: async () => [1, 2, 3] }, store);
    store.data.delete("k"); // TTL lapsed

    const r = await cachedWithFallback(
      {
        ...base,
        fetcher: async () => {
          throw new Error("upstream down");
        },
      },
      store,
    );
    expect(r.value).toEqual([1, 2, 3]);
    expect(r.stale).toBe(true);
  });

  it("falls back when a fetch succeeds but comes back short", async () => {
    // The dangerous case: a 200 with half the data looks fine to a try/catch.
    const store = memoryStore();
    await cachedWithFallback({ ...base, fetcher: async () => [1, 2, 3] }, store);
    store.data.delete("k");

    const r = await cachedWithFallback(
      { ...base, fetcher: async () => [1, 2] },
      store,
    );
    expect(r.value).toEqual([1, 2, 3]);
    expect(r.stale).toBe(true);
  });

  it("never overwrites the last good copy with an incomplete one", async () => {
    const store = memoryStore();
    await cachedWithFallback({ ...base, fetcher: async () => [1, 2, 3] }, store);
    store.data.delete("k");
    await cachedWithFallback({ ...base, fetcher: async () => [9] }, store);
    expect((store.data.get("k:lkg") as { value: number[] }).value).toEqual([1, 2, 3]);
  });

  it("keeps reporting staleness while the upstream stays broken", async () => {
    const store = memoryStore();
    await cachedWithFallback({ ...base, fetcher: async () => [1, 2, 3] }, store);
    store.data.delete("k");
    await cachedWithFallback({ ...base, fetcher: async () => [] }, store);
    const again = await cachedWithFallback(
      { ...base, fetcher: async () => [] },
      store,
    );
    expect(again.stale).toBe(true);
  });

  it("recovers on its own once the upstream comes back", async () => {
    const store = memoryStore();
    await cachedWithFallback({ ...base, fetcher: async () => [1, 2, 3] }, store);
    store.data.delete("k");
    const bad = await cachedWithFallback({ ...base, fetcher: async () => [] }, store);
    expect(bad.stale).toBe(true);

    store.data.delete("k");
    const good = await cachedWithFallback(
      { ...base, fetcher: async () => [4, 5, 6] },
      store,
    );
    expect(good.stale).toBe(false);
    expect(good.value).toEqual([4, 5, 6]);
  });

  it("returns the empty value when nothing good was ever stored", async () => {
    const store = memoryStore();
    const r = await cachedWithFallback(
      {
        ...base,
        fetcher: async () => {
          throw new Error("down");
        },
      },
      store,
    );
    expect(r.value).toEqual([]);
    expect(r.stale).toBe(true);
  });

  it("survives a store that throws on every operation", async () => {
    const broken: KVStore = {
      async get() {
        throw new Error("redis down");
      },
      async set() {
        throw new Error("redis down");
      },
    };
    const r = await cachedWithFallback(
      { ...base, fetcher: async () => [1, 2, 3] },
      broken,
    );
    expect(r.value).toEqual([1, 2, 3]);
    expect(r.stale).toBe(false);
  });
});
