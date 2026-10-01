import ipaddr from "ipaddr.js";
export function validateDemoUrl(input: string): URL {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port ||
      !/^replay\d+\.valve\.net$/.test(url.hostname) ||
      !/^\/730\/[a-zA-Z0-9_-]+\.dem(?:\.bz2)?$/.test(url.pathname) || url.search || url.hash) {
    throw new Error("Use a Valve replay URL: http(s)://replay<number>.valve.net/730/<file>.dem[.bz2]");
  }
  return url;
}
export function isPublicAddress(address: string): boolean {
  try { return ipaddr.process(address).range() === "unicast"; } catch { return false; }
}
