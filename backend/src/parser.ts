// @opensafe/demofile was not available from public npm. Keep the replacement isolated here.
import { parseEvent, parseHeader, parseTicks } from "@laihoe/demoparser2";
import { parsedDemoSchema, type ParsedDemo } from "./model.js";

type Row = Record<string, unknown>;
function rows(value: unknown): Row[] {
  if (!Array.isArray(value) || value.some(row => !row || typeof row !== "object")) throw new Error("Unexpected parser output");
  return value;
}
export function normalizeDemo(header: Row, scoreboard: Row[], chat: Row[]): ParsedDemo {
  // Only Steam users; bots/spectators with no SteamID are omitted. Never convert IDs to Number.
  const humans = (id: unknown): id is string => typeof id === "string" && /^7656119\d{10}$/.test(id);
  return parsedDemoSchema.parse({
    map: header.map_name,
    players: scoreboard.filter(row => humans(row.steamid)).map(row => ({
      steamId: row.steamid, name: row.name, kills: row.kills_total,
      deaths: row.deaths_total, assists: row.assists_total, headshots: row.headshot_kills_total,
    })),
    chat: chat.filter(row => humans(row.user_steamid)).map(row => ({
      steamId: row.user_steamid, name: row.user_name, tick: row.tick, message: row.chat_message,
    })),
  });
}
export function parseDemo(path: string): ParsedDemo {
  const ends = rows(parseEvent(path, "round_end"));
  const tick = ends.reduce((max, event) => typeof event.tick === "number" ? Math.max(max, event.tick) : max, -1);
  if (tick < 0) throw new Error("Demo has no completed rounds");
  const scoreboard = rows(parseTicks(path, ["kills_total", "deaths_total", "assists_total", "headshot_kills_total"], [tick]));
  return normalizeDemo(parseHeader(path), scoreboard, rows(parseEvent(path, "chat_message")));
}
