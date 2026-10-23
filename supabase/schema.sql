-- Ascent — run this once in Supabase → SQL Editor.
-- One row per user holds the whole app document. The app merges changes per item,
-- so two devices editing at once don't overwrite each other.

create table if not exists public.user_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

-- Each signed-in user can only see and change their own row.
drop policy if exists "own row: select" on public.user_state;
drop policy if exists "own row: insert" on public.user_state;
drop policy if exists "own row: update" on public.user_state;
create policy "own row: select" on public.user_state for select using (auth.uid() = user_id);
create policy "own row: insert" on public.user_state for insert with check (auth.uid() = user_id);
create policy "own row: update" on public.user_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Live updates between your phone, iPad and laptop.
alter publication supabase_realtime add table public.user_state;
