import express from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import type { Pool } from "pg";
import { z } from "zod";
import { validateDemoUrl } from "./demo-url.js";
import { enqueue, QueueFullError, DuplicateJobError } from "./store.js";

type Dependencies = { pool: Pool; origin: string; trustProxy: number; authenticate: (token: string) => Promise<string | undefined> };
export function createApp({ pool, origin, trustProxy, authenticate }: Dependencies) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", trustProxy);
  app.use(cors({ origin, methods: ["GET", "POST"], allowedHeaders: ["Content-Type", "Authorization"] }));
  app.use(express.json({ limit: "4kb" }));
  app.get("/healthz", async (_req, res) => {
    await pool.query("select 1 from tracker_private.parse_jobs limit 1");
    res.json({ status: "ok" });
  });
  app.use("/api", rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));
  app.use("/api", async (req, res, next) => {
    const match = /^Bearer (.+)$/.exec(req.get("Authorization") ?? "");
    if (!match) { res.status(401).json({ error: "Sign in to import a replay" }); return; }
    const userId = await authenticate(match[1]);
    if (!userId) { res.status(401).json({ error: "Invalid or expired session" }); return; }
    res.locals.userId = userId;
    next();
  });
  app.post("/api/parse-match", rateLimit({ windowMs: 3600_000, limit: 10, keyGenerator: (_req, res) => res.locals.userId, standardHeaders: "draft-8", legacyHeaders: false }), async (req, res) => {
    const body = z.object({ demoUrl: z.string().max(2048) }).strict().safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "Provide a demoUrl string" }); return; }
    let url: URL;
    try { url = validateDemoUrl(body.data.demoUrl); }
    catch { res.status(400).json({ error: "Use a Valve replay URL ending in .dem or .dem.bz2" }); return; }
    try {
      const job = await enqueue(pool, res.locals.userId, url.toString());
      res.status(202).json({ jobId: job.id, status: job.status });
    } catch (error) {
      if (error instanceof QueueFullError) { res.status(429).json({ error: "You already have three active imports" }); return; }
      if (error instanceof DuplicateJobError) { res.status(409).json({ error: "This replay has already been submitted" }); return; }
      throw error;
    }
  });
  app.get("/api/jobs/:id", async (req, res) => {
    if (!z.uuid().safeParse(req.params.id).success) { res.status(400).json({ error: "Invalid job ID" }); return; }
    const { rows } = await pool.query("select id, status, attempts, error, updated_at from tracker_private.parse_jobs where id=$1 and requested_by=$2", [req.params.id, res.locals.userId]);
    if (!rows[0]) { res.status(404).json({ error: "Job not found" }); return; }
    res.set("Cache-Control", "no-store").json(rows[0]);
  });
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 500;
    if (status === 400 || status === 413) { res.status(status).json({ error: "Invalid or oversized request body" }); return; }
    console.error("API request failed");
    res.status(503).json({ error: "Service temporarily unavailable" });
  });
  return app;
}
