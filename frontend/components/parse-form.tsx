"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { browserDatabase } from "@/lib/supabase-browser";
export function ParseForm({ steamId }: { steamId: string }) {
  const router = useRouter();
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [resume, setResume] = useState(0);
  const storageKey = `cs2-job:${steamId}`;
  useEffect(() => { setJobId(localStorage.getItem(storageKey) ?? ""); }, [storageKey]);
  async function api(path: string, init: RequestInit = {}) {
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) throw new Error("The import service is not configured.");
    const { data } = await browserDatabase().auth.getSession();
    if (!data.session) throw new Error("Sign in before importing or checking a replay.");
    const response = await fetch(`${base.replace(/\/$/, "")}${path}`, { ...init,
      signal: init.signal ?? AbortSignal.timeout(15_000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Import service unavailable. Try again shortly.");
    return body;
  }
  useEffect(() => {
    if (!jobId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const job = await api(`/api/jobs/${jobId}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
        if (controller.signal.aborted) return;
        setStatus(job.status === "failed" ? job.error : `Import ${job.status} (attempt ${job.attempts}/3).`);
        if (job.status === "completed" || job.status === "failed") {
          localStorage.removeItem(storageKey);
          setJobId("");
          if (job.status === "completed") router.refresh();
        } else timer = setTimeout(poll, 3000);
      } catch (error) { if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : "Could not check import."); }
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  // api uses only build-time config and the current Supabase session.
  }, [jobId, storageKey, router, resume]);
  return <section className="panel stack">
    <div><span className="eyebrow">ADD A REPLAY</span><h2>Import a match</h2></div>
    <p className="muted">Paste a Valve replay download URL to add its players and recorded chat. <Link href="/login">Sign in</Link> to import.</p>
    <form className="stack" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setStatus("Submitting…");
      const form = event.currentTarget;
      try {
        const job = await api("/api/parse-match", { method: "POST", body: JSON.stringify({ demoUrl: new FormData(form).get("demoUrl") }) });
        localStorage.setItem(storageKey, job.jobId); setJobId(job.jobId); setResume(value => value + 1); setStatus(`Import ${job.status}.`);
      } catch (error) { setStatus(error instanceof Error ? error.message : "Could not submit replay."); }
      finally { setBusy(false); }
    }}>
      <label htmlFor="demoUrl">Valve demo URL</label>
      <div className="input-row"><input id="demoUrl" name="demoUrl" type="url" required maxLength={2048} placeholder="http://replay123.valve.net/730/…dem.bz2" /><button disabled={busy || Boolean(jobId)}>{busy ? "Submitting…" : "Import replay"}</button></div>
    </form>
    <p role="status">{status}</p>
    {jobId && <div className="muted">Job {jobId} <button className="secondary" onClick={() => setResume(value => value + 1)}>Check status</button></div>}
    <p className="muted small">Only messages present in the demo can be recovered. Importing does not discover a player’s match history automatically.</p>
  </section>;
}
