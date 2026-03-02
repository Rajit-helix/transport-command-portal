import { query } from "../config/db.js";
import { redis } from "../config/redis.js";

export async function liveness(_req, res) {
  res.json({ status: "alive" });
}

export async function readiness(_req, res) {
  try {
    await query("SELECT 1");
    if (redis) {
      await redis.ping();
    }
    res.json({ status: "ready" });
  } catch (error) {
    res.status(503).json({ status: "not_ready", error: error.message });
  }
}

export async function health(_req, res) {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
}
