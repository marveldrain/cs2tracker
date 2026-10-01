"use client";
import { useActionState } from "react";
import { findPlayer } from "@/app/actions";
export function SearchForm() {
  const [error, action, pending] = useActionState(findPlayer, "");
  return <form action={action} className="stack">
    <label htmlFor="profile">Steam profile URL or SteamID64</label>
    <div className="input-row"><input id="profile" name="profile" required maxLength={2048} placeholder="https://steamcommunity.com/profiles/7656119…" /><button disabled={pending}>{pending ? "Searching…" : "Find player →"}</button></div>
    <p className="muted">Search by numeric ID, /profiles/ URL, or custom /id/ URL.</p>
    <p role="status" className="error">{error}</p>
  </form>;
}
