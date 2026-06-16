-- Design Systems space: stores markdown-first DESIGN.md documents per user.
-- Mirrors the owner-only RLS pattern used by the other tables (prompts, ui_elements, …).

create table if not exists public.design_systems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'Untitled system',
  content text not null default '',
  reference_image_path text,
  pair_agents boolean not null default false,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists design_systems_user_id_idx on public.design_systems (user_id);
create index if not exists design_systems_updated_at_idx on public.design_systems (updated_at desc);

alter table public.design_systems enable row level security;

create policy "design_systems_select_own"
  on public.design_systems for select
  using (auth.uid() = user_id);

create policy "design_systems_insert_own"
  on public.design_systems for insert
  with check (auth.uid() = user_id);

create policy "design_systems_update_own"
  on public.design_systems for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "design_systems_delete_own"
  on public.design_systems for delete
  using (auth.uid() = user_id);
