begin;

-- A private durable queue, separate from Supabase's exposed public schema.
create schema if not exists tracker_private;
revoke all on schema tracker_private from public, anon, authenticated;
create table tracker_private.parse_jobs (
  id uuid primary key default gen_random_uuid(),
  demo_url text not null unique,
  requested_by uuid not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  attempts integer not null default 0,
  lease_token uuid,
  lease_until timestamptz,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  error text
);
create index parse_jobs_claim on tracker_private.parse_jobs(status, available_at, created_at);

create table public.matches (
  id uuid primary key references tracker_private.parse_jobs(id),
  map_name text not null,
  parsed_at timestamptz not null default now()
);
create table public.player_stats (
  match_id uuid not null references public.matches(id) on delete cascade,
  steam_id text not null check (steam_id ~ '^7656119[0-9]{10}$'),
  player_name text not null,
  kills integer not null check (kills >= 0),
  deaths integer not null check (deaths >= 0),
  assists integer not null check (assists >= 0),
  headshots integer not null check (headshots >= 0),
  imported_at timestamptz not null default now(),
  primary key (match_id, steam_id)
);
create index player_stats_dashboard on public.player_stats(steam_id, imported_at desc);
create table public.chat_messages (
  match_id uuid not null references public.matches(id) on delete cascade,
  sequence integer not null,
  steam_id text not null check (steam_id ~ '^7656119[0-9]{10}$'),
  player_name text not null,
  tick integer not null check (tick >= 0),
  message text not null,
  imported_at timestamptz not null default now(),
  primary key (match_id, sequence)
);
create index chat_messages_dashboard on public.chat_messages(steam_id, imported_at desc, sequence desc);

-- This product publishes demo stats and recorded chat. See docs for private deployments.
alter table public.matches enable row level security;
alter table public.player_stats enable row level security;
alter table public.chat_messages enable row level security;
revoke all on public.matches, public.player_stats, public.chat_messages from anon, authenticated;
grant select on public.matches, public.player_stats, public.chat_messages to anon, authenticated;
create policy public_match_read on public.matches for select to anon, authenticated using (true);
create policy public_stats_read on public.player_stats for select to anon, authenticated using (true);
create policy public_chat_read on public.chat_messages for select to anon, authenticated using (true);

commit;
