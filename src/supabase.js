import { createClient } from '@supabase/supabase-js'
import { labelSegmento } from './modules'

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Acesso por empresa (Fase 4 — Etapa 2): a RLS filtra por empresa via can_access_empresa();
// user_id segue gravado como created_by (auditoria) e não controla mais o acesso.
export const getAllLancamentos = async () => {
  const { data, error } = await supabase
    .from('lancamentos')
    .select('*')
    .order('data', { ascending: false })
  if (error) throw error
  return data.map(r => ({
    id: r.id, tipo: r.tipo, cat: r.cat, catNome: r.cat_nome,
    desc: r.descricao, valor: r.valor, data: r.data,
    vencimento: r.vencimento, status: r.status, forma: r.forma,
    conta: r.conta, cliente: r.cliente, fornecedor: r.fornecedor,
    centroCusto: r.centro_custo, obs: r.obs, empId: r.empresa_id,
  }))
}

export const getLancamentos = async (empresaId) => {
  const { data, error } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('data', { ascending: false })
  if (error) throw error
  return data.map(r => ({
    id: r.id, tipo: r.tipo, cat: r.cat, catNome: r.cat_nome,
    desc: r.descricao, valor: r.valor, data: r.data,
    vencimento: r.vencimento, status: r.status, forma: r.forma,
    conta: r.conta, cliente: r.cliente, fornecedor: r.fornecedor,
    centroCusto: r.centro_custo, obs: r.obs, empId: r.empresa_id,
  }))
}

export const saveLancamento = async (item, userId) => {
  const row = {
    id: item.id, empresa_id: item.empId, tipo: item.tipo,
    cat: item.cat, cat_nome: item.catNome, descricao: item.desc,
    valor: item.valor, data: item.data, vencimento: item.vencimento,
    status: item.status, forma: item.forma, conta: item.conta,
    cliente: item.cliente, fornecedor: item.fornecedor,
    centro_custo: item.centroCusto, obs: item.obs, user_id: userId,
  }
  const { error } = await supabase.from('lancamentos').upsert(row)
  if (error) throw error
}

export const deleteLancamento = async (id) => {
  const { error } = await supabase.from('lancamentos').delete().eq('id', id)
  if (error) throw error
}

export const saveLancamentos = async (items, userId) => {
  const rows = items.map(item => ({
    id: item.id, empresa_id: item.empId, tipo: item.tipo,
    cat: item.cat, cat_nome: item.catNome, descricao: item.desc,
    valor: item.valor, data: item.data, vencimento: item.vencimento || null,
    status: item.status, forma: item.forma, conta: item.conta,
    cliente: item.cliente, fornecedor: item.fornecedor,
    centro_custo: item.centroCusto, obs: item.obs, user_id: userId,
  }))
  const { error } = await supabase.from('lancamentos').upsert(rows)
  if (error) throw error
}

export const getMetas = async (empresaId) => {
  const { data, error } = await supabase
    .from('metas')
    .select('*')
    .eq('empresa_id', empresaId)
  if (error) throw error
  return data.map(r => ({
    id: r.id, nome: r.nome, tipo: r.tipo,
    objetivo: r.objetivo, acumulado: r.acumulado,
    prazo: r.prazo, empId: r.empresa_id,
  }))
}

export const saveMeta = async (item, userId) => {
  const row = {
    id: item.id, empresa_id: item.empId || item.empresa_id,
    nome: item.nome, tipo: item.tipo,
    objetivo: item.objetivo, acumulado: item.acumulado,
    prazo: item.prazo, user_id: userId,
  }
  const { error } = await supabase.from('metas').upsert(row)
  if (error) throw error
}

export const deleteMeta = async (id) => {
  const { error } = await supabase.from('metas').delete().eq('id', id)
  if (error) throw error
}

export const deleteAllLancamentos = async (empresaId) => {
  const { error } = await supabase.from('lancamentos').delete().eq('empresa_id', empresaId)
  if (error) throw error
}

export const deleteAllMetas = async (empresaId) => {
  const { error } = await supabase.from('metas').delete().eq('empresa_id', empresaId)
  if (error) throw error
}

// ── Empresas (Fase 4 — migração para Supabase) ─────────────────────────────
const initialsOf = (nome) =>
  (nome || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'EM'

const mapEmpresaRow = (r) => ({
  id: r.id,
  nome: r.nome,
  cnpj: r.cnpj || '',
  segmento: r.segmento || '',
  setor: labelSegmento(r.segmento),
  plano: r.plano || 'basico',
  cor: r.cor || '#16a34a',
  logo: r.logo || '',
  initials: r.initials || initialsOf(r.nome),
  status: r.status || 'ativa',
})

const toEmpresaRow = (emp, ownerUserId) => ({
  id: emp.id,
  ...(ownerUserId ? { owner_user_id: ownerUserId } : {}),
  nome: emp.nome,
  cnpj: emp.cnpj || null,
  segmento: emp.segmento || null,
  plano: emp.plano || 'basico',
  cor: emp.cor || '#16a34a',
  logo: emp.logo || null,
  initials: emp.initials || initialsOf(emp.nome),
  status: emp.status || 'ativa',
})

// Retorna apenas as empresas que o usuário pode acessar (a RLS aplica o filtro)
export const getEmpresas = async () => {
  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(mapEmpresaRow)
}

// Semeia as empresas-demo na 1ª carga, preservando os IDs. Idempotente.
export const seedEmpresas = async (empresasArr, ownerUserId) => {
  const rows = empresasArr.map(e => toEmpresaRow(e, ownerUserId))
  const { error } = await supabase
    .from('empresas')
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
  if (error) throw error
}

export const saveEmpresa = async (emp, ownerUserId) => {
  const { error } = await supabase.from('empresas').insert(toEmpresaRow(emp, ownerUserId))
  if (error) throw error
}

export const updateEmpresa = async (id, fields) => {
  const { error } = await supabase.from('empresas').update(fields).eq('id', id)
  if (error) throw error
}

export const setEmpresaStatus = async (id, status) => updateEmpresa(id, { status })

export const signIn = async (email, senha) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error) throw error
  return data.user
}

export const signOut = async () => {
  await supabase.auth.signOut()
}

export const getSession = async () => {
  const { data } = await supabase.auth.getSession()
  return data.session
}
