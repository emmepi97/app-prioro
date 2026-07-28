-- =========================================================
-- PRIORO / WEEKO - V10 TASK MOVEMENTS
-- Tracciamento spostamenti attività per insight Premium
-- Da lanciare in Supabase SQL Editor prima/insieme al deploy v10
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.task_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  from_day text default '',
  to_day text default '',
  moved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint task_movements_day_changed check (coalesce(from_day, '') <> coalesce(to_day, ''))
);

create index if not exists idx_task_movements_user_moved_at
on public.task_movements(user_id, moved_at desc);

create index if not exists idx_task_movements_task_id
on public.task_movements(task_id);

create index if not exists idx_task_movements_from_to
on public.task_movements(user_id, from_day, to_day);

alter table public.task_movements enable row level security;

drop policy if exists "task_movements_select_own" on public.task_movements;
create policy "task_movements_select_own"
on public.task_movements
for select
using (auth.uid() = user_id);

drop policy if exists "task_movements_insert_own" on public.task_movements;
create policy "task_movements_insert_own"
on public.task_movements
for insert
with check (auth.uid() = user_id);

drop policy if exists "task_movements_delete_own" on public.task_movements;
create policy "task_movements_delete_own"
on public.task_movements
for delete
using (auth.uid() = user_id);

grant select, insert, delete on public.task_movements to authenticated;

-- Verifica struttura
select
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'task_movements'
order by ordinal_position;
