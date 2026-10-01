import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Stats, Chat } from "./dashboard-model";
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
  if (!stats.data.length) return { stats: [], chat: chat.data };
  const matches = await db.from("matches").select("id,map_name").in("id", stats.data.map(row => row.match_id));
  if (matches.error) throw new Error("Could not load match maps");
  const maps = new Map(matches.data.map(row => [row.id, row.map_name]));
  return { stats: stats.data.map(row => ({ ...row, map_name: maps.get(row.match_id) })), chat: chat.data };
}
