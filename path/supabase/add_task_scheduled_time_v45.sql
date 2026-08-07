-- V45 - Orario opzionale per attivita
-- Da lanciare una sola volta su Supabase SQL Editor se il tuo database esiste gia.

alter table public.tasks add column if not exists scheduled_time text;
create index if not exists idx_tasks_scheduled_time on public.tasks(scheduled_time);
