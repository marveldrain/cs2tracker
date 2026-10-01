import type { Chat, Stats } from "./dashboard-model";
// Fictional presentation fixtures. Never inserted into the database or associated with a Steam account.
export const sampleName = "Aster";
export const sampleStats: Stats[] = [
  { match_id: "sample-006", player_name: sampleName, map_name: "de_mirage", kills: 28, deaths: 14, assists: 7, headshots: 17, imported_at: "2026-09-30T20:30:00Z" },
  { match_id: "sample-005", player_name: sampleName, map_name: "de_inferno", kills: 22, deaths: 16, assists: 9, headshots: 12, imported_at: "2026-09-29T19:00:00Z" },
  { match_id: "sample-004", player_name: sampleName, map_name: "de_ancient", kills: 19, deaths: 18, assists: 5, headshots: 9, imported_at: "2026-09-28T18:15:00Z" },
  { match_id: "sample-003", player_name: sampleName, map_name: "de_mirage", kills: 26, deaths: 17, assists: 6, headshots: 15, imported_at: "2026-09-27T21:45:00Z" },
  { match_id: "sample-002", player_name: sampleName, map_name: "de_nuke", kills: 16, deaths: 19, assists: 8, headshots: 7, imported_at: "2026-09-26T20:00:00Z" },
  { match_id: "sample-001", player_name: sampleName, map_name: "de_inferno", kills: 21, deaths: 17, assists: 4, headshots: 10, imported_at: "2026-09-25T19:30:00Z" },
];
export const sampleChat: Chat[] = [
  { match_id: "sample-006", sequence: 3, player_name: sampleName, tick: 82120, message: "gg, that last retake was clean", imported_at: "2026-09-30T20:30:00Z" },
  { match_id: "sample-006", sequence: 2, player_name: sampleName, tick: 63744, message: "I can flash over mid. Ready?", imported_at: "2026-09-30T20:30:00Z" },
  { match_id: "sample-006", sequence: 1, player_name: sampleName, tick: 41920, message: "Nice trade. Let's keep the pace.", imported_at: "2026-09-30T20:30:00Z" },
  { match_id: "sample-005", sequence: 1, player_name: sampleName, tick: 58496, message: "Saving this one, full buy next round", imported_at: "2026-09-29T19:00:00Z" },
  { match_id: "sample-004", sequence: 1, player_name: sampleName, tick: 32256, message: "Two on B, we have time to rotate", imported_at: "2026-09-28T18:15:00Z" },
];
