import { useState, useEffect, useCallback, useMemo } from 'react'
import { T } from '../theme'
import { useMobile } from '../context/MobileContext'
import './pf.css'
import {
  getPersonalAccounts, savePersonalAccount, deletePersonalAccount,
  getPersonalTransactions, savePersonalTransaction, deletePersonalTransaction,
  getPersonalCards, savePersonalCard, deletePersonalCard,
  getPersonalInvestments, savePersonalInvestment, deletePersonalInvestment,
  getPersonalDebts, savePersonalDebt, deletePersonalDebt,
  getPersonalGoals, savePersonalGoal, deletePersonalGoal,
  getPersonalCategories, savePersonalCategory, deletePersonalCategory,
  getNetWorthSnapshots, upsertNetWorthSnapshot,
  savePersonalTransactions,
  getPersonalRecurrences, savePersonalRecurrence, deletePersonalRecurrence, generateDueRecurrences,
  getPersonalTransfers, savePersonalTransfer, deletePersonalTransfer,
  getPersonalBudgets, savePersonalBudget, deletePersonalBudget,
  getCardInvoices, payCardInvoice, getMonthlyClosings, savePersonalClosing,
  getDashboardPreferences, saveDashboardPreferences,
} from '../personalSupabase'
import { CATS_RECEITA_PF, CATS_DESPESA_PF } from '../personalData'
import PersonalSidebar from './PersonalSidebar'
import PersonalDashboard from './pages/PersonalDashboard'
import PersonalReceitas from './pages/PersonalReceitas'
import PersonalDespesas from './pages/PersonalDespesas'
import PersonalFluxoCaixa from './pages/PersonalFluxoCaixa'
import PersonalContas from './pages/PersonalContas'
import PersonalCartoes from './pages/PersonalCartoes'
import PersonalInvestimentos from './pages/PersonalInvestimentos'
import PersonalDividas from './pages/PersonalDividas'
import PersonalMetas from './pages/PersonalMetas'
import PersonalRelatorios from './pages/PersonalRelatorios'
import PersonalCategorias from './pages/PersonalCategorias'
import PersonalPatrimonio from './pages/PersonalPatrimonio'
import PersonalOrcamento from './pages/PersonalOrcamento'
import PersonalFechamento from './pages/PersonalFechamento'
import PersonalRecorrentes from './pages/PersonalRecorrentes'
import PersonalImportar from './pages/PersonalImportar'
import PersonalFamilia from './pages/PersonalFamilia'

export default function PersonalApp({ usuario, profile, perfilFoto, onLogout }) {
  const isMobile = useMobile()
  const [page, setPage] = useState(() => localStorage.getItem('norvo_pf_page') || 'dashboard')
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [cards, setCards] = useState([])
  const [investments, setInvestments] = useState([])
  const [debts, setDebts] = useState([])
  const [goals, setGoals] = useState([])
  const [categories, setCategories] = useState([])
  const [snapshots, setSnapshots] = useState([])
  const [recurrences, setRecurrences] = useState([])
  const [transfers, setTransfers] = useState([])
  const [budgets, setBudgets] = useState([])
  const [cardInvoices, setCardInvoices] = useState([])
  const [closings, setClosings] = useState([])
  const [dashboardPrefs, setDashboardPrefs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('norvo_pf_sidebar') === '1')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const sidebarW = sidebarCollapsed ? 82 : 280

  useEffect(() => { localStorage.setItem('norvo_pf_page', page) }, [page])

  // Carrega dados pessoais (RLS já filtra por user_id).
  // Fetches F5 usam fallback vazio para não quebrar caso a migration 0013 ainda não
  // esteja aplicada — o núcleo F1–F4 continua carregando normalmente.
  useEffect(() => {
    let alive = true
    const safe = (p) => p.catch(() => [])
    const safeObj = (p) => p.catch(() => null)
    ;(async () => {
      try {
        try { await generateDueRecurrences(usuario.id) } catch (e) { /* recorrência é best-effort */ }
        const [accs, txs, crds, invs, dbts, gls, cats, snaps, recs, trs, buds, cinv, clos, prefs] = await Promise.all([
          getPersonalAccounts(), getPersonalTransactions(), getPersonalCards(),
          getPersonalInvestments(), getPersonalDebts(), getPersonalGoals(),
          getPersonalCategories(), getNetWorthSnapshots(),
          safe(getPersonalRecurrences()), safe(getPersonalTransfers()), safe(getPersonalBudgets()),
          safe(getCardInvoices()), safe(getMonthlyClosings()), safeObj(getDashboardPreferences()),
        ])
        if (!alive) return
        setAccounts(accs); setTransactions(txs); setCards(crds); setInvestments(invs)
        setDebts(dbts); setGoals(gls); setCategories(cats); setSnapshots(snaps)
        setRecurrences(recs); setTransfers(trs); setBudgets(buds); setCardInvoices(cinv); setClosings(clos)
        setDashboardPrefs(prefs)
        try {
          const accountsTotal = accs.reduce((s, a) => s + (a.saldoAtual || 0), 0)
          const investTotal = invs.reduce((s, i) => s + (i.current || 0), 0)
          const debtsTotal = dbts.filter(d => d.status !== 'quitada').reduce((s, d) => s + (d.remaining || 0), 0)
          await upsertNetWorthSnapshot(usuario.id, { accounts: accountsTotal, investments: investTotal, debts: debtsTotal })
          const fresh = await getNetWorthSnapshots()
          if (alive) setSnapshots(fresh)
        } catch (e) { /* snapshot é best-effort */ }
      } catch (e) { console.error(e) }
      finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [usuario])

  const onSaveTx = useCallback(async (item, isEdit) => {
    await savePersonalTransaction(item, usuario.id)
    setTransactions(prev => isEdit ? prev.map(t => t.id === item.id ? item : t) : [item, ...prev])
  }, [usuario])

  const onDeleteTx = useCallback(async (id) => {
    await deletePersonalTransaction(id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }, [])

  const onSaveAccount = useCallback(async (acc, isEdit) => {
    await savePersonalAccount(acc, usuario.id)
    setAccounts(prev => isEdit ? prev.map(a => a.id === acc.id ? acc : a) : [...prev, acc])
  }, [usuario])

  const onDeleteAccount = useCallback(async (id) => {
    await deletePersonalAccount(id)
    setAccounts(prev => prev.filter(a => a.id !== id))
  }, [])

  const onSaveCard = useCallback(async (c, isEdit) => {
    await savePersonalCard(c, usuario.id)
    setCards(prev => isEdit ? prev.map(x => x.id === c.id ? c : x) : [...prev, c])
  }, [usuario])
  const onDeleteCard = useCallback(async (id) => {
    await deletePersonalCard(id); setCards(prev => prev.filter(x => x.id !== id))
  }, [])

  const onSaveInvestment = useCallback(async (i, isEdit) => {
    await savePersonalInvestment(i, usuario.id)
    setInvestments(prev => isEdit ? prev.map(x => x.id === i.id ? i : x) : [...prev, i])
  }, [usuario])
  const onDeleteInvestment = useCallback(async (id) => {
    await deletePersonalInvestment(id); setInvestments(prev => prev.filter(x => x.id !== id))
  }, [])

  const onSaveDebt = useCallback(async (d, isEdit) => {
    await savePersonalDebt(d, usuario.id)
    setDebts(prev => isEdit ? prev.map(x => x.id === d.id ? d : x) : [...prev, d])
  }, [usuario])
  const onDeleteDebt = useCallback(async (id) => {
    await deletePersonalDebt(id); setDebts(prev => prev.filter(x => x.id !== id))
  }, [])

  const onSaveGoal = useCallback(async (g, isEdit) => {
    await savePersonalGoal(g, usuario.id)
    setGoals(prev => isEdit ? prev.map(x => x.id === g.id ? g : x) : [...prev, g])
  }, [usuario])
  const onDeleteGoal = useCallback(async (id) => {
    await deletePersonalGoal(id); setGoals(prev => prev.filter(x => x.id !== id))
  }, [])

  const onSaveCategory = useCallback(async (c, isEdit) => {
    await savePersonalCategory(c, usuario.id)
    setCategories(prev => isEdit ? prev.map(x => x.id === c.id ? c : x) : [...prev, c])
  }, [usuario])
  const onDeleteCategory = useCallback(async (id) => {
    await deletePersonalCategory(id); setCategories(prev => prev.filter(x => x.id !== id))
  }, [])

  // ── F5: lote (parcelamento), recorrências, transferências, orçamento, fatura, fechamento ──
  const onSaveTxBatch = useCallback(async (items) => {
    await savePersonalTransactions(items, usuario.id)
    setTransactions(prev => [...items, ...prev])
  }, [usuario])

  const onSaveRecurrence = useCallback(async (r) => {
    const id = await savePersonalRecurrence(r, usuario.id)
    // gera imediatamente os lançamentos vencidos e recarrega
    try { await generateDueRecurrences(usuario.id) } catch (e) { /* best-effort */ }
    const [recs, txs] = await Promise.all([getPersonalRecurrences(), getPersonalTransactions()])
    setRecurrences(recs); setTransactions(txs)
    return id
  }, [usuario])
  const onDeleteRecurrence = useCallback(async (id) => {
    await deletePersonalRecurrence(id); setRecurrences(prev => prev.filter(x => x.id !== id))
  }, [])

  const onSaveTransfer = useCallback(async (t) => {
    const saved = await savePersonalTransfer(t, usuario.id)
    // movimentação interna: origem −valor, destino +valor
    const from = accounts.find(a => a.id === t.fromId)
    const to = accounts.find(a => a.id === t.toId)
    if (from) { const upd = { ...from, saldoAtual: (from.saldoAtual || 0) - (t.valor || 0) }; await savePersonalAccount(upd, usuario.id); setAccounts(prev => prev.map(a => a.id === upd.id ? upd : a)) }
    if (to) { const upd = { ...to, saldoAtual: (to.saldoAtual || 0) + (t.valor || 0) }; await savePersonalAccount(upd, usuario.id); setAccounts(prev => prev.map(a => a.id === upd.id ? upd : a)) }
    setTransfers(prev => [saved, ...prev])
  }, [usuario, accounts])
  const onDeleteTransfer = useCallback(async (id) => {
    const t = transfers.find(x => x.id === id)
    if (t) { // reverte a movimentação
      const from = accounts.find(a => a.id === t.fromId); const to = accounts.find(a => a.id === t.toId)
      if (from) { const upd = { ...from, saldoAtual: (from.saldoAtual || 0) + (t.valor || 0) }; await savePersonalAccount(upd, usuario.id); setAccounts(prev => prev.map(a => a.id === upd.id ? upd : a)) }
      if (to) { const upd = { ...to, saldoAtual: (to.saldoAtual || 0) - (t.valor || 0) }; await savePersonalAccount(upd, usuario.id); setAccounts(prev => prev.map(a => a.id === upd.id ? upd : a)) }
    }
    await deletePersonalTransfer(id); setTransfers(prev => prev.filter(x => x.id !== id))
  }, [usuario, accounts, transfers])

  const onSaveBudget = useCallback(async (b) => {
    const saved = await savePersonalBudget(b, usuario.id)
    setBudgets(prev => prev.some(x => x.id === saved.id) ? prev.map(x => x.id === saved.id ? saved : x) : [...prev, saved])
  }, [usuario])
  const onDeleteBudget = useCallback(async (id) => {
    await deletePersonalBudget(id); setBudgets(prev => prev.filter(x => x.id !== id))
  }, [])

  const onPayInvoice = useCallback(async ({ cardId, competencia, amount, accountId }) => {
    await payCardInvoice({ userId: usuario.id, cardId, competencia, amount, accountId })
    const acc = accounts.find(a => a.id === accountId)
    if (acc) { const upd = { ...acc, saldoAtual: (acc.saldoAtual || 0) - (amount || 0) }; await savePersonalAccount(upd, usuario.id); setAccounts(prev => prev.map(a => a.id === upd.id ? upd : a)) }
    const cinv = await getCardInvoices(); setCardInvoices(cinv)
  }, [usuario, accounts])

  const onSaveClosing = useCallback(async (c) => {
    await savePersonalClosing(c, usuario.id)
    const clos = await getMonthlyClosings(); setClosings(clos)
  }, [usuario])

  // Personalização do Dashboard: persiste os widgets visíveis por usuário.
  const onSaveDashboardPrefs = useCallback(async (widgets) => {
    await saveDashboardPreferences(widgets, usuario.id)
    setDashboardPrefs(widgets)
  }, [usuario])

  // Categorias efetivas = padrão (fixas) + personalizadas. `active` controla o dropdown;
  // a resolução de nome/cor usa todas (mantém registros antigos legíveis mesmo se inativadas).
  const catsReceita = useMemo(() => {
    const custom = categories.filter(c => c.type === 'receita' || c.type === 'ambos')
      .map(c => ({ id: c.id, nome: c.name, cor: c.color, active: c.isActive, custom: true }))
    return [...CATS_RECEITA_PF.map(c => ({ ...c, active: true })), ...custom]
  }, [categories])
  const catsDespesa = useMemo(() => {
    const custom = categories.filter(c => c.type === 'despesa' || c.type === 'ambos')
      .map(c => ({ id: c.id, nome: c.name, cor: c.color, active: c.isActive, custom: true }))
    return [...CATS_DESPESA_PF.map(c => ({ ...c, active: true })), ...custom]
  }, [categories])

  const shared = {
    usuario, profile, accounts, transactions, cards, investments, debts, goals,
    categories, snapshots, catsReceita, catsDespesa,
    recurrences, transfers, budgets, cardInvoices, closings, dashboardPrefs,
    onSaveTx, onSaveTxBatch, onDeleteTx, onSaveAccount, onDeleteAccount,
    onSaveCard, onDeleteCard, onSaveInvestment, onDeleteInvestment,
    onSaveDebt, onDeleteDebt, onSaveGoal, onDeleteGoal,
    onSaveCategory, onDeleteCategory,
    onSaveRecurrence, onDeleteRecurrence, onSaveTransfer, onDeleteTransfer,
    onSaveBudget, onDeleteBudget, onPayInvoice, onSaveClosing, onSaveDashboardPrefs, setPage,
  }

  const renderPage = () => {
    if (loading) {
      return <div style={{ textAlign: 'center', padding: '80px 20px', color: T.muted, fontSize: 14 }}>Carregando suas finanças…</div>
    }
    switch (page) {
      case 'dashboard':     return <PersonalDashboard {...shared} />
      case 'receitas':      return <PersonalReceitas {...shared} />
      case 'despesas':      return <PersonalDespesas {...shared} />
      case 'fluxo-caixa':   return <PersonalFluxoCaixa {...shared} />
      case 'contas':        return <PersonalContas {...shared} />
      case 'cartoes':       return <PersonalCartoes {...shared} />
      case 'investimentos': return <PersonalInvestimentos {...shared} />
      case 'dividas':       return <PersonalDividas {...shared} />
      case 'metas':         return <PersonalMetas {...shared} />
      case 'patrimonio':    return <PersonalPatrimonio {...shared} />
      case 'orcamento':     return <PersonalOrcamento {...shared} />
      case 'fechamento':    return <PersonalFechamento {...shared} />
      case 'recorrentes':   return <PersonalRecorrentes {...shared} />
      case 'importar':      return <PersonalImportar {...shared} />
      case 'categorias':    return <PersonalCategorias {...shared} />
      case 'familia':       return <PersonalFamilia {...shared} />
      case 'relatorios':    return <PersonalRelatorios {...shared} />
      default:              return <PersonalDashboard {...shared} />
    }
  }

  return (
    <div className="pf-scope" style={{ display: 'flex', minHeight: '100vh', background: T.bg, fontFamily: "'Segoe UI', sans-serif" }}>
      <PersonalSidebar
        page={page} setPage={setPage}
        collapsed={sidebarCollapsed}
        onToggle={() => { const n = !sidebarCollapsed; setSidebarCollapsed(n); localStorage.setItem('norvo_pf_sidebar', n ? '1' : '') }}
        usuario={usuario} perfilFoto={perfilFoto} onLogout={onLogout}
        isMobile={isMobile} mobileOpen={mobileMenuOpen}
        onMobileOpen={() => setMobileMenuOpen(true)} onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div style={{ marginLeft: isMobile ? 0 : sidebarW, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0, transition: 'margin-left .2s ease' }}>
        <main style={{ flex: 1, padding: isMobile ? '18px 14px calc(80px + env(safe-area-inset-bottom, 0px))' : '28px 28px 40px', overflowX: 'hidden' }}>
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
