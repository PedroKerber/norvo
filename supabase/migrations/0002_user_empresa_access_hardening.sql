-- ============================================================================
-- NORVO · Fase 4 — Etapa 0.1 — Endurecimento de user_empresa_access
-- Índices de performance + RLS de leitura. Idempotente.
-- Pré-requisito: a tabela user_empresa_access já existe (criada em fase anterior)
-- e possui as colunas: owner_user_id, collaborator_user_id, empresa_id, role.
-- ============================================================================

-- 1) Índices — aceleram can_access_empresa() e os filtros por colaborador/empresa
create index if not exists idx_uea_empresa      on public.user_empresa_access(empresa_id);
create index if not exists idx_uea_collaborator on public.user_empresa_access(collaborator_user_id);

-- 2) RLS — cada usuário lê APENAS os próprios vínculos (como colaborador ou dono).
--    As ESCRITAS continuam exclusivamente via endpoints serverless
--    (service_role ignora RLS), então não criamos políticas de insert/update/delete.
alter table public.user_empresa_access enable row level security;

drop policy if exists uea_select_self on public.user_empresa_access;
create policy uea_select_self on public.user_empresa_access
  for select to authenticated
  using (
    collaborator_user_id = auth.uid()
    or owner_user_id = auth.uid()
  );

-- 3) Verificação
select 'colunas' as check, string_agg(column_name, ', ' order by ordinal_position) as resultado
from information_schema.columns
where table_schema = 'public' and table_name = 'user_empresa_access'
union all
select 'indices', string_agg(indexname, ', ')
from pg_indexes
where schemaname = 'public' and tablename = 'user_empresa_access'
union all
select 'rls_ativo', (select rowsecurity::text from pg_tables where schemaname='public' and tablename='user_empresa_access');
