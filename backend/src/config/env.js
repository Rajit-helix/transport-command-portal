import dotenv from "dotenv";

dotenv.config();

const profile = process.env.NODE_ENV || "development";

const defaults = {
  development: {
    logLevel: "debug"
  },
  staging: {
    logLevel: "info"
  },
  production: {
    logLevel: "info"
  },
  test: {
    logLevel: "warn"
  }
};

const required = [
  "PORT",
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "REFRESH_TOKEN_EXPIRES_IN",
  "CORS_ORIGINS"
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

export const env = {
  profile,
  nodeEnv: profile,
  isProduction: profile === "production",
  isTest: profile === "test",
  port: Number(process.env.PORT),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
  corsOrigins: process.env.CORS_ORIGINS.split(",").map((v) => v.trim()),
  redisUrl: process.env.REDIS_URL || "",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  rateLimitMaxAuth: Number(process.env.RATE_LIMIT_MAX_AUTH || 10),
  rateLimitMaxBooking: Number(process.env.RATE_LIMIT_MAX_BOOKING || 30),
  logLevel: process.env.LOG_LEVEL || defaults[profile]?.logLevel || "info",

  // ✅ ADD THIS
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: process.env.SMTP_PORT || "",
  smtpSecure: process.env.SMTP_SECURE || "false",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || ""
  
};

