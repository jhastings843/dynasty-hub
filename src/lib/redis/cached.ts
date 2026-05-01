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
