"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { mapLabel, selectMatches, summarize, type Chat, type Stats } from "@/lib/dashboard-model";

type Props = { stats: Stats[]; chat: Chat[]; steamId?: string; sample?: boolean; children?: ReactNode };
export function PlayerDashboard({ stats, chat, steamId, sample = false, children }: Props) {
  const [map, setMap] = useState("all");
  const [tab, setTab] = useState<"matches" | "chat">("matches");
  const [query, setQuery] = useState("");
  const selected = selectMatches(stats, map);
  const totals = summarize(selected);
  const maps = [...new Set(stats.map(row => row.map_name).filter((name): name is string => Boolean(name)))];
  const selectedIds = new Set(selected.map(row => row.match_id));
  const messages = chat.filter(row => (map === "all" || selectedIds.has(row.match_id)) && row.message.toLowerCase().includes(query.toLowerCase()));
  const chronological = selected.slice(0, 12).toReversed();
  const maxKills = Math.max(1, ...chronological.flatMap(row => [row.kills, row.deaths]));
  const name = stats[0]?.player_name ?? "Untracked player";

  return <div className="stack dashboard">
    {sample && <aside className="sample-notice"><span className="status-dot" /><div><strong>Interactive sample</strong><span>Fictional player, match stats, and chat. Explore the filters and tabs.</span></div><Link href="/#player-search">Find a real player ↗</Link></aside>}
    <div className="profile-heading">
      <div className="profile-identity"><div className="avatar" aria-hidden="true">{name.slice(0, 2).toUpperCase()}</div><div><span className="eyebrow">PLAYER INTELLIGENCE</span><h1>{name}</h1>{steamId ? <a className="muted small" href={`https://steamcommunity.com/profiles/${steamId}`} target="_blank" rel="noreferrer">{steamId} ↗</a> : <span className="muted small">Sample profile · Counter-Strike 2</span>}</div></div>
      <div className="filter"><label htmlFor="map-filter">Map</label><select id="map-filter" value={map} onChange={event => setMap(event.target.value)}><option value="all">All maps</option>{maps.map(name => <option key={name} value={name}>{mapLabel(name)}</option>)}</select></div>
    </div>
    <p className="muted small">{selected.length} {sample ? "sample" : "imported"} matches shown · {sample ? "Illustrative data" : "Latest 100 imports; dates reflect import time"}</p>
    <div className="metrics">{[["TOTAL KILLS", totals.kills, `${selected.length} matches`], ["K / D RATIO", totals.kd, "Kills per death"], ["HEADSHOTS", totals.headshotRate, `${totals.headshots} headshot kills`], ["ASSISTS", totals.assists, "Setting up the team"], ["DEATHS", totals.deaths, "Across selected matches"]].map(([label, value, caption]) => <article className="panel metric" key={label}><span className="metric-label">{label}</span><strong>{value}</strong><span className="muted small">{caption}</span></article>)}</div>
    <section className="panel performance"><div className="section-heading"><div><span className="eyebrow">THE BIGGER PICTURE</span><h2>Recent performance</h2></div><div className="chart-legend"><span><i className="kill-key" />Kills</span><span><i className="death-key" />Deaths</span></div></div>
      {chronological.length ? <><div className="performance-chart" role="img" aria-label={`Kills and deaths over ${chronological.length} matches, oldest to newest. Exact values are available in Match history.`}>{chronological.map((row, index) => <div className="chart-column" key={row.match_id}><div className="bars"><div className="bar kills" style={{ height: `${row.kills / maxKills * 100}%` }} title={`${row.kills} kills`} /><div className="bar deaths" style={{ height: `${row.deaths / maxKills * 100}%` }} title={`${row.deaths} deaths`} /></div><span>{String(index + 1).padStart(2, "0")}</span></div>)}</div><div className="chart-caption muted small"><span>Oldest shown</span><span>Latest import</span></div></> : <p className="muted">Import a replay to see performance over time.</p>}
    </section>
    <section className="panel records"><div className="record-tabs" role="tablist" aria-label="Player records" onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? "matches" : event.key === "End" ? "chat" : tab === "matches" ? "chat" : "matches";
      setTab(next);
      document.getElementById(`${next}-tab`)?.focus();
    }}><button id="matches-tab" role="tab" tabIndex={tab === "matches" ? 0 : -1} aria-selected={tab === "matches"} aria-controls="matches-panel" onClick={() => setTab("matches")}>Match history <span>{selected.length}</span></button><button id="chat-tab" role="tab" tabIndex={tab === "chat" ? 0 : -1} aria-selected={tab === "chat"} aria-controls="chat-panel" onClick={() => setTab("chat")}>Chat history <span>{messages.length}</span></button></div>
      <div id="matches-panel" role="tabpanel" aria-labelledby="matches-tab" hidden={tab !== "matches"}>
        {selected.length ? <div className="table-wrap"><table><thead><tr><th>Map / match</th><th>Imported (UTC)</th><th>Kills</th><th>Deaths</th><th>Assists</th><th>K/D</th><th>Headshots</th></tr></thead><tbody>{selected.map(row => <tr key={row.match_id}><td><div className="map-cell"><span className={`map-tile map-${row.map_name ?? "unknown"}`} aria-hidden="true">{mapLabel(row.map_name).slice(0, 1)}</span><div><strong>{mapLabel(row.map_name)}</strong><small className="muted" title={row.match_id}>{row.match_id.slice(0, 10)}</small></div></div></td><td>{row.imported_at.slice(0, 10)}</td><td className="emphasis">{row.kills}</td><td>{row.deaths}</td><td>{row.assists}</td><td>{row.deaths ? (row.kills / row.deaths).toFixed(2) : "—"}</td><td>{row.headshots}</td></tr>)}</tbody></table></div> : <p className="empty-state muted">No matches found. Add a replay to get started.</p>}
      </div>
      <div id="chat-panel" role="tabpanel" aria-labelledby="chat-tab" hidden={tab !== "chat"}><div className="chat-toolbar"><p className="muted small">{sample ? "Sample messages" : "Latest 200 recorded messages by this player"}. Ticks are relative to each demo.</p><label htmlFor="chat-search" className="sr-only">Search chat messages</label><input id="chat-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search messages…" /></div>{messages.length ? <ol className="chat">{messages.map(row => <li key={`${row.match_id}:${row.sequence}`}><div className="chat-avatar" aria-hidden="true">{row.player_name.slice(0, 1)}</div><div><div className="small"><strong>{row.player_name}</strong><span className="muted"> · {row.match_id.slice(0, 10)} · Tick {row.tick.toLocaleString("en-US")}</span></div><p>{row.message}</p></div></li>)}</ol> : <p className="empty-state muted">{query ? "No messages match your search." : "No recorded chat found for this selection."}</p>}</div>
    </section>
    {children}
    {sample && <section className="panel demo-next"><div><span className="eyebrow">BRING YOUR OWN GAME</span><h2>Turn a replay into a player record.</h2><p className="muted">Search for a Steam profile, then import a Valve demo to build a real match history.</p></div><Link className="button-link" href="/#player-search">Find a player →</Link></section>}
  </div>;
}
