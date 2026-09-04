import "server-only";
import { redis } from "./client";

type Fetcher<T> = () => Promise<T>;

const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: Fetcher<T>,
): Promise<T> {
  const hit = await redis.get<T>(key);
  if (hit !== null && hit !== undefined) {
    return hit as T;
  }

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const p = (async () => {
    const fresh = await fetcher();
    try {
      await redis.set(key, fresh, { ex: ttlSeconds });
    } catch (e) {
      // Cache write failures (e.g. value too large) shouldn't break the request.
      console.warn(`[cache] set failed for ${key}: ${e instanceof Error ? e.message : e}`);
    }
    return fresh;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, p);
  return p;
}

export async function invalidate(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await redis.del(...keys);
}

/**
 * A store, so the fallback logic below can be exercised without Redis.
 */
export interface KVStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}

const redisStore: KVStore = {
  async get<T>(key: string) {
    return (await redis.get<T>(key)) ?? null;
  },
  async set<T>(key: string, value: T, ttlSeconds: number) {
    await redis.set(key, value, { ex: ttlSeconds });
  },
};

export interface Fresh<T> {
  value: T;
  /** True when this is a last-known-good copy rather than a live fetch. */
  stale: boolean;
  /** When the underlying data was actually fetched. */
  at: string;
}

export interface FallbackOptions<T> {
  key: string;
  ttlSeconds: number;
  fetcher: () => Promise<T>;
  /**
   * Whether a fetch came back whole. An upstream that answers 200 with half the
   * data is more dangerous than one that fails, because nothing looks wrong.
   */
  isComplete: (value: T) => boolean;
  /** Returned only when a fetch fails and nothing good was ever stored. */
  empty: T;
  lkgTtlSeconds?: number;
}

const WEEK_SECONDS = 60 * 60 * 24 * 7;
/** Retry sooner than the normal TTL while serving a stale copy. */
const STALE_RETRY_SECONDS = 120;

/**
 * Like cached(), but keeps a long-lived last-known-good copy and serves that
 * when a fetch fails or comes back incomplete, rather than caching the damage.
 *
 * The caller is told when the answer is stale so it can say so out loud.
 */
export async function cachedWithFallback<T>(
  opts: FallbackOptions<T>,
  store: KVStore = redisStore,
): Promise<Fresh<T>> {
  const { key, ttlSeconds, fetcher, isComplete, empty } = opts;
  const lkgKey = `${key}:lkg`;

  const hit = await store.get<Fresh<T>>(key).catch(() => null);
  if (hit && hit.value !== undefined) return hit;

  let fresh: T | null = null;
  try {
    fresh = await fetcher();
  } catch {
    fresh = null;
  }

  if (fresh !== null && isComplete(fresh)) {
    const wrapped: Fresh<T> = {
      value: fresh,
      stale: false,
      at: new Date().toISOString(),
    };
    await store.set(key, wrapped, ttlSeconds).catch(() => {});
    await store
      .set(lkgKey, wrapped, opts.lkgTtlSeconds ?? WEEK_SECONDS)
      .catch(() => {});
    return wrapped;
  }

  const lkg = await store.get<Fresh<T>>(lkgKey).catch(() => null);
  if (lkg && lkg.value !== undefined) {
    const wrapped: Fresh<T> = { value: lkg.value, stale: true, at: lkg.at };
    // Short TTL: keep retrying rather than settling into the stale copy.
    await store
      .set(key, wrapped, Math.min(ttlSeconds, STALE_RETRY_SECONDS))
      .catch(() => {});
    return wrapped;
  }

  return {
    value: fresh !== null ? fresh : empty,
    stale: true,
    at: new Date().toISOString(),
  };
}
