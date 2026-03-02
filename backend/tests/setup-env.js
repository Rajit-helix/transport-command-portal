process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.PORT = process.env.PORT || "4001";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/transport_db";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
process.env.REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || "http://localhost:5173";
process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || "60000";
process.env.RATE_LIMIT_MAX_AUTH = process.env.RATE_LIMIT_MAX_AUTH || "100";
process.env.RATE_LIMIT_MAX_BOOKING = process.env.RATE_LIMIT_MAX_BOOKING || "100";
process.env.LOG_LEVEL = process.env.LOG_LEVEL || "warn";
process.env.REDIS_URL = process.env.REDIS_URL || "";
process.env.SMTP_HOST = process.env.SMTP_HOST || "";
process.env.SMTP_PORT = process.env.SMTP_PORT || "2525";
process.env.SMTP_SECURE = process.env.SMTP_SECURE || "false";
process.env.SMTP_USER = process.env.SMTP_USER || "";
process.env.SMTP_PASS = process.env.SMTP_PASS || "";
process.env.SMTP_FROM = process.env.SMTP_FROM || "no-reply@example.com";
process.env.FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
