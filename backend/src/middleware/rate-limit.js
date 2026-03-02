import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const authRateLimit = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMaxAuth,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth requests. Please try again later." }
});

export const bookingRateLimit = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMaxBooking,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many booking requests. Please try again later." }
});
