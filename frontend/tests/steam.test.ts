import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSteamInput } from "../lib/steam";
import config from "../next.config";
test("accepts numeric SteamID64, canonical profile URLs and vanity URLs without losing precision", () => {
  const steamId = "76561198000000001";
  assert.deepEqual(parseSteamInput(` ${steamId} `), { steamId });
  assert.deepEqual(parseSteamInput(`https://steamcommunity.com/profiles/${steamId}/?utm_source=test`), { steamId });
  assert.deepEqual(parseSteamInput("https://steamcommunity.com/id/example-name"), { vanity: "example-name" });
  for (const value of ["123", "https://steamcommunity.com.evil.com/id/foo", "https://steamcommunity.com@evil.com/id/foo", "javascript:alert(1)", "https://steamcommunity.com/profiles/123"]) assert.throws(() => parseSteamInput(value));
});
test("short profile redirect is restricted to numeric Steam IDs", async () => {
  const redirects = await config.redirects!();
  assert.deepEqual(redirects, [{ source: "/:steamId(7656119[0-9]{10})", destination: "/players/:steamId", permanent: true }]);
});
