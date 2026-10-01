export type Stats = {
  match_id: string;
  player_name: string;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  imported_at: string;
  map_name?: string;
};
export type Chat = {
  match_id: string;
  sequence: number;
  player_name: string;
  tick: number;
  message: string;
  imported_at: string;
};
export function summarize(stats: Stats[]) {
  const total = stats.reduce((sum, row) => ({
    kills: sum.kills + row.kills, deaths: sum.deaths + row.deaths,
    assists: sum.assists + row.assists, headshots: sum.headshots + row.headshots,
  }), { kills: 0, deaths: 0, assists: 0, headshots: 0 });
  return {
    ...total,
    kd: total.deaths ? (total.kills / total.deaths).toFixed(2) : "—",
    headshotRate: total.kills ? `${Math.round(total.headshots / total.kills * 100)}%` : "—",
  };
}
export function selectMatches(stats: Stats[], map: string) {
  return map === "all" ? stats : stats.filter(row => row.map_name === map);
}
export function mapLabel(map?: string) {
  return map ? map.replace(/^(de|cs)_/, "").replace(/^./, letter => letter.toUpperCase()) : "Unknown map";
}
