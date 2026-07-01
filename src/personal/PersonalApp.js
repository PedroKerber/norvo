import { useState, useEffect, useCallback } from 'react'
import { T } from '../theme'
import { useMobile } from '../context/MobileContext'
import {
  getPersonalAccounts, savePersonalAccount, deletePersonalAccount,
  getPersonalTransactions, savePersonalTransaction, deletePersonalTransaction,
  getPersonalCards, savePersonalCard, deletePersonalCard,
  getPersonalInvestments, savePersonalInvestment, deletePersonalInvestment,
  getPersonalDebts, savePersonalDebt, deletePersonalDebt,
  getPersonalGoals, savePersonalGoal, deletePersonalGoal,
} from '../personalSupabase'
import PersonalSidebar from './PersonalSidebar'
import PersonalDashboard from './pages/PersonalDashboard'
import PersonalReceitas from './pages/PersonalReceitas'
import PersonalDespesas from './pages/PersonalDespesas'
import PersonalContas from './pages/PersonalContas'
import PersonalCartoes from './pages/PersonalCartoes'
import PersonalInvestimentos from './pages/PersonalInvestimentos'
import PersonalDividas from './pages/PersonalDividas'
import PersonalMetas from './pages/PersonalMetas'
import PersonalRelatorios from './pages/PersonalRelatorios'

export default function PersonalApp({ usuario, profile, perfilFoto, onLogout }) {
  const isMobile = useMobile()
  const [page, setPage] = useState(() => localStorage.getItem('norvo_pf_page') || 'dashboard')
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [cards, setCards] = useState([])
  const [investments, setInvestments] = useState([])
  const [debts, setDebts] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('norvo_pf_sidebar') === '1')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const sidebarW = sidebarCollapsed ? 82 : 280

  useEffect(() => { localStorage.setItem('norvo_pf_page', page) }, [page])

  // Carrega dados pessoais (RLS já filtra por user_id)
  useEffect(() => {
    let alive = true
    Promise.all([
      getPersonalAccounts(), getPersonalTransactions(), getPersonalCards(),
      getPersonalInvestments(), getPersonalDebts(), getPersonalGoals(),
    ])
      .then(([accs, txs, crds, invs, dbts, gls]) => {
        if (!alive) return
        setAccounts(accs); setTransactions(txs); setCards(crds)
        setInvestments(invs); setDebts(dbts); setGoals(gls)
      })
      .catch(console.error)
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

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

  const shared = {
    usuario, profile, accounts, transactions, cards, investments, debts, goals,
    onSaveTx, onDeleteTx, onSaveAccount, onDeleteAccount,
    onSaveCard, onDeleteCard, onSaveInvestment, onDeleteInvestment,
    onSaveDebt, onDeleteDebt, onSaveGoal, onDeleteGoal, setPage,
  }

  const renderPage = () => {
    if (loading) {
      return <div style={{ textAlign: 'center', padding: '80px 20px', color: T.muted, fontSize: 14 }}>Carregando suas finanças…</div>
    }
    switch (page) {
      case 'dashboard':     return <PersonalDashboard {...shared} />
      case 'receitas':      return <PersonalReceitas {...shared} />
      case 'despesas':      return <PersonalDespesas {...shared} />
      case 'contas':        return <PersonalContas {...shared} />
      case 'cartoes':       return <PersonalCartoes {...shared} />
      case 'investimentos': return <PersonalInvestimentos {...shared} />
      case 'dividas':       return <PersonalDividas {...shared} />
      case 'metas':         return <PersonalMetas {...shared} />
      case 'relatorios':    return <PersonalRelatorios {...shared} />
      default:              return <PersonalDashboard {...shared} />
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, fontFamily: "'Segoe UI', sans-serif" }}>
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
