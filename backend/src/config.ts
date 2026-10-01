import { z } from "zod";
export const config = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  DATABASE_CA_PATH: z.string().optional(),
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  FRONTEND_ORIGIN: z.url().transform(value => new URL(value).origin),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(4).default(1),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(2).default(0),
}).parse(process.env);
