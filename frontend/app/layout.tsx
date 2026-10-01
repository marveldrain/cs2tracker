import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = { title: "CS2 Tracker", description: "Player performance and chat from Counter-Strike 2 replays" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><header className="shell nav"><Link className="brand" href="/">CS2<span>TRACKER</span></Link><nav aria-label="Main navigation"><Link href="/demo">Explore sample</Link><Link href="/login">Sign in</Link></nav></header><main className="shell">{children}</main><footer className="shell muted small">Counter-Strike 2 · Community replay records · Not affiliated with Valve</footer></body></html>;
}
