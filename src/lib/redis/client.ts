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

export const redis: Redis = buildClient();
