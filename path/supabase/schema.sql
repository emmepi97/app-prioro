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
  scheduled_time text,
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
create index if not exists idx_tasks_scheduled_time on public.tasks(scheduled_time);

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

-- Planner scheduling additions
alter table public.tasks add column if not exists scheduled_time text;

-- Premium / Freemium additions
alter table public.tasks add column if not exists recurring_task_id uuid;
alter table public.tasks add column if not exists recurring_week_key text;

create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','premium_monthly','premium_lifetime')),
  status text not null default 'active' check (status in ('active','inactive','cancelled','past_due')),
  price_label text default '€0',
  provider text default 'manual',
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  priority text not null default 'Media' check (priority in ('Alta','Media','Bassa')),
  notes text default '',
  recurrence_type text not null default 'weekly' check (recurrence_type in ('weekly')),
  recurrence_day text not null check (recurrence_day in ('LUNEDI','MARTEDI','MERCOLEDI','GIOVEDI','VENERDI','SABATO','DOMENICA','OGNI_GIORNO')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_report_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekly_email_enabled boolean not null default false,
  weekly_email_day text not null default 'MONDAY',
  weekly_email_hour integer not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_recurring_key on public.tasks(recurring_task_id, recurring_week_key);
create index if not exists idx_recurring_tasks_user_id on public.recurring_tasks(user_id);
create index if not exists idx_user_subscriptions_status on public.user_subscriptions(plan, status);

alter table public.user_subscriptions enable row level security;
alter table public.recurring_tasks enable row level security;
alter table public.user_report_settings enable row level security;

drop trigger if exists trg_user_subscriptions_updated_at on public.user_subscriptions;
create trigger trg_user_subscriptions_updated_at before update on public.user_subscriptions for each row execute function public.set_updated_at();
drop trigger if exists trg_recurring_tasks_updated_at on public.recurring_tasks;
create trigger trg_recurring_tasks_updated_at before update on public.recurring_tasks for each row execute function public.set_updated_at();
drop trigger if exists trg_user_report_settings_updated_at on public.user_report_settings;
create trigger trg_user_report_settings_updated_at before update on public.user_report_settings for each row execute function public.set_updated_at();

drop policy if exists "subscriptions_select_own" on public.user_subscriptions;
create policy "subscriptions_select_own" on public.user_subscriptions for select using (auth.uid() = user_id);
drop policy if exists "subscriptions_insert_own" on public.user_subscriptions;
create policy "subscriptions_insert_own" on public.user_subscriptions for insert with check (auth.uid() = user_id);
drop policy if exists "subscriptions_update_own" on public.user_subscriptions;
create policy "subscriptions_update_own" on public.user_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recurring_select_own" on public.recurring_tasks;
create policy "recurring_select_own" on public.recurring_tasks for select using (auth.uid() = user_id);
drop policy if exists "recurring_insert_own" on public.recurring_tasks;
create policy "recurring_insert_own" on public.recurring_tasks for insert with check (auth.uid() = user_id);
drop policy if exists "recurring_update_own" on public.recurring_tasks;
create policy "recurring_update_own" on public.recurring_tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "recurring_delete_own" on public.recurring_tasks;
create policy "recurring_delete_own" on public.recurring_tasks for delete using (auth.uid() = user_id);

drop policy if exists "report_settings_select_own" on public.user_report_settings;
create policy "report_settings_select_own" on public.user_report_settings for select using (auth.uid() = user_id);
drop policy if exists "report_settings_insert_own" on public.user_report_settings;
create policy "report_settings_insert_own" on public.user_report_settings for insert with check (auth.uid() = user_id);
drop policy if exists "report_settings_update_own" on public.user_report_settings;
create policy "report_settings_update_own" on public.user_report_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Premium cleanup v2: anti-duplicati ricorrenze
create unique index if not exists ux_tasks_recurring_user_week
on public.tasks(user_id, recurring_task_id, recurring_week_key);
