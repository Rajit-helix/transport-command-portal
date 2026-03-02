import { redis } from "../config/redis.js";

export async function cacheGet(key) {
  if (!redis) return null;
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
}

export async function cacheSet(key, value, ttlSeconds = 60) {
  if (!redis) return;
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function cacheDeleteByPrefix(prefix) {
  if (!redis) return;
  const stream = redis.scanStream({ match: `${prefix}*`, count: 100 });
  stream.on("data", async (keys) => {
    if (keys.length) {
      await redis.del(keys);
    }
  });
}
