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
  recurrenceId: r.recurrence_id || '', installmentId: r.installment_id || '',
})

const toTxRow = (item, userId) => ({
  id: item.id, user_id: userId, tipo: item.tipo, valor: item.valor || 0,
  data: item.data || null, categoria: item.categoria || null, descricao: item.desc || null,
  account_id: item.accountId || null, forma_pagamento: item.forma || null,
  recorrencia: item.recorrencia || null, status: item.status || null,
  credit_card_id: item.cartaoId || null, anexo_url: item.anexoUrl || null,
  parcela_num: item.parcelaNum || null, parcela_total: item.parcelaTotal || null,
  recurrence_id: item.recurrenceId || null, installment_id: item.installmentId || null,
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

// ── Categorias personalizadas (F3) ──────────────────────────────────────────
const mapCategory = (r) => ({
  id: r.id, name: r.name, type: r.type || 'despesa', color: r.color || '#6b7280',
  isActive: r.is_active !== false,
})
export const getPersonalCategories = async () => {
  const { data, error } = await supabase.from('personal_categories').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(mapCategory)
}
export const savePersonalCategory = async (c, userId) => {
  const row = {
    id: c.id, user_id: userId, name: c.name, type: c.type || 'despesa',
    color: c.color || null, is_active: c.isActive !== false,
  }
  const { error } = await supabase.from('personal_categories').upsert(row)
  if (error) throw error
}
export const deletePersonalCategory = async (id) => {
  const { error } = await supabase.from('personal_categories').delete().eq('id', id)
  if (error) throw error
}

// ── Snapshots de patrimônio líquido (F3) ────────────────────────────────────
const mapSnapshot = (r) => ({
  id: r.id, date: r.snapshot_date, accounts: Number(r.accounts_total) || 0,
  investments: Number(r.investments_total) || 0, debts: Number(r.debts_total) || 0,
  netWorth: Number(r.net_worth) || 0,
})
export const getNetWorthSnapshots = async () => {
  const { data, error } = await supabase.from('personal_net_worth_snapshots').select('*').order('snapshot_date', { ascending: true })
  if (error) throw error
  return (data || []).map(mapSnapshot)
}
// Upsert do snapshot do mês corrente (snapshot_date = 1º dia do mês).
export const upsertNetWorthSnapshot = async (userId, { accounts, investments, debts }) => {
  const now = new Date()
  const snapshotDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const row = {
    user_id: userId, snapshot_date: snapshotDate,
    accounts_total: accounts || 0, investments_total: investments || 0,
    debts_total: debts || 0, net_worth: (accounts || 0) + (investments || 0) - (debts || 0),
  }
  const { error } = await supabase.from('personal_net_worth_snapshots')
    .upsert(row, { onConflict: 'user_id,snapshot_date' })
  if (error) throw error
}

// ── F5: helper de id client-side (para geração de lançamentos) ──────────────
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

// ── Recorrências (F5) ───────────────────────────────────────────────────────
const mapRecurrence = (r) => ({
  id: r.id, tipo: r.tipo, valor: Number(r.valor) || 0, categoria: r.categoria || '', descricao: r.descricao || '',
  accountId: r.account_id || '', cardId: r.credit_card_id || '', frequency: r.frequency || 'mensal',
  startDate: r.start_date, endDate: r.end_date, status: r.status || 'ativo', lastGenerated: r.last_generated,
})
export const getPersonalRecurrences = async () => {
  const { data, error } = await supabase.from('personal_recurrences').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(mapRecurrence)
}
export const savePersonalRecurrence = async (r, userId) => {
  const row = {
    id: r.id || genId(), user_id: userId, tipo: r.tipo, valor: r.valor || 0, categoria: r.categoria || null,
    descricao: r.descricao || null, account_id: r.accountId || null, credit_card_id: r.cardId || null,
    frequency: r.frequency || 'mensal', start_date: r.startDate || null, end_date: r.endDate || null,
    status: r.status || 'ativo', last_generated: r.lastGenerated || null,
  }
  const { error } = await supabase.from('personal_recurrences').upsert(row)
  if (error) throw error
  return row.id
}
export const deletePersonalRecurrence = async (id) => {
  const { error } = await supabase.from('personal_recurrences').delete().eq('id', id)
  if (error) throw error
}
const addFreq = (d, freq) => {
  const nd = new Date(d)
  if (freq === 'semanal') nd.setDate(nd.getDate() + 7)
  else if (freq === 'anual') nd.setFullYear(nd.getFullYear() + 1)
  else nd.setMonth(nd.getMonth() + 1)
  return nd
}
// Gera os lançamentos vencidos de recorrências ativas até hoje (idempotente via last_generated).
export const generateDueRecurrences = async (userId) => {
  const recs = await getPersonalRecurrences()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const rows = []
  for (const r of recs) {
    if (r.status !== 'ativo' || !r.startDate) continue
    const end = r.endDate ? new Date(r.endDate) : null
    let cur = r.lastGenerated ? addFreq(new Date(r.lastGenerated), r.frequency) : new Date(r.startDate)
    let last = r.lastGenerated || null, guard = 0
    while (cur <= today && (!end || cur <= end) && guard < 400) {
      const dateStr = cur.toISOString().slice(0, 10)
      rows.push(toTxRow({
        id: genId(), tipo: r.tipo, valor: r.valor, data: dateStr, categoria: r.categoria,
        desc: r.descricao, accountId: r.accountId, cartaoId: r.cardId,
        status: r.tipo === 'receita' ? 'Recebida' : 'Pago', recurrenceId: r.id,
      }, userId))
      last = dateStr; cur = addFreq(cur, r.frequency); guard++
    }
    if (last && last !== r.lastGenerated) {
      await supabase.from('personal_recurrences').update({ last_generated: last }).eq('id', r.id)
    }
  }
  if (rows.length) { const { error } = await supabase.from('personal_transactions').insert(rows); if (error) throw error }
  return rows.length
}

// ── Transferências entre contas (F5) ────────────────────────────────────────
const mapTransfer = (r) => ({ id: r.id, fromId: r.from_account_id || '', toId: r.to_account_id || '', valor: Number(r.valor) || 0, data: r.data, obs: r.obs || '' })
export const getPersonalTransfers = async () => {
  const { data, error } = await supabase.from('personal_transfers').select('*').order('data', { ascending: false })
  if (error) throw error
  return (data || []).map(mapTransfer)
}
export const savePersonalTransfer = async (t, userId) => {
  const row = { id: t.id || genId(), user_id: userId, from_account_id: t.fromId || null, to_account_id: t.toId || null, valor: t.valor || 0, data: t.data || null, obs: t.obs || null }
  const { error } = await supabase.from('personal_transfers').upsert(row)
  if (error) throw error
  return { ...t, id: row.id }
}
export const deletePersonalTransfer = async (id) => {
  const { error } = await supabase.from('personal_transfers').delete().eq('id', id)
  if (error) throw error
}

// ── Orçamento mensal por categoria (F5) ─────────────────────────────────────
const mapBudget = (r) => ({ id: r.id, categoria: r.categoria, amount: Number(r.amount) || 0 })
export const getPersonalBudgets = async () => {
  const { data, error } = await supabase.from('personal_budgets').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(mapBudget)
}
export const savePersonalBudget = async (b, userId) => {
  const row = { id: b.id || genId(), user_id: userId, categoria: b.categoria, amount: b.amount || 0 }
  const { error } = await supabase.from('personal_budgets').upsert(row)
  if (error) throw error
  return { ...b, id: row.id }
}
export const deletePersonalBudget = async (id) => {
  const { error } = await supabase.from('personal_budgets').delete().eq('id', id)
  if (error) throw error
}

// ── Faturas de cartão (F5) ──────────────────────────────────────────────────
const mapInvoice = (r) => ({ id: r.id, cardId: r.card_id, competencia: r.competencia, amount: Number(r.amount) || 0, status: r.status || 'aberta', accountId: r.account_id || '', paidAt: r.paid_at })
export const getCardInvoices = async () => {
  const { data, error } = await supabase.from('personal_card_invoices').select('*')
  if (error) throw error
  return (data || []).map(mapInvoice)
}
export const payCardInvoice = async ({ userId, cardId, competencia, amount, accountId }) => {
  const row = { user_id: userId, card_id: cardId, competencia, amount: amount || 0, status: 'paga', account_id: accountId || null, paid_at: new Date().toISOString() }
  const { error } = await supabase.from('personal_card_invoices').upsert(row, { onConflict: 'user_id,card_id,competencia' })
  if (error) throw error
}

// ── Fechamento mensal (F5) ──────────────────────────────────────────────────
const mapClosing = (r) => ({
  id: r.id, month: r.month, year: r.year, totalIncome: Number(r.total_income) || 0, totalExpenses: Number(r.total_expenses) || 0,
  balance: Number(r.balance) || 0, accountsTotal: Number(r.accounts_total) || 0, investmentsTotal: Number(r.investments_total) || 0,
  debtsTotal: Number(r.debts_total) || 0, netWorth: Number(r.net_worth) || 0, notes: r.notes || '', closedAt: r.closed_at,
})
export const getMonthlyClosings = async () => {
  const { data, error } = await supabase.from('personal_monthly_closings').select('*').order('year', { ascending: false }).order('month', { ascending: false })
  if (error) throw error
  return (data || []).map(mapClosing)
}
export const savePersonalClosing = async (c, userId) => {
  const row = {
    user_id: userId, month: c.month, year: c.year, total_income: c.totalIncome || 0, total_expenses: c.totalExpenses || 0,
    balance: c.balance || 0, accounts_total: c.accountsTotal || 0, investments_total: c.investmentsTotal || 0,
    debts_total: c.debtsTotal || 0, net_worth: c.netWorth || 0, notes: c.notes || null, closed_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('personal_monthly_closings').upsert(row, { onConflict: 'user_id,year,month' })
  if (error) throw error
}

// ── Preferências do Dashboard (widgets visíveis) ────────────────────────────
// 1 linha por usuário (unique user_id). Retorna o objeto de widgets ou null
// (null = nunca configurou ⇒ Dashboard mostra o padrão completo).
export const getDashboardPreferences = async () => {
  const { data, error } = await supabase
    .from('personal_dashboard_preferences')
    .select('visible_widgets')
    .maybeSingle()
  if (error) throw error
  return data?.visible_widgets || null
}
export const saveDashboardPreferences = async (visibleWidgets, userId) => {
  const row = { user_id: userId, visible_widgets: visibleWidgets || {} }
  const { error } = await supabase
    .from('personal_dashboard_preferences')
    .upsert(row, { onConflict: 'user_id' })
  if (error) throw error
}
