import { Worker } from "bullmq";
import { redis } from "../config/redis.js";
import { logger } from "../config/logger.js";

if (!redis) {
  logger.warn("Redis not configured; notification worker is disabled.");
  process.exit(0);
}

const worker = new Worker(
  "notifications",
  async (job) => {
    logger.info({ jobId: job.id, payload: job.data }, "Processed notification job");
  },
  { connection: redis }
);

worker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, error }, "Notification job failed");
});

logger.info("Notification worker started");
