import { z } from "zod";
const steamId = z.string().regex(/^7656119\d{10}$/);
const count = z.number().int().nonnegative();
export const parsedDemoSchema = z.object({
  map: z.string().min(1).max(128),
  players: z.array(z.object({ steamId, name: z.string().max(256), kills: count, deaths: count, assists: count, headshots: count })).min(1).max(128),
  chat: z.array(z.object({ steamId, name: z.string().max(256), tick: count, message: z.string().max(4096) })).max(50_000),
});
export type ParsedDemo = z.infer<typeof parsedDemoSchema>;
export type Job = { id: string; demo_url: string; lease_token: string; attempts: number };
