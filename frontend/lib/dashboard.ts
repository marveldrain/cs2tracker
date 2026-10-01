import "server-only";
import { createClient } from "@supabase/supabase-js";
export type Stats = { match_id: string; player_name: string; kills: number; deaths: number; assists: number; headshots: number; imported_at: string };
export type Chat = { match_id: string; sequence: number; player_name: string; tick: number; message: string; imported_at: string };
export async function getDashboard(steamId: string): Promise<{ stats: Stats[]; chat: Chat[] }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Database not configured");
  const db = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(10_000) }) } });
  const [stats, chat] = await Promise.all([
    db.from("player_stats").select("match_id,player_name,kills,deaths,assists,headshots,imported_at").eq("steam_id", steamId).order("imported_at", { ascending: false }).order("match_id").limit(100),
    db.from("chat_messages").select("match_id,sequence,player_name,tick,message,imported_at").eq("steam_id", steamId).order("imported_at", { ascending: false }).order("sequence", { ascending: false }).order("match_id").limit(200),
  ]);
  if (stats.error || chat.error) throw new Error("Could not load player records");
  return { stats: stats.data, chat: chat.data };
}
