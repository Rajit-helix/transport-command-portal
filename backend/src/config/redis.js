import Redis from "ioredis";
import { env } from "./env.js";
import { logger } from "./logger.js";

let redis = null;

if (env.redisUrl) {
  redis = new Redis(env.redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true
  });

  redis.on("error", (error) => {
    logger.error({ error }, "Redis connection error");
  });
}

export function disableRedis() {
  if (!redis) {
    return;
  }
  redis.disconnect();
  redis = null;
}

export { redis };
