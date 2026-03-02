import { Queue } from "bullmq";
import { redis } from "../config/redis.js";

export const notificationQueue = redis
  ? new Queue("notifications", { connection: redis })
  : null;

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
