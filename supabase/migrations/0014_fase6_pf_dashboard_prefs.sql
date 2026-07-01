-- ============================================================================
-- NORVO · Fase 6 — Plano Pessoa Física (PF) — Personalização do Dashboard
--
-- Guarda quais widgets do Dashboard pessoal cada usuário quer ver.
-- 1 linha por usuário. 100% ADITIVA. Isolamento total via RLS (user_id = auth.uid()).
--
-- Transacional · idempotente. Pré-req: 0001 (set_updated_at), 0010 (PF).
-- Rodar no Supabase → SQL Editor.
-- ============================================================================
begin;

-- ── personal_dashboard_preferences — widgets visíveis do Dashboard ───────────
create table if not exists public.personal_dashboard_preferences (
  id              text primary key default gen_random_uuid()::text,
  user_id         uuid not null references auth.users(id) on delete cascade,
  visible_widgets jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_personal_dashprefs_user on public.personal_dashboard_preferences(user_id);

-- ── Trigger updated_at ───────────────────────────────────────────────────────
drop trigger if exists trg_personal_dashboard_preferences_updated on public.personal_dashboard_preferences;
create trigger trg_personal_dashboard_preferences_updated
  before update on public.personal_dashboard_preferences
  for each row execute function public.set_updated_at();

-- ── RLS — isolamento total por usuário ───────────────────────────────────────
do $$
declare t text := 'personal_dashboard_preferences'; pol record;
begin
  execute format('alter table public.%I enable row level security', t);
  for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, t);
  end loop;
  execute format($f$create policy %1$s_select on public.%1$s for select to authenticated
                   using (user_id = auth.uid())$f$, t);
  execute format($f$create policy %1$s_insert on public.%1$s for insert to authenticated
                   with check (user_id = auth.uid())$f$, t);
  execute format($f$create policy %1$s_update on public.%1$s for update to authenticated
                   using (user_id = auth.uid()) with check (user_id = auth.uid())$f$, t);
  execute format($f$create policy %1$s_delete on public.%1$s for delete to authenticated
                   using (user_id = auth.uid())$f$, t);
  execute format('grant select, insert, update, delete on public.%I to authenticated', t);
end $$;

commit;

-- ============================================================================
-- VERIFICAÇÃO
-- ----------------------------------------------------------------------------
-- select tablename, count(*) as policies from pg_policies
-- where schemaname='public' and tablename='personal_dashboard_preferences'
-- group by tablename;   -- espera 4 políticas
-- ============================================================================
-- ROLLBACK:
-- begin;
--   drop table if exists public.personal_dashboard_preferences;
-- commit;
-- ============================================================================
