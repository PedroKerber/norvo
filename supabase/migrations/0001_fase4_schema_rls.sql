-- ============================================================================
-- NORVO · Fase 4 — Migração Completa para Supabase
-- Etapa 0 — Schema + RLS (apenas tabelas NOVAS)
--
-- Ordem importante: TABELAS primeiro, depois a função can_access_empresa
-- (ela é language sql e é validada na criação — precisa que empresas já exista).
--
-- NÃO altera lancamentos/metas. NÃO insere dados. Idempotente (safe re-run).
-- Rodar no Supabase → SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Trigger util para updated_at (plpgsql — não referencia tabelas)
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2) Tabelas
-- ----------------------------------------------------------------------------
create table if not exists public.empresas (
  id            text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  nome          text not null,
  cnpj          text,
  segmento      text,
  plano         text not null default 'basico'
                  check (plano in ('basico','profissional','enterprise')),
  cor           text default '#16a34a',
  logo          text,
  initials      text,
  status        text not null default 'ativa'
                  check (status in ('ativa','inativa')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_empresas_owner on public.empresas(owner_user_id);
drop trigger if exists trg_empresas_updated on public.empresas;
create trigger trg_empresas_updated
  before update on public.empresas
  for each row execute function public.set_updated_at();

create table if not exists public.categorias (
  id          text primary key,
  empresa_id  text not null references public.empresas(id) on delete cascade,
  nome        text not null,
  tipo        text not null check (tipo in ('receita','despesa')),
  cor         text,
  variavel    boolean not null default false,
  status      text not null default 'ativa' check (status in ('ativa','inativa')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_categorias_empresa on public.categorias(empresa_id);
drop trigger if exists trg_categorias_updated on public.categorias;
create trigger trg_categorias_updated
  before update on public.categorias
  for each row execute function public.set_updated_at();

create table if not exists public.centro_custos (
  id           text primary key,
  empresa_id   text not null references public.empresas(id) on delete cascade,
  nome         text not null,
  descricao    text,
  responsavel  text,
  email        text,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_centro_custos_empresa on public.centro_custos(empresa_id);
drop trigger if exists trg_centro_custos_updated on public.centro_custos;
create trigger trg_centro_custos_updated
  before update on public.centro_custos
  for each row execute function public.set_updated_at();

create table if not exists public.mes_fechado (
  id           text primary key default gen_random_uuid()::text,
  empresa_id   text not null references public.empresas(id) on delete cascade,
  competencia  text not null,
  fechado      boolean not null default true,
  fechado_por  uuid,
  fechado_em   timestamptz not null default now(),
  unique (empresa_id, competencia)
);
create index if not exists idx_mes_fechado_empresa on public.mes_fechado(empresa_id);

-- ----------------------------------------------------------------------------
-- 3) Função de acesso por empresa (agora empresas já existe)
--    dono OU colaborador vinculado · security definer (ignora RLS internamente)
-- ----------------------------------------------------------------------------
create or replace function public.can_access_empresa(emp_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.empresas e
      where e.id = emp_id and e.owner_user_id = auth.uid()
    )
    or exists (
      select 1 from public.user_empresa_access uea
      where uea.empresa_id = emp_id and uea.collaborator_user_id = auth.uid()
    );
$$;
grant execute on function public.can_access_empresa(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 4) RLS + políticas
-- ----------------------------------------------------------------------------
alter table public.empresas      enable row level security;
alter table public.categorias    enable row level security;
alter table public.centro_custos enable row level security;
alter table public.mes_fechado   enable row level security;

drop policy if exists empresas_select on public.empresas;
create policy empresas_select on public.empresas for select to authenticated
  using (
    owner_user_id = auth.uid()
    or exists (
      select 1 from public.user_empresa_access uea
      where uea.empresa_id = empresas.id and uea.collaborator_user_id = auth.uid()
    )
  );
drop policy if exists empresas_insert on public.empresas;
create policy empresas_insert on public.empresas for insert to authenticated
  with check (owner_user_id = auth.uid());
drop policy if exists empresas_update on public.empresas;
create policy empresas_update on public.empresas for update to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

drop policy if exists categorias_access on public.categorias;
create policy categorias_access on public.categorias for all to authenticated
  using (public.can_access_empresa(empresa_id))
  with check (public.can_access_empresa(empresa_id));

drop policy if exists centro_custos_access on public.centro_custos;
create policy centro_custos_access on public.centro_custos for all to authenticated
  using (public.can_access_empresa(empresa_id))
  with check (public.can_access_empresa(empresa_id));

drop policy if exists mes_fechado_access on public.mes_fechado;
create policy mes_fechado_access on public.mes_fechado for all to authenticated
  using (public.can_access_empresa(empresa_id))
  with check (public.can_access_empresa(empresa_id));

-- ----------------------------------------------------------------------------
-- 5) Grants
-- ----------------------------------------------------------------------------
grant select, insert, update, delete
  on public.empresas, public.categorias, public.centro_custos, public.mes_fechado
  to authenticated;

-- ----------------------------------------------------------------------------
-- 6) Verificação
-- ----------------------------------------------------------------------------
select tablename, rowsecurity as rls_ativo
from pg_tables
where schemaname = 'public'
  and tablename in ('empresas','categorias','centro_custos','mes_fechado')
order by tablename;
