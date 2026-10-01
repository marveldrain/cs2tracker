import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";
import { pool } from "./database.js";
import { createApp } from "./app.js";
import { worker } from "./worker.js";
const auth = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const app = createApp({ pool, origin: config.FRONTEND_ORIGIN, trustProxy: config.TRUST_PROXY_HOPS,
  authenticate: async token => { const { data, error } = await auth.auth.getUser(token); return error ? undefined : data.user?.id; },
});
await pool.query("select id from tracker_private.parse_jobs limit 1");
const controller = new AbortController();
const server = app.listen(config.PORT, "0.0.0.0", () => console.log(`API listening on port ${config.PORT}`));
const workers = Array.from({ length: config.WORKER_CONCURRENCY }, () => worker(pool, controller.signal));
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  controller.abort();
  const deadline = setTimeout(() => process.exit(1), 25_000).unref();
  await Promise.all([new Promise<void>(resolve => server.close(() => resolve())), ...workers]);
  await pool.end();
  clearTimeout(deadline);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
