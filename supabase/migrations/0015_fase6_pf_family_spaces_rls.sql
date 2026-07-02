-- ============================================================================
-- NORVO · Fase 6 — Plano Pessoa Física (PF) — Família / Compartilhamento (FASE 1)
--
-- Base de "Espaços Financeiros PF" e membros. NÃO é empresa, NÃO usa a lógica
-- de empresas. NENHUMA tabela financeira é alterada nesta fase (isso é a Fase 2).
-- 100% ADITIVA. Isolamento por auth.uid() via RLS + funções SECURITY DEFINER.
--
-- Transacional · idempotente. Pré-req: 0001 (set_updated_at), 0010 (PF).
-- Rodar no Supabase → SQL Editor.
-- ============================================================================
begin;

-- ── 1) personal_spaces — o espaço financeiro pessoal/familiar ────────────────
create table if not exists public.personal_spaces (
  id            text primary key default gen_random_uuid()::text,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name          text not null default 'Meu financeiro',
  type          text not null default 'individual',   -- individual | family
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (owner_user_id)                              -- 1 espaço próprio por usuário (Fase 1)
);

-- ── 2) personal_space_members — membros do espaço ───────────────────────────
create table if not exists public.personal_space_members (
  id          text primary key default gen_random_uuid()::text,
  space_id    text not null references public.personal_spaces(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,  -- null até aceitar (Fase 2)
  email       text not null,
  role        text not null default 'viewer',   -- admin | editor | viewer
  status      text not null default 'pending',  -- pending | accepted | removed
  invited_by  uuid references auth.users(id),
  invited_at  timestamptz default now(),
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (space_id, email)
);

create index if not exists idx_pf_spaces_owner  on public.personal_spaces(owner_user_id);
create index if not exists idx_pf_members_space on public.personal_space_members(space_id);
create index if not exists idx_pf_members_user  on public.personal_space_members(user_id);

-- ── 3) Triggers updated_at ───────────────────────────────────────────────────
drop trigger if exists trg_personal_spaces_updated on public.personal_spaces;
create trigger trg_personal_spaces_updated before update on public.personal_spaces
  for each row execute function public.set_updated_at();
drop trigger if exists trg_personal_space_members_updated on public.personal_space_members;
create trigger trg_personal_space_members_updated before update on public.personal_space_members
  for each row execute function public.set_updated_at();

-- ── 4) Helpers SECURITY DEFINER (evitam recursão de RLS entre as 2 tabelas) ──
create or replace function public.pf_is_space_member(sid text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.personal_spaces s
                 where s.id = sid and s.owner_user_id = auth.uid())
      or exists (select 1 from public.personal_space_members m
                 where m.space_id = sid and m.user_id = auth.uid() and m.status = 'accepted');
$$;
revoke all on function public.pf_is_space_member(text) from public;
grant execute on function public.pf_is_space_member(text) to authenticated;

create or replace function public.pf_is_space_admin(sid text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.personal_spaces s
                 where s.id = sid and s.owner_user_id = auth.uid())
      or exists (select 1 from public.personal_space_members m
                 where m.space_id = sid and m.user_id = auth.uid()
                   and m.status = 'accepted' and m.role = 'admin');
$$;
revoke all on function public.pf_is_space_admin(text) from public;
grant execute on function public.pf_is_space_admin(text) to authenticated;

-- ── 5) RLS ───────────────────────────────────────────────────────────────────
alter table public.personal_spaces        enable row level security;
alter table public.personal_space_members enable row level security;

do $$ declare pol record; begin
  for pol in select policyname, tablename from pg_policies
             where schemaname='public' and tablename in ('personal_spaces','personal_space_members') loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- personal_spaces: vê quem é membro/dono; escreve/edita só o dono
create policy personal_spaces_select on public.personal_spaces for select to authenticated
  using (public.pf_is_space_member(id));
create policy personal_spaces_insert on public.personal_spaces for insert to authenticated
  with check (owner_user_id = auth.uid());
create policy personal_spaces_update on public.personal_spaces for update to authenticated
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy personal_spaces_delete on public.personal_spaces for delete to authenticated
  using (owner_user_id = auth.uid());

-- personal_space_members: admin gerencia; o convidado enxerga só o próprio convite
create policy personal_space_members_select on public.personal_space_members for select to authenticated
  using (public.pf_is_space_member(space_id)
         or user_id = auth.uid()
         or lower(email) = lower(coalesce(auth.email(), '')));
create policy personal_space_members_insert on public.personal_space_members for insert to authenticated
  with check (public.pf_is_space_admin(space_id) and invited_by = auth.uid());
create policy personal_space_members_update on public.personal_space_members for update to authenticated
  using (public.pf_is_space_admin(space_id)) with check (public.pf_is_space_admin(space_id));
create policy personal_space_members_delete on public.personal_space_members for delete to authenticated
  using (public.pf_is_space_admin(space_id));

grant select, insert, update, delete on public.personal_spaces        to authenticated;
grant select, insert, update, delete on public.personal_space_members to authenticated;

-- ── 6) Backfill: 1 espaço individual por usuário PF existente (idempotente) ──
insert into public.personal_spaces (owner_user_id, name, type)
select p.user_id, coalesce(nullif(p.nome, ''), 'Meu financeiro'), 'individual'
from public.personal_profiles p
where not exists (select 1 from public.personal_spaces s where s.owner_user_id = p.user_id)
on conflict (owner_user_id) do nothing;

commit;

-- ============================================================================
-- VERIFICAÇÃO
-- ----------------------------------------------------------------------------
-- select tablename, count(*) policies from pg_policies where schemaname='public'
--   and tablename in ('personal_spaces','personal_space_members')
--   group by tablename;   -- 4 por tabela
-- select count(*) from public.personal_spaces;  -- 1 por usuário PF existente
-- ============================================================================
-- ROLLBACK:
-- begin;
--   drop function if exists public.pf_is_space_admin(text);
--   drop function if exists public.pf_is_space_member(text);
--   drop table if exists public.personal_space_members;
--   drop table if exists public.personal_spaces;
-- commit;
-- ============================================================================
