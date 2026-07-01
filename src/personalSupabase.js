// ── Norvo · Plano Pessoa Física — camada de dados ───────────────────────────
// Wrappers finos sobre o mesmo client do app (src/supabase.js). RLS filtra por
// user_id = auth.uid(); user_id é gravado no insert p/ satisfazer o WITH CHECK.
import { supabase } from './supabase'

// ── Contexto de conta (roteamento do shell) ─────────────────────────────────
// Retorna { type: 'pf' | 'empresarial', profile }. Fonte da verdade = presença
// de linha em personal_profiles (espelha getMyAccess do empresarial).
export const getAccountContext = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { type: 'empresarial', profile: null }
  const { data, error } = await supabase
    .from('personal_profiles')
    .select('user_id, nome, plano, moeda')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return { type: 'empresarial', profile: null } // tabela ausente / erro ⇒ fluxo atual
  if (!data) return { type: 'empresarial', profile: null }
  return {
    type: 'pf',
    profile: { userId: data.user_id, nome: data.nome || '', plano: data.plano || 'pessoal', moeda: data.moeda || 'BRL' },
  }
}

// ── Contas bancárias ────────────────────────────────────────────────────────
const mapAccount = (r) => ({
  id: r.id, nome: r.nome, banco: r.banco || '', tipo: r.tipo || '',
  saldoInicial: Number(r.saldo_inicial) || 0, saldoAtual: Number(r.saldo_atual) || 0,
  obs: r.obs || '',
})

export const getPersonalAccounts = async () => {
  const { data, error } = await supabase
    .from('personal_accounts')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(mapAccount)
}

export const savePersonalAccount = async (acc, userId) => {
  const row = {
    id: acc.id, user_id: userId, nome: acc.nome, banco: acc.banco || null,
    tipo: acc.tipo || null, saldo_inicial: acc.saldoInicial || 0,
    saldo_atual: acc.saldoAtual != null ? acc.saldoAtual : (acc.saldoInicial || 0),
    obs: acc.obs || null,
  }
  const { error } = await supabase.from('personal_accounts').upsert(row)
  if (error) throw error
}

export const deletePersonalAccount = async (id) => {
  const { error } = await supabase.from('personal_accounts').delete().eq('id', id)
  if (error) throw error
}

// ── Transações (receitas + despesas) ────────────────────────────────────────
const mapTx = (r) => ({
  id: r.id, tipo: r.tipo, valor: Number(r.valor) || 0, data: r.data,
  categoria: r.categoria || '', desc: r.descricao || '', accountId: r.account_id || '',
  forma: r.forma_pagamento || '', recorrencia: r.recorrencia || '', status: r.status || '',
  cartaoId: r.credit_card_id || '', anexoUrl: r.anexo_url || '',
  parcelaNum: r.parcela_num || null, parcelaTotal: r.parcela_total || null,
})

const toTxRow = (item, userId) => ({
  id: item.id, user_id: userId, tipo: item.tipo, valor: item.valor || 0,
  data: item.data || null, categoria: item.categoria || null, descricao: item.desc || null,
  account_id: item.accountId || null, forma_pagamento: item.forma || null,
  recorrencia: item.recorrencia || null, status: item.status || null,
  credit_card_id: item.cartaoId || null, anexo_url: item.anexoUrl || null,
  parcela_num: item.parcelaNum || null, parcela_total: item.parcelaTotal || null,
})

export const getPersonalTransactions = async () => {
  const { data, error } = await supabase
    .from('personal_transactions')
    .select('*')
    .order('data', { ascending: false })
  if (error) throw error
  return (data || []).map(mapTx)
}

export const savePersonalTransaction = async (item, userId) => {
  const { error } = await supabase.from('personal_transactions').upsert(toTxRow(item, userId))
  if (error) throw error
}

export const savePersonalTransactions = async (items, userId) => {
  const rows = items.map(i => toTxRow(i, userId))
  const { error } = await supabase.from('personal_transactions').upsert(rows)
  if (error) throw error
}

export const deletePersonalTransaction = async (id) => {
  const { error } = await supabase.from('personal_transactions').delete().eq('id', id)
  if (error) throw error
}

// ── Cartões de crédito ──────────────────────────────────────────────────────
const mapCard = (r) => ({
  id: r.id, name: r.name, institution: r.institution || '', brand: r.brand || '',
  limit: Number(r.limit_amount) || 0, closingDay: r.closing_day || null, dueDay: r.due_day || null,
  color: r.color || '#0D2545', isActive: r.is_active !== false,
})
export const getPersonalCards = async () => {
  const { data, error } = await supabase.from('personal_credit_cards').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(mapCard)
}
export const savePersonalCard = async (c, userId) => {
  const row = {
    id: c.id, user_id: userId, name: c.name, institution: c.institution || null, brand: c.brand || null,
    limit_amount: c.limit || 0, closing_day: c.closingDay || null, due_day: c.dueDay || null,
    color: c.color || null, is_active: c.isActive !== false,
  }
  const { error } = await supabase.from('personal_credit_cards').upsert(row)
  if (error) throw error
}
export const deletePersonalCard = async (id) => {
  const { error } = await supabase.from('personal_credit_cards').delete().eq('id', id)
  if (error) throw error
}

// ── Investimentos ───────────────────────────────────────────────────────────
const mapInvest = (r) => ({
  id: r.id, name: r.name, type: r.investment_type || '', institution: r.institution || '',
  invested: Number(r.amount_invested) || 0, current: Number(r.current_amount) || 0,
  profitability: r.profitability != null ? Number(r.profitability) : null,
  date: r.application_date, liquidity: r.liquidity || '', notes: r.notes || '',
})
export const getPersonalInvestments = async () => {
  const { data, error } = await supabase.from('personal_investments').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(mapInvest)
}
export const savePersonalInvestment = async (i, userId) => {
  const row = {
    id: i.id, user_id: userId, name: i.name, investment_type: i.type || null, institution: i.institution || null,
    amount_invested: i.invested || 0, current_amount: i.current != null ? i.current : (i.invested || 0),
    profitability: i.profitability != null && i.profitability !== '' ? i.profitability : null,
    application_date: i.date || null, liquidity: i.liquidity || null, notes: i.notes || null,
  }
  const { error } = await supabase.from('personal_investments').upsert(row)
  if (error) throw error
}
export const deletePersonalInvestment = async (id) => {
  const { error } = await supabase.from('personal_investments').delete().eq('id', id)
  if (error) throw error
}

// ── Dívidas ─────────────────────────────────────────────────────────────────
const mapDebt = (r) => ({
  id: r.id, creditor: r.creditor, description: r.description || '',
  total: Number(r.total_amount) || 0, remaining: Number(r.remaining_amount) || 0,
  installmentsTotal: r.installments_total || null, installmentsPaid: r.installments_paid || 0,
  dueDate: r.due_date, interestRate: r.interest_rate != null ? Number(r.interest_rate) : null,
  status: r.status || 'em_aberto', notes: r.notes || '',
})
export const getPersonalDebts = async () => {
  const { data, error } = await supabase.from('personal_debts').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(mapDebt)
}
export const savePersonalDebt = async (d, userId) => {
  const row = {
    id: d.id, user_id: userId, creditor: d.creditor, description: d.description || null,
    total_amount: d.total || 0, remaining_amount: d.remaining != null ? d.remaining : (d.total || 0),
    installments_total: d.installmentsTotal || null, installments_paid: d.installmentsPaid || 0,
    due_date: d.dueDate || null, interest_rate: d.interestRate != null && d.interestRate !== '' ? d.interestRate : null,
    status: d.status || 'em_aberto', notes: d.notes || null,
  }
  const { error } = await supabase.from('personal_debts').upsert(row)
  if (error) throw error
}
export const deletePersonalDebt = async (id) => {
  const { error } = await supabase.from('personal_debts').delete().eq('id', id)
  if (error) throw error
}

// ── Metas ───────────────────────────────────────────────────────────────────
const mapGoal = (r) => ({
  id: r.id, name: r.name, target: Number(r.target_amount) || 0, current: Number(r.current_amount) || 0,
  deadline: r.deadline, category: r.category || '', status: r.status || 'ativa', notes: r.notes || '',
})
export const getPersonalGoals = async () => {
  const { data, error } = await supabase.from('personal_goals').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(mapGoal)
}
export const savePersonalGoal = async (g, userId) => {
  const row = {
    id: g.id, user_id: userId, name: g.name, target_amount: g.target || 0,
    current_amount: g.current || 0, deadline: g.deadline || null, category: g.category || null,
    status: g.status || 'ativa', notes: g.notes || null,
  }
  const { error } = await supabase.from('personal_goals').upsert(row)
  if (error) throw error
}
export const deletePersonalGoal = async (id) => {
  const { error } = await supabase.from('personal_goals').delete().eq('id', id)
  if (error) throw error
}
