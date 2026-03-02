import { pool } from "../src/config/db.js";
import { closeNotificationQueue } from "../src/services/notification-queue.service.js";
import { redis } from "../src/config/redis.js";

afterAll(async () => {
  await closeNotificationQueue();
  if (redis) {
    try {
      await redis.quit();
    } catch {
      redis.disconnect();
    }
  }
  await pool.end();
});
