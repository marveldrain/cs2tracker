import Link from "next/link";
import { notFound } from "next/navigation";
import { isSteamId } from "@/lib/steam";
import { getDashboard } from "@/lib/dashboard";
import { ParseForm } from "@/components/parse-form";
import { PlayerDashboard } from "@/components/player-dashboard";
export const dynamic = "force-dynamic";
export default async function Player({ params }: { params: Promise<{ steamId: string }> }) {
  const { steamId } = await params;
  if (!isSteamId(steamId)) notFound();
  let data: Awaited<ReturnType<typeof getDashboard>>;
  try { data = await getDashboard(steamId); }
  catch { return <section className="panel unavailable stack"><span className="eyebrow">PLAYER RECORDS</span><h1>Records are unavailable right now.</h1><p className="muted">Please try again shortly. You can still explore the sample dashboard.</p><Link className="button-link" href="/demo">Explore the sample →</Link></section>; }
  return <PlayerDashboard {...data} steamId={steamId}><ParseForm steamId={steamId} /></PlayerDashboard>;
}
