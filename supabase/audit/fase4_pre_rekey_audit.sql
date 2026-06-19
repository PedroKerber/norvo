-- ============================================================================
-- NORVO · Fase 4 — AUDITORIA PRÉ RE-KEY (Etapa 2)  ·  SOMENTE LEITURA
-- Não altera nada. Rodar no Supabase → SQL Editor (roda como postgres,
-- ignora RLS, então enxerga 100% das linhas).
-- Cole o resultado de cada bloco de volta para o Claude.
-- ============================================================================

-- ── BLOCO 1 — Resumo de inconsistências (itens 5,6,7,9,10) ──────────────────
select 'lancamentos_total'              as item, count(*)::text as valor from public.lancamentos
union all select 'metas_total',              count(*)::text from public.metas
union all select 'empresas_total',           count(*)::text from public.empresas
union all select 'lancamentos_sem_empresa',  count(*)::text from public.lancamentos where empresa_id is null or empresa_id = ''
union all select 'metas_sem_empresa',        count(*)::text from public.metas       where empresa_id is null or empresa_id = ''
union all select 'empresas_sem_owner',       count(*)::text from public.empresas    where owner_user_id is null
union all select 'empresas_sem_segmento',    count(*)::text from public.empresas    where segmento is null or segmento = ''
union all select 'lanc_empresa_orfa_ids',    count(distinct l.empresa_id)::text from public.lancamentos l
            left join public.empresas e on e.id = l.empresa_id where e.id is null
union all select 'metas_empresa_orfa_ids',   count(distinct m.empresa_id)::text from public.metas m
            left join public.empresas e on e.id = m.empresa_id where e.id is null
union all select 'vinculos_empresa_inexistente', count(*)::text from public.user_empresa_access uea
            left join public.empresas e on e.id = uea.empresa_id where e.id is null
union all select 'usuarios_sem_acesso',      count(*)::text from auth.users u
            left join public.empresas e on e.owner_user_id = u.id
            left join public.user_empresa_access uea on uea.collaborator_user_id = u.id
            where e.id is null and uea.collaborator_user_id is null
order by item;

-- ── BLOCO 2 — Lançamentos por empresa (item 1) ──────────────────────────────
select coalesce(nullif(l.empresa_id, ''), '(vazio)') as empresa_id, e.nome, count(*) as total
from public.lancamentos l
left join public.empresas e on e.id = l.empresa_id
group by 1, 2 order by total desc;

-- ── BLOCO 3 — Metas por empresa (item 2) ────────────────────────────────────
select coalesce(nullif(m.empresa_id, ''), '(vazio)') as empresa_id, e.nome, count(*) as total
from public.metas m
left join public.empresas e on e.id = m.empresa_id
group by 1, 2 order by total desc;

-- ── BLOCO 4 — Lançamentos por usuário / created_by (item 3) ─────────────────
select user_id, count(*) as total from public.lancamentos group by 1 order by total desc;

-- ── BLOCO 5 — Metas por usuário (item 4) ────────────────────────────────────
select user_id, count(*) as total from public.metas group by 1 order by total desc;

-- ── BLOCO 6 — IDs de empresa ÓRFÃOS: têm dados mas não existem em empresas (item 8, parte SQL) ──
select distinct l.empresa_id from public.lancamentos l
  left join public.empresas e on e.id = l.empresa_id where e.id is null
union
select distinct m.empresa_id from public.metas m
  left join public.empresas e on e.id = m.empresa_id where e.id is null;

-- ── BLOCO 7 — Vínculos inválidos: apontam para empresa inexistente (item 9) ─
select uea.* from public.user_empresa_access uea
left join public.empresas e on e.id = uea.empresa_id where e.id is null;

-- ── BLOCO 8 — Usuários sem acesso: não são donos e não têm vínculo (item 9) ─
select u.id, u.email
from auth.users u
left join public.empresas e on e.owner_user_id = u.id
left join public.user_empresa_access uea on uea.collaborator_user_id = u.id
where e.id is null and uea.collaborator_user_id is null;

-- ── BLOCO 9 — Lista de empresas existentes (para cruzar com o localStorage) ──
select id, nome, segmento, plano, status, owner_user_id from public.empresas order by created_at;
