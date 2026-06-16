// Bridges the project's DB_URL env var to DATABASE_URL (which node-pg-migrate
// expects by default) and invokes the node-pg-migrate CLI, forwarding all
// arguments. Usage: node scripts/run-migrations.js <up|down|create|...> [args]
require("dotenv").config();

const path = require("path");
const { spawnSync } = require("child_process");

const dbUrl = process.env.DB_URL;
if (!dbUrl || dbUrl.trim() === "") {
  console.error(
    "DB_URL is not set. Define it in .env (Neon connection string, " +
      "must include ?sslmode=require)."
  );
  process.exit(1);
}

// Ensure SSL is requested (Neon requires it). Append sslmode=require if absent.
let connectionString = dbUrl;
try {
  const u = new URL(dbUrl);
  if (u.searchParams.get("sslmode") !== "require") {
    u.searchParams.set("sslmode", "require");
    connectionString = u.toString();
    console.warn(
      "[migrate] DB_URL had no sslmode=require; added it for the Neon connection."
    );
  }
} catch (e) {
  console.warn(
    "[migrate] Could not parse DB_URL as a URL; using it verbatim. " +
      "Ensure it includes ?sslmode=require."
  );
}

// node-pg-migrate reads DATABASE_URL by default.
process.env.DATABASE_URL = connectionString;

// Resolve the node-pg-migrate CLI entry from its own package.json so this
// works across 7.x versions regardless of the bin filename, and without
// relying on the platform-specific .bin shim (this repo runs on Windows).
let binPath;
try {
  const pkgJsonPath = require.resolve("node-pg-migrate/package.json");
  const pkg = require("node-pg-migrate/package.json");
  let bin = pkg.bin;
  if (bin && typeof bin === "object") bin = bin["node-pg-migrate"];
  binPath = path.join(path.dirname(pkgJsonPath), bin);
} catch (e) {
  console.error("node-pg-migrate is not installed. Run `npm install` first.");
  process.exit(1);
}

const args = process.argv.slice(2);
const result = spawnSync(process.execPath, [binPath, ...args], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error("[migrate] failed to start node-pg-migrate:", result.error);
  process.exit(1);
}
process.exit(result.status === null ? 1 : result.status);
