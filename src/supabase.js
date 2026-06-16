import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export const getLancamentos = async (userId, empresaId) => {
  const { data, error } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('user_id', userId)
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

export const getMetas = async (userId, empresaId) => {
  const { data, error } = await supabase
    .from('metas')
    .select('*')
    .eq('user_id', userId)
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

export const deleteAllLancamentos = async (userId) => {
  const { error } = await supabase.from('lancamentos').delete().eq('user_id', userId)
  if (error) throw error
}

export const deleteAllMetas = async (userId) => {
  const { error } = await supabase.from('metas').delete().eq('user_id', userId)
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
