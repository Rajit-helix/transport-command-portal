import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs/promises";
import path from "node:path";

function resolveEmbeddedPort() {
  const parsed = Number(process.env.EMBEDDED_PG_PORT || "5432");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 5432;
}

const embeddedPort = resolveEmbeddedPort();

const pg = new EmbeddedPostgres({
  databaseDir: "./.embedded-postgres/data",
  user: "postgres",
  password: "postgres",
  port: embeddedPort,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: (message) => console.log(String(message || "")),
  onError: (message) => console.error(String(message || ""))
});

async function ensureDatabase() {
  const dataDir = path.resolve(".embedded-postgres/data");
  const pgVersionFile = path.join(dataDir, "PG_VERSION");
  try {
    await fs.access(pgVersionFile);
  } catch {
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase("transport_db");
  } catch (error) {
    const message = String(error?.message || "");
    if (!message.toLowerCase().includes("already exists")) {
      throw error;
    }
  }
}

async function shutdown(signal) {
  try {
    await pg.stop();
  } finally {
    process.exit(signal ? 0 : 1);
  }
}

async function main() {
  await ensureDatabase();
  console.log(`Embedded PostgreSQL is running on localhost:${embeddedPort}`);
  console.log("Press Ctrl+C to stop it.");
}

main().catch(async (error) => {
  console.error("Failed to start embedded PostgreSQL:", error);
  await shutdown();
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
