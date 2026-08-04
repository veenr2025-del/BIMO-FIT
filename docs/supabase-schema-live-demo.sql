-- BIMO Fit Challenge App - live demo tables only
-- This creates the tables the GitHub Pages app needs.

create table if not exists public.bimo_members (
  member_code text primary key,
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
create index if not exists bimo_qr_scans_member_created_idx on public.bimo_qr_scans(member_code, created_at desc);
create index if not exists bimo_admin_awards_member_created_idx on public.bimo_admin_awards(member_code, created_at desc);
