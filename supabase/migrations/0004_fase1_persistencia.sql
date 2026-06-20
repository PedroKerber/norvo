-- ============================================================================
-- NORVO · Fase 1 (Estabilidade e Persistência Total) — Etapa 0
-- Ajustes de schema para Categorias, Centro de Custos e Fechamento Mensal.
--
-- As tabelas categorias / centro_custos / mes_fechado JÁ existem (Fase 4),
-- com RLS por empresa via can_access_empresa(). Esta migração só:
--   1) adiciona a coluna "descricao" em categorias (a tela coleta, faltava no banco)
--   2) cria mes_fechado_historico (histórico de fechar/reabrir/export, por empresa)
--
-- Aditivo e idempotente. NÃO altera dados. NÃO toca em lancamentos/metas/empresas.
-- Rodar no Supabase → SQL Editor.
-- ============================================================================
begin;

-- 1) categorias: campo descricao (opcional)
alter table public.categorias add column if not exists descricao text;

-- 2) Histórico de fechamento mensal (estado atual fica em mes_fechado;
--    aqui guardamos o histórico de eventos por empresa × competência).
--    tipo livre (fechamento | reabertura | exportacao_* | compartilhamento_*)
create table if not exists public.mes_fechado_historico (
  id            text primary key default gen_random_uuid()::text,
  empresa_id    text not null references public.empresas(id) on delete cascade,
  competencia   text not null,                 -- 'YYYY-MM'
  tipo          text not null,
  motivo        text,
  usuario_id    uuid,
  usuario_nome  text,
  criado_em     timestamptz not null default now()
);
create index if not exists idx_mfh_empresa on public.mes_fechado_historico(empresa_id);
create index if not exists idx_mfh_comp     on public.mes_fechado_historico(empresa_id, competencia);

-- 3) RLS por empresa (mesmo padrão das demais tabelas da Fase 4)
alter table public.mes_fechado_historico enable row level security;
drop policy if exists mes_fechado_historico_access on public.mes_fechado_historico;
create policy mes_fechado_historico_access on public.mes_fechado_historico
  for all to authenticated
  using (public.can_access_empresa(empresa_id))
  with check (public.can_access_empresa(empresa_id));

-- 4) Grants
grant select, insert, update, delete on public.mes_fechado_historico to authenticated;

commit;

-- 5) Verificação
select 'categorias.descricao existe' as item,
       (select count(*)::text from information_schema.columns
        where table_schema='public' and table_name='categorias' and column_name='descricao') as resultado
union all
select 'tabela mes_fechado_historico',
       (select count(*)::text from information_schema.tables
        where table_schema='public' and table_name='mes_fechado_historico')
union all
select 'rls mes_fechado_historico',
       (select rowsecurity::text from pg_tables
        where schemaname='public' and tablename='mes_fechado_historico');

-- ============================================================================
-- ROLLBACK (se precisar desfazer):
-- begin;
--   drop table if exists public.mes_fechado_historico;
--   alter table public.categorias drop column if exists descricao;
-- commit;
-- ============================================================================
