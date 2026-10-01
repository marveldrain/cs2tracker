import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { validateDemoUrl, isPublicAddress } from "../src/demo-url.js";
import { byteLimit } from "../src/download.js";
import { normalizeDemo } from "../src/parser.js";
import { claim, enqueue, fail, save, DuplicateJobError, QueueFullError } from "../src/store.js";
import { createApp } from "../src/app.js";

const alice = "10000000-0000-4000-8000-000000000001";
const bob = "10000000-0000-4000-8000-000000000002";
const replay = "http://replay123.valve.net/730/example.dem.bz2";
const result = { map: "de_test", players: [{ steamId: "76561198000000001", name: "Test player", kills: 12, deaths: 8, assists: 3, headshots: 4 }], chat: [{ steamId: "76561198000000001", name: "Test player", tick: 100, message: "<script>chat is text</script>" }] };
async function database() {
  const db = new PGlite();
  await db.exec("create role anon; create role authenticated;");
  await db.exec(await readFile(new URL("../db/001_initial.sql", import.meta.url), "utf8"));
  const query = async (sql: string, params?: unknown[]) => {
    const value = await db.query(sql, params);
    return { ...value, rowCount: value.rows.length || value.affectedRows || 0 };
  };
  const pool = { query, connect: async () => ({ query, release() {} }) } as unknown as Pool;
  return { db, pool };
}
test("rejects arbitrary hosts, credentials, ports, redirects encoded as paths and private addresses", () => {
  assert.equal(validateDemoUrl(replay).hostname, "replay123.valve.net");
  for (const url of ["http://localhost/a.dem", "http://replay1.valve.net.evil.com/730/a.dem", "https://user:pass@replay1.valve.net/730/a.dem", "http://replay1.valve.net:3000/730/a.dem", "http://replay1.valve.net/730/a.dem?url=http://localhost", "file:///a.dem", "http://replay1.valve.net/730/%2fsecret.dem"]) assert.throws(() => validateDemoUrl(url));
  for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "::ffff:127.0.0.1", "fc00::1", "0.0.0.0"]) assert.equal(isPublicAddress(address), false);
  assert.equal(isPublicAddress("8.8.8.8"), true);
});
test("stream limits enforce bytes without buffering the full download", async () => {
  await assert.rejects(pipeline(Readable.from([Buffer.alloc(5), Buffer.alloc(6)]), byteLimit(10), new Writable({ write(_chunk, _encoding, callback) { callback(); } })), /size limit/);
});
test("normalization preserves SteamID64 and chat; refuses missing stats", () => {
  const scoreboard = [{ steamid: result.players[0].steamId, name: "Test player", kills_total: 12, deaths_total: 8, assists_total: 3, headshot_kills_total: 4 }, { steamid: "0" }];
  const chat = [{ user_steamid: result.players[0].steamId, user_name: "Test player", tick: 100, chat_message: result.chat[0].message }];
  assert.deepEqual(normalizeDemo({ map_name: "de_test" }, scoreboard, chat), result);
  assert.throws(() => normalizeDemo({ map_name: "de_test" }, [{ steamid: result.players[0].steamId }], []));
});
test("durable jobs deduplicate, retry, fence stale workers, commit atomically and enforce read-only RLS", async () => {
  const { db, pool } = await database();
  try {
    const queued = await enqueue(pool, alice, replay);
    assert.equal((await enqueue(pool, alice, replay)).id, queued.id);
    await assert.rejects(enqueue(pool, bob, replay), DuplicateJobError);
    const first = (await claim(pool))!;
    assert.equal(first.attempts, 1);
    assert.equal(await claim(pool), undefined);
    await pool.query("update tracker_private.parse_jobs set lease_until=now()-interval '1 second' where id=$1", [first.id]);
    const recovered = (await claim(pool))!;
    assert.equal(recovered.attempts, 2);
    await assert.rejects(save(pool, first, result), /lease/);
    await fail(pool, first); // Stale failure must not reset the current job.
    assert.equal((await pool.query("select status from tracker_private.parse_jobs")).rows[0].status, "running");
    await assert.rejects(save(pool, recovered, { ...result, players: [result.players[0], result.players[0]] }));
    assert.equal((await pool.query("select * from public.matches")).rowCount, 0);
    await save(pool, recovered, result);
    assert.equal((await pool.query("select status from tracker_private.parse_jobs")).rows[0].status, "completed");
    assert.equal((await pool.query("select * from public.chat_messages")).rows[0].message, result.chat[0].message);
    await assert.rejects(save(pool, recovered, result), /lease/);
    await db.exec("set role anon");
    assert.equal((await db.query("select * from public.player_stats")).rows.length, 1);
    await assert.rejects(db.query("delete from public.player_stats"), /permission denied/);
    await assert.rejects(db.query("select * from tracker_private.parse_jobs"), /permission denied/);
    await db.exec("reset role");
    const second = await enqueue(pool, alice, replay.replace("example", "failed"));
    for (let attempt = 1; attempt <= 3; attempt++) {
      const job = (await claim(pool))!;
      assert.equal(job.id, second.id);
      await fail(pool, job);
      await pool.query("update tracker_private.parse_jobs set available_at=now()");
    }
    assert.equal((await pool.query("select status from tracker_private.parse_jobs where id=$1", [second.id])).rows[0].status, "failed");
    assert.equal(await claim(pool), undefined);
    for (let i = 0; i < 3; i++) await enqueue(pool, alice, replay.replace("example", `cap${i}`));
    await assert.rejects(enqueue(pool, alice, replay.replace("example", "cap4")), QueueFullError);
  } finally { await db.close(); }
});
test("HTTP endpoint returns 202 before parsing, requires auth, and isolates job ownership", async () => {
  const { db, pool } = await database();
  const app = createApp({ pool, origin: "https://tracker.example", trustProxy: 0, authenticate: async token => token === "alice" ? alice : token === "bob" ? bob : undefined });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  const send = (body: unknown, token = "alice") => fetch(`${base}/api/parse-match`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Origin: "https://tracker.example" }, body: JSON.stringify(body) });
  try {
    assert.equal((await fetch(`${base}/healthz`)).status, 200);
    assert.equal((await send({ demoUrl: replay }, "bad")).status, 401);
    assert.equal((await send({ demoUrl: "http://localhost/a.dem" })).status, 400);
    const response = await send({ demoUrl: replay });
    assert.equal(response.status, 202);
    assert.equal(response.headers.get("access-control-allow-origin"), "https://tracker.example");
    const job = await response.json();
    assert.equal(job.status, "queued");
    assert.equal((await fetch(`${base}/api/jobs/${job.jobId}`, { headers: { Authorization: "Bearer bob" } })).status, 404);
    const status = await fetch(`${base}/api/jobs/${job.jobId}`, { headers: { Authorization: "Bearer alice" } });
    assert.equal((await status.json()).attempts, 0);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); await db.close(); }
});
