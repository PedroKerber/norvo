-- ============================================================================
-- NORVO · Fase 4 — Etapa 2 — Re-key financeiro (lancamentos + metas)
-- Migra o controle de acesso de user_id → empresa_id (via can_access_empresa).
-- NÃO altera colunas, NÃO apaga dados. Transacional e idempotente.
-- Pré-requisito: 0001 aplicado (tabela empresas + função can_access_empresa).
-- Recomendado: rodar ANTES do deploy do código da Etapa 2 (é retrocompatível
-- com o código atual graças ao ramo "user_id = auth.uid()").
-- ============================================================================
begin;

-- 1) Índices para as novas queries por empresa
create index if not exists idx_lancamentos_empresa on public.lancamentos(empresa_id);
create index if not exists idx_metas_empresa       on public.metas(empresa_id);

-- 2) Garante RLS ativa
alter table public.lancamentos enable row level security;
alter table public.metas       enable row level security;

-- 3) Remove políticas antigas (user_id-based) de forma segura, por tabela
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'lancamentos' loop
    execute format('drop policy if exists %I on public.lancamentos', pol.policyname);
  end loop;
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'metas' loop
    execute format('drop policy if exists %I on public.metas', pol.policyname);
  end loop;
end $$;

-- 4) Novas políticas: acesso por empresa (dono OU colaborador vinculado).
--    Rede de segurança: user_id = auth.uid() em select/update/delete → o criador
--    nunca perde acesso ao que criou (protege dados de empresas órfãs).
--    INSERT é estrito: só grava em empresa que o usuário pode acessar.
create policy lancamentos_select on public.lancamentos for select to authenticated
  using (public.can_access_empresa(empresa_id) or user_id = auth.uid());
create policy lancamentos_insert on public.lancamentos for insert to authenticated
  with check (public.can_access_empresa(empresa_id));
create policy lancamentos_update on public.lancamentos for update to authenticated
  using (public.can_access_empresa(empresa_id) or user_id = auth.uid())
  with check (public.can_access_empresa(empresa_id));
create policy lancamentos_delete on public.lancamentos for delete to authenticated
  using (public.can_access_empresa(empresa_id) or user_id = auth.uid());

create policy metas_select on public.metas for select to authenticated
  using (public.can_access_empresa(empresa_id) or user_id = auth.uid());
create policy metas_insert on public.metas for insert to authenticated
  with check (public.can_access_empresa(empresa_id));
create policy metas_update on public.metas for update to authenticated
  using (public.can_access_empresa(empresa_id) or user_id = auth.uid())
  with check (public.can_access_empresa(empresa_id));
create policy metas_delete on public.metas for delete to authenticated
  using (public.can_access_empresa(empresa_id) or user_id = auth.uid());

grant select, insert, update, delete on public.lancamentos, public.metas to authenticated;

commit;

-- Verificação (esperado: 4 políticas por tabela)
select tablename, cmd, policyname from pg_policies
where schemaname = 'public' and tablename in ('lancamentos', 'metas')
order by tablename, cmd;

-- ============================================================================
-- ROLLBACK — rodar SOMENTE se precisar voltar ao modelo user_id:
-- begin;
--   do $$ declare pol record; begin
--     for pol in select policyname from pg_policies where schemaname='public' and tablename='lancamentos' loop
--       execute format('drop policy if exists %I on public.lancamentos', pol.policyname); end loop;
--     for pol in select policyname from pg_policies where schemaname='public' and tablename='metas' loop
--       execute format('drop policy if exists %I on public.metas', pol.policyname); end loop;
--   end $$;
--   create policy lancamentos_owner on public.lancamentos for all to authenticated
--     using (user_id = auth.uid()) with check (user_id = auth.uid());
--   create policy metas_owner on public.metas for all to authenticated
--     using (user_id = auth.uid()) with check (user_id = auth.uid());
-- commit;
-- (Índices podem ser mantidos; se quiser remover: drop index if exists
--  public.idx_lancamentos_empresa, public.idx_metas_empresa;)
-- ============================================================================
