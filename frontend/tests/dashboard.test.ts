import { test } from "node:test";
import assert from "node:assert/strict";
import { selectMatches, summarize, type Stats } from "../lib/dashboard-model";
const stats: Stats[] = [
  { match_id: "1", player_name: "Test", map_name: "de_mirage", kills: 20, deaths: 10, assists: 5, headshots: 10, imported_at: "2026-09-30" },
  { match_id: "2", player_name: "Test", map_name: "de_inferno", kills: 5, deaths: 20, assists: 3, headshots: 1, imported_at: "2026-09-29" },
];
test("dashboard calculates ratios from totals instead of averaging per-match ratios", () => {
  assert.deepEqual(summarize(stats), { kills: 25, deaths: 30, assists: 8, headshots: 11, kd: "0.83", headshotRate: "44%" });
});
test("map filters update the cohort without changing original results", () => {
  assert.deepEqual(selectMatches(stats, "de_mirage"), [stats[0]]);
  assert.equal(summarize(selectMatches(stats, "de_mirage")).kd, "2.00");
  assert.equal(selectMatches(stats, "all").length, 2);
  assert.equal(selectMatches(stats, "de_nuke").length, 0);
  assert.equal(stats.length, 2);
});
test("empty or zero-denominator results do not show fabricated rates", () => {
  assert.equal(summarize([]).kd, "—");
  assert.equal(summarize([]).headshotRate, "—");
  assert.equal(summarize([{ ...stats[0], deaths: 0 }]).kd, "—");
});
