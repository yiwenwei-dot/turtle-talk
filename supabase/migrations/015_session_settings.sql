-- Migration: 015_session_settings
-- Global session behaviour settings (single-row, keyed by id = 'default').

create table if not exists public.session_settings (
  id text primary key default 'default',
  allow_interruptions boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.session_settings enable row level security;

create policy "session_settings_select_public" on public.session_settings
  for select using (true);

create policy "session_settings_update_admin" on public.session_settings
  for update using (false) with check (false);

-- Seed default row (interruptions off)
insert into public.session_settings (id) values ('default');
