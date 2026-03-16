import pg from "pg";
import { setTimeout as delay } from "node:timers/promises";

const { Client } = pg;

const timeoutMs = Number(process.env.PG_READY_TIMEOUT_MS || 60000);
const baseDelayMs = Number(process.env.PG_READY_INTERVAL_MS || 500);
const maxDelayMs = Number(process.env.PG_READY_MAX_INTERVAL_MS || 2000);
const connectionTimeoutMs = Number(process.env.PG_READY_CONN_TIMEOUT_MS || 5000);

function buildConnectionString() {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl) {
    return envUrl;
  }

  const host = process.env.PGHOST || "localhost";
  const port = process.env.PGPORT || "5432";
  const user = process.env.PGUSER || "postgres";
  const password = process.env.PGPASSWORD || "postgres";
  const database = process.env.PGDATABASE || "postgres";
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return `postgres://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
}

function sanitizeUrl(urlValue) {
  try {
    const parsed = new URL(urlValue);
    if (parsed.password) {
      parsed.password = "****";
    }
    return parsed.toString();
  } catch {
    return urlValue;
  }
}

function isRetriable(error) {
  if (!error) return false;
  const code = error.code || error?.cause?.code;
  const message = String(error.message || "").toLowerCase();
  return (
    code === "57P03" || // database system is starting up
    code === "3D000" || // database does not exist yet
    code === "ECONNREFUSED" ||
    code === "EHOSTUNREACH" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "EAI_AGAIN" ||
    message.includes("starting up") ||
    message.includes("the database system is starting up")
  );
}

async function checkReady(connectionString) {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: connectionTimeoutMs
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
    return null;
  } catch (error) {
    return error;
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}

async function main() {
  const connectionString = buildConnectionString();
  const safeUrl = sanitizeUrl(connectionString);
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt += 1;
    const error = await checkReady(connectionString);
    if (!error) {
      console.log("PostgreSQL is ready:", safeUrl);
      process.exit(0);
    }

    if (!isRetriable(error)) {
      console.error("PostgreSQL readiness failed:", error);
      process.exit(1);
    }

    const backoff = Math.min(baseDelayMs * Math.pow(1.2, attempt), maxDelayMs);
    await delay(backoff);
  }

  console.error("Timed out waiting for PostgreSQL to be ready:", safeUrl);
  process.exit(1);
}

main();
