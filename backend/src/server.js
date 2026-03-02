import http from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./config/db.js";
import { logger } from "./config/logger.js";
import { disableRedis, redis } from "./config/redis.js";
import { initSocket } from "./config/socket.js";

async function start() {
  try {
    await pool.query("SELECT 1");
    if (redis) {
      try {
        await redis.ping();
      } catch (error) {
        logger.warn({ error }, "Redis unavailable, continuing without Redis features");
        disableRedis();
      }
    }

    const server = http.createServer(app);
    initSocket(server);

    server.listen(env.port, () => {
      logger.info({ port: env.port, env: env.nodeEnv }, "Backend started");
    });
  } catch (error) {
    logger.error({ error }, "Failed to start backend");
    process.exit(1);
  }
}

start();
