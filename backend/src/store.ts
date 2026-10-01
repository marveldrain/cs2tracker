import type { Pool } from "pg";
import type { Job, ParsedDemo } from "./model.js";
export class QueueFullError extends Error {}
export class DuplicateJobError extends Error {}
export async function enqueue(pool: Pool, userId: string, url: string) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    // Serialize submissions by user, including requests arriving at different replicas.
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [userId]);
    const active = await client.query("select count(*)::int as count from tracker_private.parse_jobs where requested_by=$1 and status in ('queued','running')", [userId]);
    if (active.rows[0].count >= 3) throw new QueueFullError();
    await client.query("insert into tracker_private.parse_jobs(demo_url, requested_by) values ($1,$2) on conflict (demo_url) do nothing", [url, userId]);
    const { rows } = await client.query("select id, status, requested_by from tracker_private.parse_jobs where demo_url=$1", [url]);
    if (rows[0].requested_by !== userId) throw new DuplicateJobError();
    await client.query("commit");
    return { id: rows[0].id as string, status: rows[0].status as string };
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}
export async function claim(pool: Pool): Promise<Job | undefined> {
  await pool.query(`update tracker_private.parse_jobs set status='failed', error='Worker interrupted after maximum attempts', updated_at=now()
    where status='running' and lease_until < now() and attempts >= 3`);
  const { rows } = await pool.query<Job>(`with candidate as (
    select id from tracker_private.parse_jobs
    where attempts < 3 and ((status='queued' and available_at <= now()) or (status='running' and lease_until < now()))
    order by created_at for update skip locked limit 1
  ) update tracker_private.parse_jobs j set status='running', attempts=j.attempts+1,
    lease_token=gen_random_uuid(), lease_until=now()+interval '20 minutes', updated_at=now(), error=null
    from candidate where j.id=candidate.id returning j.*`);
  return rows[0];
}
export async function fail(pool: Pool, job: Job) {
  await pool.query(`update tracker_private.parse_jobs set status=case when attempts >= 3 then 'failed' else 'queued' end,
    error='Download or parsing failed; the replay may be expired, unsupported, or too large',
    available_at=now()+interval '30 seconds', lease_until=null, lease_token=null, updated_at=now()
    where id=$1 and lease_token=$2 and status='running'`, [job.id, job.lease_token]);
}
export async function save(pool: Pool, job: Job, result: ParsedDemo) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const lock = await client.query("select id from tracker_private.parse_jobs where id=$1 and lease_token=$2 and status='running' and lease_until > now() for update", [job.id, job.lease_token]);
    if (!lock.rowCount) throw new Error("Job lease no longer owned");
    await client.query("insert into public.matches(id,map_name) values ($1,$2) on conflict (id) do update set map_name=excluded.map_name, parsed_at=now()", [job.id, result.map]);
    await client.query("delete from public.player_stats where match_id=$1", [job.id]);
    await client.query("delete from public.chat_messages where match_id=$1", [job.id]);
    await client.query(`insert into public.player_stats(match_id,steam_id,player_name,kills,deaths,assists,headshots)
      select $1,p->>'steamId',p->>'name',(p->>'kills')::int,(p->>'deaths')::int,(p->>'assists')::int,(p->>'headshots')::int
      from jsonb_array_elements($2::jsonb) p`, [job.id, JSON.stringify(result.players)]);
    await client.query(`insert into public.chat_messages(match_id,sequence,steam_id,player_name,tick,message)
      select $1,(ordinality-1)::int,p->>'steamId',p->>'name',(p->>'tick')::int,p->>'message'
      from jsonb_array_elements($2::jsonb) with ordinality as items(p,ordinality)`, [job.id, JSON.stringify(result.chat)]);
    await client.query("update tracker_private.parse_jobs set status='completed', lease_token=null, lease_until=null, error=null, updated_at=now() where id=$1", [job.id]);
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}
