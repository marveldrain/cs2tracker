import { lookup } from "node:dns";
import { createWriteStream } from "node:fs";
import { open } from "node:fs/promises";
import { join } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { Agent, request } from "undici";
import { isPublicAddress, validateDemoUrl } from "./demo-url.js";

export function byteLimit(max: number) {
  let bytes = 0;
  return new Transform({ transform(chunk: Buffer, _encoding, callback) {
    bytes += chunk.length;
    callback(bytes > max ? new Error("Demo exceeds configured size limit") : null, chunk);
  } });
}
export async function downloadDemo(input: string, directory: string): Promise<string> {
  const url = validateDemoUrl(input);
  // Resolve and validate at connection time; redirects are forbidden.
  const dispatcher = new Agent({ connect: { lookup(hostname, options, callback) {
    lookup(hostname, { ...options, all: true }, (error, addresses) => {
      if (error) return callback(error, [], 0);
      if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) {
        return callback(new Error("Replay host resolved to a non-public address"), [], 0);
      }
      if (options.all) callback(null, addresses, 0);
      else callback(null, addresses[0].address, addresses[0].family);
    });
  } } });
  const signal = AbortSignal.timeout(5 * 60_000);
  const compressed = url.pathname.endsWith(".bz2");
  const target = join(directory, compressed ? "download.dem.bz2" : "demo.dem");
  try {
    const response = await request(url, { dispatcher, signal, headersTimeout: 30_000, bodyTimeout: 30_000 });
    if (response.statusCode !== 200) { response.body.destroy(); throw new Error(`Replay download returned ${response.statusCode}`); }
    await pipeline(response.body, byteLimit(512 * 1024 * 1024), createWriteStream(target, { flags: "wx" }), { signal });
  } finally { await dispatcher.close(); }
  const demo = join(directory, "demo.dem");
  if (compressed) {
    const child = spawn("bzip2", ["-dc", target], { stdio: ["ignore", "pipe", "ignore"], signal });
    const finished = once(child, "close");
    try {
      const [, [code]] = await Promise.all([pipeline(child.stdout, byteLimit(2 * 1024 ** 3), createWriteStream(demo, { flags: "wx" }), { signal }), finished]);
      if (code !== 0) throw new Error("Invalid bzip2 replay");
    } finally { if (child.exitCode === null) child.kill("SIGKILL"); }
  }
  const file = await open(demo, "r");
  try {
    const header = Buffer.alloc(8);
    await file.read(header, 0, 8, 0);
    if (!header.equals(Buffer.from("PBDEMS2\0"))) throw new Error("Expected a CS2 Source 2 demo");
  } finally { await file.close(); }
  return demo;
}
