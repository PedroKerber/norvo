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

// ── Categorias (Fase 1 — persistência por empresa) ─────────────────────────
const mapCategoriaRow = (r) => ({
  id: r.id,
  nome: r.nome,
  tipo: r.tipo,
  cor: r.cor || '#6b7280',
  variavel: !!r.variavel,
  descricao: r.descricao || '',
  status: r.status || 'ativa',
  builtin: false,
  empresaId: r.empresa_id,
})

export const getCategorias = async (empresaId) => {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(mapCategoriaRow)
}

export const saveCategoria = async (cat, empresaId) => {
  const row = {
    id: cat.id, empresa_id: empresaId, nome: cat.nome, tipo: cat.tipo,
    cor: cat.cor || '#6b7280', variavel: !!cat.variavel,
    descricao: cat.descricao || null, status: cat.status || 'ativa',
  }
  const { error } = await supabase.from('categorias').upsert(row)
  if (error) throw error
}

export const deleteCategoria = async (id) => {
  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) throw error
}

// ── Centro de Custos (Fase 1 — persistência por empresa) ───────────────────
const mapCentroRow = (r) => ({
  id: r.id,
  nome: r.nome,
  desc: r.descricao || '',
  responsavel: r.responsavel || '',
  email: r.email || '',
  ativo: r.ativo !== false,
  empresaId: r.empresa_id,
})

export const getCentroCustos = async (empresaId) => {
  const { data, error } = await supabase
    .from('centro_custos')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(mapCentroRow)
}

export const saveCentroCusto = async (cc, empresaId) => {
  const row = {
    id: cc.id, empresa_id: empresaId, nome: cc.nome,
    descricao: cc.desc || null, responsavel: cc.responsavel || null,
    email: cc.email || null, ativo: cc.ativo !== false,
  }
  const { error } = await supabase.from('centro_custos').upsert(row)
  if (error) throw error
}

export const deleteCentroCusto = async (id) => {
  const { error } = await supabase.from('centro_custos').delete().eq('id', id)
  if (error) throw error
}

// ── Fechamento Mensal (Fase 1 — estado por empresa × competência + histórico) ─
export const isMesFechado = async (empresaId, competencia) => {
  const { data, error } = await supabase
    .from('mes_fechado')
    .select('fechado')
    .eq('empresa_id', empresaId)
    .eq('competencia', competencia)
    .maybeSingle()
  if (error) throw error
  return !!(data && data.fechado)
}

export const setMesFechado = async (empresaId, competencia, fechado, usuarioId) => {
  const row = {
    empresa_id: empresaId, competencia, fechado,
    fechado_por: usuarioId || null, fechado_em: new Date().toISOString(),
  }
  const { error } = await supabase.from('mes_fechado').upsert(row, { onConflict: 'empresa_id,competencia' })
  if (error) throw error
}

export const getHistoricoFechamento = async (empresaId) => {
  const { data, error } = await supabase
    .from('mes_fechado_historico')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('criado_em', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data || []).map(r => ({
    tipo: r.tipo, motivo: r.motivo || '', usuario: r.usuario_nome || 'Sistema',
    data: r.criado_em, mes: r.competencia,
  }))
}

export const addHistoricoFechamento = async (empresaId, competencia, tipo, motivo, usuarioId, usuarioNome) => {
  const { error } = await supabase.from('mes_fechado_historico').insert({
    empresa_id: empresaId, competencia, tipo,
    motivo: motivo || null, usuario_id: usuarioId || null, usuario_nome: usuarioNome || null,
  })
  if (error) throw error
}

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

// ── Chamadas autenticadas aos endpoints /api (Fase 2 · Etapa 1 — Hotfix) ─────
// Anexa Authorization: Bearer <access_token> da sessão atual. Os endpoints /api
// exigem esse token e validam o perfil (master) no servidor.
export const apiFetch = async (path, options = {}) => {
  const { data } = await supabase.auth.getSession()
  const token = data && data.session ? data.session.access_token : null
  const headers = { ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(path, { ...options, headers })
}
