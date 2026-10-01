"use server";
import { redirect } from "next/navigation";
import { isSteamId, parseSteamInput } from "@/lib/steam";
export async function findPlayer(_previous: string, data: FormData): Promise<string> {
  let steamId: string;
  try {
    const raw = data.get("profile");
    if (typeof raw !== "string" || raw.length > 2048) return "Enter a Steam profile URL or SteamID64.";
    const parsed = parseSteamInput(raw);
    if ("steamId" in parsed) steamId = parsed.steamId;
    else {
      const key = process.env.STEAM_WEB_API_KEY;
      if (!key) return "Custom profile URLs need Steam API configuration. Use your numeric SteamID64 instead.";
      const url = new URL("https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/");
      url.search = new URLSearchParams({ key, vanityurl: parsed.vanity }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" });
      if (!response.ok) return "Steam lookup is unavailable. Try your numeric SteamID64.";
      const result = await response.json();
      if (result.response?.success !== 1 || !isSteamId(result.response.steamid ?? "")) return "Steam profile not found.";
      steamId = result.response.steamid;
    }
  } catch (error) { return error instanceof Error && error.message.startsWith("Use ") ? error.message : "Could not resolve that profile. Try a SteamID64 or a full Steam profile URL."; }
  redirect(`/players/${steamId}`);
}
