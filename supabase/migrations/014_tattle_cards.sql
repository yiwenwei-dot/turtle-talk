-- Migration: 014_tattle_cards
-- Creates tattle_cards table and tattle_card_display_settings table
-- for admin-managed conversation prompt cards in the child demo flow.

-- ============================================================
-- Table 1: tattle_cards
-- ============================================================

create table if not exists public.tattle_cards (
  id text primary key,
  emoji text not null,
  title text not null,
  description text not null,
  skill text,
  scenario text,
  category text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tattle_cards enable row level security;

create policy "tattle_cards_select_public" on public.tattle_cards
  for select using (true);

create policy "tattle_cards_insert_admin" on public.tattle_cards
  for insert with check (false);

create policy "tattle_cards_update_admin" on public.tattle_cards
  for update using (false) with check (false);

create policy "tattle_cards_delete_admin" on public.tattle_cards
  for delete using (false);

-- Seed the 6 default cards
insert into public.tattle_cards (id, emoji, title, description, skill, scenario, category, sort_order)
values
  ('fix-friend',     '🧑‍🤝‍🧑', 'Friend problem',    'I had trouble with a friend',                'Social Repair',          'Sometimes friends argue, misunderstand each other, or say something that hurts feelings.', 'social',   0),
  ('tried-hard',     '🎉',           'Proud moment',      'I tried something hard',                     'Growth Mindset',         'Sometimes we try something new or difficult, even when we are not sure we will succeed.',   'self',     1),
  ('big-feelings',   '😡',           'Big feelings',      'Something made me really upset',              'Emotional Regulation',   'Sometimes we feel angry, frustrated, or overwhelmed.',                                     'emotions', 2),
  ('made-mistake',   '😬',           'A mistake happened', 'Something didn''t go well',                  'Resilience Development', 'Everyone makes mistakes sometimes. What matters is what we do next.',                       'self',     3),
  ('helped-someone', '❤️',           'Kind moment',       'I helped someone or someone helped me',       'Empathy / Connection',   'Kind actions help people feel connected and safe.',                                        'social',   4),
  ('big-wonder',     '🤔',           'Big question',      'Something I''m curious about',                'Cognitive Development',  'Sometimes our minds are full of big questions.',                                           'self',     5);

-- ============================================================
-- Table 2: tattle_card_display_settings
-- ============================================================

create table if not exists public.tattle_card_display_settings (
  id text primary key default 'default',
  show_skill boolean not null default false,
  show_scenario boolean not null default false,
  show_category boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.tattle_card_display_settings enable row level security;

create policy "tattle_card_display_settings_select_public" on public.tattle_card_display_settings
  for select using (true);

create policy "tattle_card_display_settings_update_admin" on public.tattle_card_display_settings
  for update using (false) with check (false);

-- Seed default row (all toggles off)
insert into public.tattle_card_display_settings (id) values ('default');
