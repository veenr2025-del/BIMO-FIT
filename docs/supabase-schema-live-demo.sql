-- BIMO Fit Challenge App - live demo tables only
-- This creates the tables the GitHub Pages app needs.

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

create table if not exists public.bimo_member_codes (
  login_code text primary key check (login_code ~ '^[0-9]{4}$'),
  member_code text not null unique,
  assigned_to text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  last_login_at timestamptz
);

create index if not exists bimo_member_codes_member_code_idx on public.bimo_member_codes(member_code);

alter table public.bimo_member_codes enable row level security;
revoke all on public.bimo_member_codes from anon, authenticated;

create or replace function public.bimo_login_with_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_code text;
  code_row public.bimo_member_codes%rowtype;
  member_row public.bimo_members%rowtype;
begin
  clean_code := regexp_replace(coalesce(p_code, ''), '\D', '', 'g');

  if clean_code !~ '^[0-9]{4}$' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_CODE', 'message', 'Vul een geldige 4-cijfer membercode in.');
  end if;

  select *
    into code_row
    from public.bimo_member_codes
    where login_code = clean_code
      and is_active = true
    limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'CODE_NOT_FOUND', 'message', 'Deze membercode is niet actief. Vraag BIMO om je code.');
  end if;

  update public.bimo_member_codes
    set claimed_at = coalesce(claimed_at, now()),
        last_login_at = now()
    where login_code = clean_code;

  select *
    into member_row
    from public.bimo_members
    where member_code = code_row.member_code
    limit 1;

  return jsonb_build_object(
    'ok', true,
    'message', 'Membercode goedgekeurd.',
    'memberCode', code_row.member_code,
    'member', case when member_row.member_code is null then null else to_jsonb(member_row) end,
    'qrScans', coalesce((select jsonb_agg(to_jsonb(scan_row) order by scan_row.created_at desc) from public.bimo_qr_scans scan_row where scan_row.member_code = code_row.member_code), '[]'::jsonb),
    'adminAwards', coalesce((select jsonb_agg(to_jsonb(award_row) order by award_row.created_at desc) from public.bimo_admin_awards award_row where award_row.member_code = code_row.member_code and award_row.member_visible = true), '[]'::jsonb),
    'challenges', coalesce((select jsonb_agg(to_jsonb(challenge_row) order by challenge_row.challenge_id) from public.bimo_challenge_progress challenge_row where challenge_row.member_code = code_row.member_code), '[]'::jsonb),
    'rewardClaims', coalesce((select jsonb_agg(to_jsonb(reward_row) order by reward_row.created_at desc) from public.bimo_reward_claims reward_row where reward_row.member_code = code_row.member_code), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.bimo_login_with_code(text) to anon, authenticated;
