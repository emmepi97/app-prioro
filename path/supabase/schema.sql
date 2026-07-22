-- Planner Appuntamenti e Priorità - Supabase schema
-- Eseguire questo file nel SQL Editor di Supabase.

create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#64748b',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  priority text not null default 'Media' check (priority in ('Alta','Media','Bassa')),
  day text default '' check (day in ('','LUNEDI','MARTEDI','MERCOLEDI','GIOVEDI','VENERDI')),
  status text not null default 'Da fare' check (status in ('Da fare','Fatto')),
  notes text default '',
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_categories_user_id on public.categories(user_id);
create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_day on public.tasks(day);
create index if not exists idx_tasks_category_id on public.tasks(category_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "categories_select_own" on public.categories;
create policy "categories_select_own" on public.categories
for select using (auth.uid() = user_id);

drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own" on public.categories
for insert with check (auth.uid() = user_id);

drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own" on public.categories
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own" on public.categories
for delete using (auth.uid() = user_id);

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
for select using (auth.uid() = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks
for insert with check (auth.uid() = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks
for delete using (auth.uid() = user_id);

-- Funzione opzionale: crea categorie base al primo accesso utente.
create or replace function public.create_default_categories_for_user(target_user uuid)
returns void as $$
begin
  insert into public.categories (user_id, name, color)
  select target_user, 'Lavoro', '#2563eb'
  where not exists (select 1 from public.categories where user_id = target_user and name = 'Lavoro');

  insert into public.categories (user_id, name, color)
  select target_user, 'Personale', '#16a34a'
  where not exists (select 1 from public.categories where user_id = target_user and name = 'Personale');

  insert into public.categories (user_id, name, color)
  select target_user, 'Urgenze', '#dc2626'
  where not exists (select 1 from public.categories where user_id = target_user and name = 'Urgenze');
end;
$$ language plpgsql security definer;
