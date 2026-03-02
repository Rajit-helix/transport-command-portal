import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.logLevel,
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "password", "token"],
    censor: "[REDACTED]"
  }
});
