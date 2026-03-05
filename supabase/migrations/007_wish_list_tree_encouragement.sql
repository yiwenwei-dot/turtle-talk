-- Migration: 007_wish_list_tree_encouragement
-- Wish list (parent-managed, child views), parent encouragement (emojis), child tree (growth + placements).
-- Child access is via API using service role; RLS restricts to parents for their linked children.
-- Run after 006. Apply with: supabase db push

-- ============================================================
-- wish_list (parent-managed items per child; full tree unlocks one)
-- ============================================================
create table if not exists public.wish_list (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children(id) on delete cascade,
  label       text not null,
  sort_order  int not null default 0,
  unlocked_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists wish_list_child_id_idx on public.wish_list(child_id);

alter table public.wish_list enable row level security;

-- Parents can CRUD wish list for their linked children
create policy "wish_list_parent_crud" on public.wish_list
  for all using (
    exists (
      select 1 from public.parent_child pc
      where pc.child_id = wish_list.child_id and pc.parent_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.parent_child pc
      where pc.child_id = wish_list.child_id and pc.parent_id = auth.uid()
    )
  );

-- ============================================================
-- parent_encouragement (emojis parents send; child places on tree)
-- ============================================================
create table if not exists public.parent_encouragement (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references public.children(id) on delete cascade,
  from_parent_id uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  used_at    timestamptz
);

create index if not exists parent_encouragement_child_id_idx on public.parent_encouragement(child_id);
create index if not exists parent_encouragement_used_at_idx on public.parent_encouragement(child_id, used_at);

alter table public.parent_encouragement enable row level security;

-- Parents can select and insert for their linked children; update (used_at) is done via API with service role
create policy "parent_encouragement_parent_select_insert" on public.parent_encouragement
  for select using (
    exists (
      select 1 from public.parent_child pc
      where pc.child_id = parent_encouragement.child_id and pc.parent_id = auth.uid()
    )
  );

create policy "parent_encouragement_parent_insert" on public.parent_encouragement
  for insert with check (
    auth.uid() = from_parent_id
    and exists (
      select 1 from public.parent_child pc
      where pc.child_id = parent_encouragement.child_id and pc.parent_id = auth.uid()
    )
  );

-- ============================================================
-- child_tree (one row per child: placements, growth, unlock state)
-- ============================================================
create table if not exists public.child_tree (
  child_id          uuid primary key references public.children(id) on delete cascade,
  placed_count      int not null default 0,
  placed_decorations jsonb not null default '[]'::jsonb,
  growth_stage      int not null default 0,
  last_unlock_at    timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.child_tree enable row level security;

-- Parents can select tree for their linked children (e.g. dashboard)
create policy "child_tree_parent_select" on public.child_tree
  for select using (
    exists (
      select 1 from public.parent_child pc
      where pc.child_id = child_tree.child_id and pc.parent_id = auth.uid()
    )
  );

-- Insert/update for child_tree is done via API with service role when child places decorations

create trigger child_tree_updated_at
  before update on public.child_tree
  for each row execute function public.set_updated_at();
