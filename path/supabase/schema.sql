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
  day text default '' check (day in ('','LUNEDI','MARTEDI','MERCOLEDI','GIOVEDI','VENERDI','SABATO','DOMENICA','OGNI_GIORNO','FUTURO')),
  status text not null default 'Da fare' check (status in ('Da fare','Fatto')),
  notes text default '',
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migrazione da versioni precedenti: goal_id può restare nel database ma non viene più usato dall'app.
alter table public.tasks alter column sort_order type bigint using sort_order::bigint;

do $$
declare con record;
begin
  for con in
    select conname
    from pg_constraint
    where conrelid = 'public.tasks'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%day%'
  loop
    execute format('alter table public.tasks drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.tasks add constraint tasks_day_check
  check (day in ('','LUNEDI','MARTEDI','MERCOLEDI','GIOVEDI','VENERDI','SABATO','DOMENICA','OGNI_GIORNO','FUTURO'));

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
create trigger trg_categories_updated_at before update on public.categories for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "categories_select_own" on public.categories;
create policy "categories_select_own" on public.categories for select using (auth.uid() = user_id);
drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own" on public.categories for insert with check (auth.uid() = user_id);
drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own" on public.categories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own" on public.categories for delete using (auth.uid() = user_id);

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks for select using (auth.uid() = user_id);
drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks for insert with check (auth.uid() = user_id);
drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks for delete using (auth.uid() = user_id);

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
  select target_user, 'Calcio', '#111827'
  where not exists (select 1 from public.categories where user_id = target_user and name = 'Calcio');
end;
$$ language plpgsql security definer;
