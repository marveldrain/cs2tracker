import pg from "pg";
import { readFileSync } from "node:fs";
import { config } from "./config.js";
// Remove URI SSL flags so they cannot override certificate verification.
const url = new URL(config.DATABASE_URL);
for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) url.searchParams.delete(key);
export const pool = new pg.Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true, ...(config.DATABASE_CA_PATH ? { ca: readFileSync(config.DATABASE_CA_PATH, "utf8") } : {}) },
  max: config.WORKER_CONCURRENCY + 4,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 30_000,
});
pool.on("error", () => console.error("Idle database connection failed"));
