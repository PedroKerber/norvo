-- ============================================================================
-- NORVO · Fase 2 — Etapa 2 (Fundação de Permissões: perfil como verdade do servidor)
-- Cria: user_roles, role_permissions + funções is_master / current_perfil / has_perm.
-- Seed da matriz de permissões + backfill do master. NÃO altera RLS financeira.
-- Aditivo · idempotente · transacional. Rodar no Supabase → SQL Editor.
-- ============================================================================
begin;

-- ── 1) Tabela user_roles (flag GLOBAL de master; fonte de verdade do "master") ──
create table if not exists public.user_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  is_master  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_user_roles_updated on public.user_roles;
create trigger trg_user_roles_updated
  before update on public.user_roles
  for each row execute function public.set_updated_at();   -- função já existe (0001)

-- ── 2) Tabela role_permissions (matriz perfil × módulo × ação) ──
create table if not exists public.role_permissions (
  perfil    text not null,
  modulo    text not null,
  acao      text not null,
  permitido boolean not null default false,
  primary key (perfil, modulo, acao)
);

-- ── 3) Funções auxiliares (security definer → ignoram RLS internamente; sem recursão) ──
create or replace function public.is_master()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.is_master
  );
$$;
grant execute on function public.is_master() to authenticated;

-- perfil do usuário NA empresa (master global => 'master'; senão o role do vínculo)
create or replace function public.current_perfil(emp_id text)
returns text language sql stable security definer set search_path = public as $$
  select case
    when public.is_master() then 'master'
    else (select uea.role from public.user_empresa_access uea
          where uea.empresa_id = emp_id and uea.collaborator_user_id = auth.uid()
          limit 1)
  end;
$$;
grant execute on function public.current_perfil(text) to authenticated;

-- has_perm: master => true; senão consulta a matriz. (USADO na RLS só na Etapa 4)
create or replace function public.has_perm(emp_id text, p_modulo text, p_acao text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when public.is_master() then true
    else coalesce((
      select rp.permitido from public.role_permissions rp
      where rp.perfil = public.current_perfil(emp_id)
        and rp.modulo = p_modulo and rp.acao = p_acao
      limit 1
    ), false)
  end;
$$;
grant execute on function public.has_perm(text, text, text) to authenticated;

-- ── 4) RLS das tabelas novas (leitura; escrita só via service role) ──
alter table public.user_roles enable row level security;
drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_master());

alter table public.role_permissions enable row level security;
drop policy if exists role_permissions_select on public.role_permissions;
create policy role_permissions_select on public.role_permissions for select to authenticated
  using (true);

grant select on public.user_roles, public.role_permissions to authenticated;

-- ── 5) SEED da matriz (defaults; refináveis pela UI na Etapa 3) ──
insert into public.role_permissions (perfil, modulo, acao, permitido)
select p.perfil, g.modulo, g.acao,
  case
    when p.perfil = 'master'  then true
    when p.perfil = 'admin'   then (g.modulo <> 'configuracoes')
    when p.perfil = 'gerente' then
      g.modulo = any (array['dashboard','receitas','despesas','transacoes','fluxo',
                            'retirada_socios','metas','relatorios','categorias',
                            'centro_custo','comparativo_empresas','importar'])
      and g.acao <> 'excluir'
    when p.perfil = 'contador' then
      g.modulo = any (array['dashboard','relatorios','receitas','despesas','fluxo',
                            'transacoes','comparativo_empresas','mes_fechado'])
      and g.acao = any (array['visualizar','exportar'])
    when p.perfil = 'operacional' then
      (g.modulo = 'dashboard' and g.acao = 'visualizar')
      or (g.modulo = any (array['receitas','despesas']) and g.acao = any (array['visualizar','criar']))
    else false
  end
from (values ('master'),('admin'),('gerente'),('contador'),('operacional')) as p(perfil)
cross join (
  select m.modulo, a.acao
  from (values ('dashboard'),('receitas'),('despesas'),('transacoes'),('fluxo'),
               ('retirada_socios'),('metas'),('mes_fechado'),('comparativo_empresas'),
               ('relatorios'),('categorias'),('centro_custo'),('importar'),
               ('empresas'),('usuarios'),('configuracoes'),('meu_plano'),('logs')) as m(modulo)
  cross join (values ('visualizar'),('criar'),('editar'),('excluir'),('exportar')) as a(acao)
) as g
on conflict (perfil, modulo, acao) do nothing;

-- ── 6) BACKFILL dos usuários atuais ──
-- (a) todo usuário existente recebe linha não-master
insert into public.user_roles (user_id, is_master)
select id, false from auth.users
on conflict (user_id) do nothing;
-- (b) garante o master global (pedrork22@icloud.com)
insert into public.user_roles (user_id, is_master)
values ('f87343f7-8b26-48ca-aebe-196501e2ae76', true)
on conflict (user_id) do update set is_master = true;

commit;

-- ── 7) Verificação ──
select 'user_roles total'      as item, count(*)::text as valor from public.user_roles
union all select 'masters',      count(*)::text from public.user_roles where is_master
union all select 'role_perms',   count(*)::text from public.role_permissions
union all select 'master ok?',   (select is_master::text from public.user_roles
                                   where user_id='f87343f7-8b26-48ca-aebe-196501e2ae76');

-- ============================================================================
-- ROLLBACK (se necessário):
-- begin;
--   drop function if exists public.has_perm(text,text,text);
--   drop function if exists public.current_perfil(text);
--   drop function if exists public.is_master();
--   drop table if exists public.role_permissions;
--   drop table if exists public.user_roles;
-- commit;
-- ============================================================================
