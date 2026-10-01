import type { NextConfig } from "next";
const config: NextConfig = {
  async redirects() {
    return [{ source: "/:steamId(7656119[0-9]{10})", destination: "/players/:steamId", permanent: true }];
  },
};
export default config;
