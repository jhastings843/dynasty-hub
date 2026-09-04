import "server-only";
import { Redis } from "@upstash/redis";

function buildClient(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL");
  }
  if (!token) {
    throw new Error("Missing UPSTASH_REDIS_REST_TOKEN");
  }

  return new Redis({ url, token });
}

let client: Redis | null = null;

/** Built on first use, not at import, so modules stay importable without env. */
export function getRedis(): Redis {
  if (!client) client = buildClient();
  return client;
}

export const redis: Redis = new Proxy({} as Redis, {
  get(_target, prop) {
    return Reflect.get(getRedis(), prop);
  },
});
