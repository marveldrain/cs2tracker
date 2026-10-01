import type { Metadata } from "next";
import { PlayerDashboard } from "@/components/player-dashboard";
import { sampleChat, sampleStats } from "@/lib/sample-dashboard";
export const metadata: Metadata = { title: "Sample dashboard · CS2 Tracker", description: "Explore an interactive CS2 Tracker dashboard with clearly labeled fictional match and chat data." };
export default function Demo() {
  return <PlayerDashboard stats={sampleStats} chat={sampleChat} sample />;
}
