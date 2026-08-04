alter table public.bimo_members
  add column if not exists auth_user_id uuid,
  add column if not exists email text;

create index if not exists bimo_members_auth_user_id_idx
  on public.bimo_members(auth_user_id);

create index if not exists bimo_members_email_idx
  on public.bimo_members(email);
