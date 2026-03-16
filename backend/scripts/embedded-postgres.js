import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs/promises";
import path from "node:path";

function resolveEmbeddedPort() {
  const parsed = Number(process.env.EMBEDDED_PG_PORT || "5432");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 5432;
}

const embeddedPort = resolveEmbeddedPort();
const DATA_DIR = path.resolve(".embedded-postgres/data");
const POSTMASTER_PID = path.join(DATA_DIR, "postmaster.pid");
const POSTMASTER_OPTS = path.join(DATA_DIR, "postmaster.opts");

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

async function clearStalePostmasterPid() {
  try {
    const raw = await fs.readFile(POSTMASTER_PID, "utf8");
    const pidLine = raw.split(/\r?\n/)[0];
    const pid = Number(pidLine);
    if (!Number.isInteger(pid) || pid <= 0) {
      return;
    }

    try {
      process.kill(pid, 0);
      return;
    } catch (error) {
      if (error?.code !== "ESRCH") {
        return;
      }
    }

    await fs.rm(POSTMASTER_PID, { force: true });
    await fs.rm(POSTMASTER_OPTS, { force: true });
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.error("Failed to inspect postmaster.pid:", error);
    }
  }
}

async function ensureDatabase() {
  const pgVersionFile = path.join(DATA_DIR, "PG_VERSION");
  try {
    await fs.access(pgVersionFile);
  } catch {
    await pg.initialise();
  }
  await clearStalePostmasterPid();
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
