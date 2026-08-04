-- =========================================================
-- PRIORO / WEEKO - RIMOZIONE FUNZIONALITA CONDIVISIONE ATTIVITA
-- Script opzionale: eseguilo se vuoi pulire Supabase dalla vecchia logica.
-- La nuova app NON usa piu questi oggetti, quindi non e obbligatorio.
-- =========================================================

drop function if exists public.share_task_by_email(uuid, text);

drop index if exists public.ux_tasks_shared_copy;

alter table public.tasks drop column if exists shared_with_email;
alter table public.tasks drop column if exists shared_original_task_id;
alter table public.tasks drop column if exists shared_from_user_id;
