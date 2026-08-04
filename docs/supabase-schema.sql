-- BIMO Fit Challenge App - Supabase schema
-- Gratis demo setup voor GitHub Pages/PWA.
-- Gebruik alleen de publishable key in de app. Gebruik nooit service_role of sb_secret in GitHub.

create table if not exists public.bimo_members (
  member_code text primary key,
  auth_user_id uuid,
  email text,
  qr_code text not null,
  name text not null,
  age integer check (age is null or age between 12 and 90),
  height_cm numeric(6,2) check (height_cm is null or height_cm between 120 and 230),
  weight_kg numeric(6,2) check (weight_kg is null or weight_kg between 35 and 250),
  target_weight_kg numeric(6,2),
  body_fat numeric(5,2),
  blood_pressure text,
  goal text,
  program text,
  level text,
  points integer not null default 0 check (points >= 0),
  joined_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.bimo_qr_scans (
  scan_id text primary key,
  member_code text not null references public.bimo_members(member_code) on delete cascade,
  member_name text,
  proof_code text not null unique,
  status text not null default 'Goedgekeurd',
  period_key text,
  scanned_by text not null default 'Admin',
  created_at timestamptz not null default now()
);

create table if not exists public.bimo_admin_awards (
  award_id text primary key,
  member_code text not null references public.bimo_members(member_code) on delete cascade,
  rule_id text not null,
  title text not null,
  points integer not null check (points >= 0),
  category text,
  note text,
  metric_value text,
  proof_code text,
  member_visible boolean not null default true,
  period_key text,
  awarded_by text not null default 'Admin',
  created_at timestamptz not null default now()
);

create table if not exists public.bimo_challenge_progress (
  member_code text not null references public.bimo_members(member_code) on delete cascade,
  challenge_id text not null,
  progress numeric(8,2) not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (member_code, challenge_id)
);

create table if not exists public.bimo_reward_claims (
  member_code text not null references public.bimo_members(member_code) on delete cascade,
  reward_id text not null,
  title text not null,
  threshold integer not null default 0,
  reward_type text,
  created_at timestamptz not null default now(),
  primary key (member_code, reward_id)
);

create index if not exists bimo_members_points_idx on public.bimo_members(points desc);
create index if not exists bimo_members_auth_user_id_idx on public.bimo_members(auth_user_id);
create index if not exists bimo_members_email_idx on public.bimo_members(email);
create index if not exists bimo_qr_scans_member_created_idx on public.bimo_qr_scans(member_code, created_at desc);
create index if not exists bimo_admin_awards_member_created_idx on public.bimo_admin_awards(member_code, created_at desc);

alter table public.bimo_members enable row level security;
alter table public.bimo_qr_scans enable row level security;
alter table public.bimo_admin_awards enable row level security;
alter table public.bimo_challenge_progress enable row level security;
alter table public.bimo_reward_claims enable row level security;

grant select, insert, update on public.bimo_members to anon, authenticated;
grant select, insert, update on public.bimo_qr_scans to anon, authenticated;
grant select, insert, update on public.bimo_admin_awards to anon, authenticated;
grant select, insert, update on public.bimo_challenge_progress to anon, authenticated;
grant select, insert, update on public.bimo_reward_claims to anon, authenticated;

drop policy if exists "BIMO demo members read" on public.bimo_members;
drop policy if exists "BIMO demo members insert" on public.bimo_members;
drop policy if exists "BIMO demo members update" on public.bimo_members;
drop policy if exists "BIMO demo scans read" on public.bimo_qr_scans;
drop policy if exists "BIMO demo scans insert" on public.bimo_qr_scans;
drop policy if exists "BIMO demo scans update" on public.bimo_qr_scans;
drop policy if exists "BIMO demo awards read" on public.bimo_admin_awards;
drop policy if exists "BIMO demo awards insert" on public.bimo_admin_awards;
drop policy if exists "BIMO demo awards update" on public.bimo_admin_awards;
drop policy if exists "BIMO demo challenges read" on public.bimo_challenge_progress;
drop policy if exists "BIMO demo challenges insert" on public.bimo_challenge_progress;
drop policy if exists "BIMO demo challenges update" on public.bimo_challenge_progress;
drop policy if exists "BIMO demo rewards read" on public.bimo_reward_claims;
drop policy if exists "BIMO demo rewards insert" on public.bimo_reward_claims;
drop policy if exists "BIMO demo rewards update" on public.bimo_reward_claims;

create policy "BIMO demo members read"
  on public.bimo_members for select
  to anon, authenticated
  using (true);

create policy "BIMO demo members insert"
  on public.bimo_members for insert
  to anon, authenticated
  with check (true);

create policy "BIMO demo members update"
  on public.bimo_members for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "BIMO demo scans read"
  on public.bimo_qr_scans for select
  to anon, authenticated
  using (true);

create policy "BIMO demo scans insert"
  on public.bimo_qr_scans for insert
  to anon, authenticated
  with check (true);

create policy "BIMO demo scans update"
  on public.bimo_qr_scans for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "BIMO demo awards read"
  on public.bimo_admin_awards for select
  to anon, authenticated
  using (true);

create policy "BIMO demo awards insert"
  on public.bimo_admin_awards for insert
  to anon, authenticated
  with check (true);

create policy "BIMO demo awards update"
  on public.bimo_admin_awards for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "BIMO demo challenges read"
  on public.bimo_challenge_progress for select
  to anon, authenticated
  using (true);

create policy "BIMO demo challenges insert"
  on public.bimo_challenge_progress for insert
  to anon, authenticated
  with check (true);

create policy "BIMO demo challenges update"
  on public.bimo_challenge_progress for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "BIMO demo rewards read"
  on public.bimo_reward_claims for select
  to anon, authenticated
  using (true);

create policy "BIMO demo rewards insert"
  on public.bimo_reward_claims for insert
  to anon, authenticated
  with check (true);

create policy "BIMO demo rewards update"
  on public.bimo_reward_claims for update
  to anon, authenticated
  using (true)
  with check (true);
