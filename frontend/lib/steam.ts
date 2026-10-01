export const isSteamId = (input: string) => /^7656119\d{10}$/.test(input);
export function parseSteamInput(raw: string): { steamId: string } | { vanity: string } {
  const value = raw.trim();
  if (isSteamId(value)) return { steamId: value };
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Enter a SteamID64 or a full Steam Community profile URL."); }
  if (!['https:', 'http:'].includes(url.protocol) || !['steamcommunity.com', 'www.steamcommunity.com'].includes(url.hostname) || url.username || url.password || url.port) {
    throw new Error("Use a steamcommunity.com profile URL.");
  }
  const match = /^\/(profiles|id)\/([a-zA-Z0-9_-]+)\/?$/.exec(url.pathname);
  if (match?.[1] === "profiles" && isSteamId(match[2])) return { steamId: match[2] };
  if (match?.[1] === "id") return { vanity: match[2] };
  throw new Error("Use /profiles/<SteamID64> or /id/<custom-name>.");
}
