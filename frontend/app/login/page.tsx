"use client";
import { useEffect, useState } from "react";
import { browserDatabase } from "@/lib/supabase-browser";
export default function Login() {
  const [status, setStatus] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      const db = browserDatabase();
      void db.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
      const { data } = db.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
      return () => data.subscription.unsubscribe();
    } catch { setStatus("Sign-in is not configured yet."); }
  }, []);
  return <section className="panel login stack"><span className="eyebrow">REPLAY IMPORTS</span><h1>Sign in</h1><p className="muted">Player records are public. Sign in with your invited email address to submit a replay.</p>
    {signedIn ? <><p>You’re signed in. Return to a player page to import a replay.</p><button onClick={async () => { await browserDatabase().auth.signOut(); setSignedIn(false); }}>Sign out</button></> : <form className="stack" onSubmit={async event => {
      event.preventDefault(); setBusy(true);
      const email = String(new FormData(event.currentTarget).get("email"));
      try {
        const { error } = await browserDatabase().auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/login`, shouldCreateUser: false } });
        setStatus(error ? "Could not send a sign-in link. Check your email and invitation." : "Check your email for a sign-in link.");
      } catch { setStatus("Sign-in is unavailable. Please try again."); }
      finally { setBusy(false); }
    }}><label htmlFor="email">Email address</label><input id="email" type="email" name="email" required autoComplete="email" /><button disabled={busy}>{busy ? "Sending…" : "Email me a sign-in link"}</button></form>}
    <p role="status">{status}</p>
  </section>;
}
