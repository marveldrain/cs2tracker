import { notFound } from "next/navigation";
import { isSteamId } from "@/lib/steam";
import { getDashboard } from "@/lib/dashboard";
import { ParseForm } from "@/components/parse-form";
export const dynamic = "force-dynamic";
export default async function Player({ params }: { params: Promise<{ steamId: string }> }) {
  const { steamId } = await params;
  if (!isSteamId(steamId)) notFound();
  let data: Awaited<ReturnType<typeof getDashboard>>;
  try { data = await getDashboard(steamId); }
  catch { return <section className="panel"><h1>Player records unavailable</h1><p>We couldn’t reach the database. Please try again shortly.</p></section>; }
  const { stats, chat } = data;
  const total = stats.reduce((sum, row) => ({ kills: sum.kills + row.kills, deaths: sum.deaths + row.deaths, assists: sum.assists + row.assists, headshots: sum.headshots + row.headshots }), { kills: 0, deaths: 0, assists: 0, headshots: 0 });
  return <div className="stack dashboard"><div><span className="eyebrow">PLAYER OVERVIEW</span><h1>{stats[0]?.player_name ?? "Untracked player"}</h1><a className="muted" href={`https://steamcommunity.com/profiles/${steamId}`} target="_blank" rel="noreferrer">{steamId} ↗</a></div>
    <p className="muted">Totals from the latest {stats.length} imported matches (up to 100). Import dates are shown, not match dates.</p>
    <div className="metrics">{[["Kills", total.kills], ["Deaths", total.deaths], ["Assists", total.assists], ["K/D", total.deaths ? (total.kills / total.deaths).toFixed(2) : "—"], ["Headshots", total.kills ? `${(total.headshots / total.kills * 100).toFixed(0)}%` : "—"]].map(([label, value]) => <article className="panel" key={label}><span className="muted">{label}</span><strong>{value}</strong></article>)}</div>
    <ParseForm steamId={steamId} />
    <section className="panel"><h2>Match performance</h2>{stats.length ? <div className="table-wrap"><table><thead><tr><th>Imported (UTC)</th><th>Match</th><th>Kills</th><th>Deaths</th><th>Assists</th><th>Headshots</th></tr></thead><tbody>{stats.map(row => <tr key={row.match_id}><td>{row.imported_at.slice(0, 10)}</td><td title={row.match_id}>{row.match_id.slice(0, 8)}</td><td>{row.kills}</td><td>{row.deaths}</td><td>{row.assists}</td><td>{row.headshots}</td></tr>)}</tbody></table></div> : <p className="muted">No matches imported for this player yet. Add a replay above to get started.</p>}</section>
    <section className="panel"><h2>Chat history</h2><p className="muted">Latest 200 recorded messages by this player. Tick values are relative to each demo.</p>{chat.length ? <ol className="chat">{chat.map(row => <li key={`${row.match_id}:${row.sequence}`}><div className="small muted">Match {row.match_id.slice(0, 8)} · Tick {row.tick} · {row.player_name}</div><p>{row.message}</p></li>)}</ol> : <p className="muted">No recorded chat found for this player.</p>}</section>
  </div>;
}
