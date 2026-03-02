import { Queue } from "bullmq";
import { redis } from "../config/redis.js";
import { env } from "../config/env.js";

export const notificationQueue = redis
  && !env.isTest
  ? new Queue("notifications", { connection: redis })
  : null;

if (notificationQueue) {
  notificationQueue.on("error", () => {
    // Prevent test/teardown crashes from unhandled queue errors.
  });
}

export async function enqueueNotification(payload) {
  if (!notificationQueue) return;
  await notificationQueue.add("booking-event", payload, {
    attempts: 3,
    backoff: {
      type: "fixed",
      delay: 3000
    }
  });
}

export async function closeNotificationQueue() {
  if (!notificationQueue) return;
  await notificationQueue.close();
}
