-- ============================================================================
-- NORVO · Fase 6 — Plano Pessoa Física (PF) — F2: schema + RLS
--
-- Novos módulos pessoais: cartões de crédito, investimentos, dívidas e metas.
-- 100% ADITIVA (não altera nada existente). Isolamento total por usuário via
-- RLS (user_id = auth.uid()). Mesmo padrão da 0010 (F1).
--
-- Transacional · idempotente (safe re-run). Pré-requisito: 0001 (set_updated_at),
-- 0010 (personal_profiles). Rodar no Supabase → SQL Editor.
-- ============================================================================
begin;

-- ── 1) personal_credit_cards — cartões de crédito pessoais ───────────────────
create table if not exists public.personal_credit_cards (
  id           text primary key default gen_random_uuid()::text,
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  institution  text,
  brand        text,
  limit_amount numeric not null default 0,
  closing_day  int,
  due_day      int,
  color        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── 2) personal_investments — investimentos pessoais ─────────────────────────
create table if not exists public.personal_investments (
  id              text primary key default gen_random_uuid()::text,
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  investment_type text,
  institution     text,
  amount_invested numeric not null default 0,
  current_amount  numeric not null default 0,
  profitability   numeric,
  application_date date,
  liquidity       text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 3) personal_debts — dívidas / empréstimos pessoais ───────────────────────
create table if not exists public.personal_debts (
  id                text primary key default gen_random_uuid()::text,
  user_id           uuid not null references auth.users(id) on delete cascade,
  creditor          text not null,
  description       text,
  total_amount      numeric not null default 0,
  remaining_amount  numeric not null default 0,
  installments_total int,
  installments_paid  int not null default 0,
  due_date          date,
  interest_rate     numeric,
  status            text not null default 'em_aberto',   -- em_aberto|quitada|atrasada
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── 4) personal_goals — metas financeiras pessoais ───────────────────────────
create table if not exists public.personal_goals (
  id             text primary key default gen_random_uuid()::text,
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  target_amount  numeric not null default 0,
  current_amount numeric not null default 0,
  deadline       date,
  category       text,
  status         text not null default 'ativa',          -- ativa|concluida|pausada
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_personal_cards_user   on public.personal_credit_cards(user_id);
create index if not exists idx_personal_invest_user  on public.personal_investments(user_id);
create index if not exists idx_personal_debts_user   on public.personal_debts(user_id);
create index if not exists idx_personal_goals_user   on public.personal_goals(user_id);

-- ── 5) Triggers updated_at (função set_updated_at já existe — 0001) ──────────
do $$
declare t text;
begin
  foreach t in array array['personal_credit_cards','personal_investments','personal_debts','personal_goals'] loop
    execute format('drop trigger if exists trg_%1$s_updated on public.%1$s', t);
    execute format('create trigger trg_%1$s_updated before update on public.%1$s
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ── 6) RLS — isolamento total por usuário (user_id = auth.uid()) ─────────────
alter table public.personal_credit_cards enable row level security;
alter table public.personal_investments  enable row level security;
alter table public.personal_debts        enable row level security;
alter table public.personal_goals        enable row level security;

do $$
declare t text; pol record;
begin
  foreach t in array array['personal_credit_cards','personal_investments','personal_debts','personal_goals'] loop
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
  end loop;
end $$;

grant select, insert, update, delete
  on public.personal_credit_cards, public.personal_investments,
     public.personal_debts, public.personal_goals
  to authenticated;

commit;

-- ============================================================================
-- VERIFICAÇÃO
-- ----------------------------------------------------------------------------
-- select tablename, count(*) as policies from pg_policies
-- where schemaname='public'
--   and tablename in ('personal_credit_cards','personal_investments','personal_debts','personal_goals')
-- group by tablename order by tablename;   -- 4 por tabela
-- ============================================================================
-- ROLLBACK:
-- begin;
--   drop table if exists public.personal_goals;
--   drop table if exists public.personal_debts;
--   drop table if exists public.personal_investments;
--   drop table if exists public.personal_credit_cards;
-- commit;
-- ============================================================================
