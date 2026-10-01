import { fork } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { Pool } from "pg";
import { parsedDemoSchema, type ParsedDemo, type Job } from "./model.js";
import { claim, fail, save } from "./store.js";

async function execute(job: Job, signal: AbortSignal): Promise<ParsedDemo> {
  const directory = await mkdtemp(join(tmpdir(), "cs2-demo-"));
  try {
    return await new Promise<ParsedDemo>((resolve, reject) => {
      const child = fork(new URL("./job-runner.js", import.meta.url), [], {
        detached: true, stdio: ["ignore", "ignore", "ignore", "ipc"],
        // No database or Supabase credentials in the native parsing process.
        env: { PATH: process.env.PATH, NODE_ENV: "production", RAYON_NUM_THREADS: "2" },
      });
      let result: ParsedDemo | undefined;
      let stopped = false;
      const stop = () => {
        stopped = true;
        try { if (child.pid) process.kill(-child.pid, "SIGKILL"); } catch { /* process already exited */ }
      };
      const timer = setTimeout(stop, 10 * 60_000);
      signal.addEventListener("abort", stop, { once: true });
      if (signal.aborted) stop();
      child.on("message", (message: unknown) => {
        if (message && typeof message === "object" && "ok" in message && message.ok && "result" in message) {
          const parsed = parsedDemoSchema.safeParse(message.result);
          if (parsed.success) result = parsed.data;
        }
      });
      const cleanup = () => { clearTimeout(timer); signal.removeEventListener("abort", stop); };
      child.once("error", () => { cleanup(); reject(new Error("Parser process could not start")); });
      child.once("exit", code => {
        cleanup();
        if (!stopped && code === 0 && result) resolve(result);
        else reject(new Error("Parser process failed or timed out"));
      });
      child.send({ url: job.demo_url, directory }, error => { if (error) stop(); });
    });
  } finally { await rm(directory, { recursive: true, force: true }); }
}
export async function worker(pool: Pool, signal: AbortSignal) {
  while (!signal.aborted) {
    let job: Job | undefined;
    try {
      job = await claim(pool);
      if (job) await save(pool, job, await execute(job, signal));
    } catch {
      console.error("Parse worker operation failed", job ? { jobId: job.id, attempt: job.attempts } : {});
      if (job) await fail(pool, job).catch(() => console.error("Could not update job; lease recovery will retry"));
    }
    if (!signal.aborted) await delay(2000, undefined, { signal }).catch(() => {});
  }
}
