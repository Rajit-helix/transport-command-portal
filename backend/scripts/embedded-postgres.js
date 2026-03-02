import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs/promises";
import path from "node:path";

const pg = new EmbeddedPostgres({
  databaseDir: "./.embedded-postgres/data",
  user: "postgres",
  password: "postgres",
  port: 5432,
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
  console.log("Embedded PostgreSQL is running on localhost:5432");
  console.log("Press Ctrl+C to stop it.");
}

main().catch(async (error) => {
  console.error("Failed to start embedded PostgreSQL:", error);
  await shutdown();
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
