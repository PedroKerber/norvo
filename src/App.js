import { useState, useCallback, useEffect } from 'react'
import { useMobile } from './context/MobileContext'
import { T, uid } from './theme'
import { initData, EMPRESAS, CATS_KZL } from './data'
import { supabase, getAllLancamentos, getLancamentos, saveLancamento, deleteLancamento, saveLancamentos, getMetas, saveMeta, deleteMeta, signIn, signOut, deleteAllLancamentos, deleteAllMetas } from './supabase'

import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'

import Login from './pages/Login'
import SelectEmpresa from './pages/SelectEmpresa'
import Dashboard from './pages/Dashboard'
import Receitas from './pages/Receitas'
import Despesas from './pages/Despesas'
import Transacoes from './pages/Transacoes'
import FluxoCaixa from './pages/FluxoCaixa'
import MesFechado from './pages/MesFechado'
import Metas from './pages/Metas'
import Importar from './pages/Importar'
import RetiradaSocios from './pages/RetiradaSocios'
import Relatorios from './pages/Relatorios'
import Empresas from './pages/Empresas'
import Categorias from './pages/Categorias'
import CentroCusto from './pages/CentroCusto'
import Usuarios from './pages/Usuarios'
import Configuracoes from './pages/Configuracoes'
import Notificacoes from './pages/Notificacoes'
import Placeholder from './pages/Placeholder'

const PLACEHOLDER_PAGES = ['fornecedores', 'clientes', 'scanner', 'contas_pagar', 'contas_receber']

export default function App() {
  const isMobile = useMobile()
  const [usuario, setUsuario] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [page, setPage] = useState(() => localStorage.getItem('x8_last_page') || 'dashboard')
  const [appData, setAppData] = useState(() => initData())
  const [empresas, setEmpresas] = useState(EMPRESAS)
  const [extraCats, setExtraCats] = useState(() => { try { return JSON.parse(localStorage.getItem('x8_cats') || '[]') } catch { return [] } })
  const [loading, setLoading] = useState(true)
  const [perfilFoto, setPerfilFoto] = useState(() => localStorage.getItem('x8_foto') || '')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('x8_sidebar') === '1')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const sidebarW = sidebarCollapsed ? 82 : 280

  // Verifica sessão ao carregar
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUsuario({ id: data.session.user.id, email: data.session.user.email, nome: data.session.user.email.split('@')[0] })
      }
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUsuario({ id: session.user.id, email: session.user.email, nome: session.user.email.split('@')[0] })
      } else {
        setUsuario(null)
        setEmpresa(null)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Salva página e empresa no localStorage para sobreviver ao reload
  useEffect(() => { localStorage.setItem('x8_last_page', page) }, [page])
  useEffect(() => { if (empresa) localStorage.setItem('x8_last_empresa', empresa.id) }, [empresa])

  // Carrega empresas customizadas do localStorage e restaura última empresa selecionada
  useEffect(() => {
    if (!usuario) return
    let all = [...EMPRESAS]
    try {
      const custom = JSON.parse(localStorage.getItem(`x8_empresas_${usuario.id}`) || '[]')
      if (custom.length > 0) all = [...EMPRESAS, ...custom]
    } catch {}
    setEmpresas(all)
    const lastId = localStorage.getItem('x8_last_empresa')
    if (lastId) {
      const found = all.find(e => e.id === lastId)
      if (found) setEmpresa(found)
    }
    // Pré-carrega todos os lançamentos para exibir stats na tela de seleção
    getAllLancamentos(usuario.id).then(lancs => {
      const byEmp = {}
      lancs.forEach(l => {
        if (!byEmp[l.empId]) byEmp[l.empId] = []
        byEmp[l.empId].push(l)
      })
      setAppData(prev => {
        const next = { ...prev }
        Object.entries(byEmp).forEach(([empId, ls]) => {
          next[empId] = { ...(next[empId] || { metas: [], mesFechado: false }), lancamentos: ls }
        })
        return next
      })
    }).catch(console.error)
  }, [usuario])

  // Carrega dados da empresa selecionada do banco
  useEffect(() => {
    if (!usuario || !empresa) return
    const userId = usuario.id
    const empId = empresa.id
    Promise.all([
      getLancamentos(userId, empId),
      getMetas(userId, empId),
    ]).then(([lancamentos, metas]) => {
      setAppData(prev => ({ ...prev, [empId]: { ...prev[empId], lancamentos, metas } }))
    }).catch(console.error)
  }, [usuario, empresa])

  const empData = empresa ? (appData[empresa.id] || { lancamentos: [], metas: [] }) : { lancamentos: [], metas: [] }

  const handleLogin = useCallback(async (email, senha) => {
    const user = await signIn(email, senha)
    setUsuario({ id: user.id, email: user.email, nome: user.email.split('@')[0] })
  }, [])

  const handlePerfilUpdate = useCallback(() => {
    setPerfilFoto(localStorage.getItem('x8_foto') || '')
  }, [])

  const handleLogout = useCallback(async () => {
    await signOut()
    localStorage.removeItem('x8_last_empresa')
    localStorage.removeItem('x8_last_page')
    setUsuario(null)
    setEmpresa(null)
    setPage('dashboard')
  }, [])

  const handleSave = useCallback(async (item, isEdit, tipo) => {
    const empId = item.empId || empresa?.id
    if (tipo === 'meta') {
      const metaItem = { ...item, empId }
      await saveMeta(metaItem, usuario.id)
      setAppData(prev => {
        const metas = prev[empId]?.metas || []
        const updated = isEdit ? metas.map(m => m.id === item.id ? item : m) : [...metas, item]
        return { ...prev, [empId]: { ...prev[empId], metas: updated } }
      })
    } else {
      await saveLancamento(item, usuario.id)
      setAppData(prev => {
        const lancs = prev[empId]?.lancamentos || []
        const updated = isEdit ? lancs.map(l => l.id === item.id ? item : l) : [...lancs, item]
        return { ...prev, [empId]: { ...prev[empId], lancamentos: updated } }
      })
    }
  }, [empresa, usuario])

  const handleImport = useCallback(async (items) => {
    const empId = empresa.id
    await saveLancamentos(items, usuario.id)
    setAppData(prev => ({
      ...prev,
      [empId]: { ...prev[empId], lancamentos: [...(prev[empId]?.lancamentos || []), ...items] }
    }))
  }, [empresa, usuario])

  const handleSaveBatch = useCallback(async (items) => {
    if (!items || items.length === 0) return
    const empId = items[0].empId || empresa?.id
    await saveLancamentos(items, usuario.id)
    setAppData(prev => ({
      ...prev,
      [empId]: { ...prev[empId], lancamentos: [...(prev[empId]?.lancamentos || []), ...items] }
    }))
  }, [empresa, usuario])

  const handleDelete = useCallback(async (id, tipo) => {
    if (!empresa) return
    const empId = empresa.id
    if (tipo === 'meta') {
      await deleteMeta(id)
      setAppData(prev => ({ ...prev, [empId]: { ...prev[empId], metas: (prev[empId]?.metas || []).filter(m => m.id !== id) } }))
    } else {
      await deleteLancamento(id)
      setAppData(prev => ({ ...prev, [empId]: { ...prev[empId], lancamentos: (prev[empId]?.lancamentos || []).filter(l => l.id !== id) } }))
    }
  }, [empresa])

  const handleFecharMes = useCallback(() => {
    if (!empresa) return
    setAppData(prev => ({ ...prev, [empresa.id]: { ...prev[empresa.id], mesFechado: true } }))
  }, [empresa])

  const handleReabrirMes = useCallback(() => {
    if (!empresa) return
    setAppData(prev => ({ ...prev, [empresa.id]: { ...prev[empresa.id], mesFechado: false } }))
  }, [empresa])

  const handleSaveEmpresa = useCallback((form) => {
    const words = form.nome.trim().split(/\s+/).filter(Boolean)
    const initials = words.slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'EM'
    const newEmp = {
      id: uid(),
      nome: form.nome.trim(),
      initials,
      cnpj: form.cnpj.trim(),
      cor: form.cor || '#16a34a',
      setor: form.setor.trim(),
    }
    try {
      const saved = JSON.parse(localStorage.getItem(`x8_empresas_${usuario.id}`) || '[]')
      localStorage.setItem(`x8_empresas_${usuario.id}`, JSON.stringify([...saved, newEmp]))
    } catch {}
    setEmpresas(prev => [...prev, newEmp])
    setAppData(prev => ({ ...prev, [newEmp.id]: { lancamentos: [], metas: [], mesFechado: false } }))
  }, [usuario])

  const handleSaveCat = useCallback((cat, isEdit) => {
    setExtraCats(prev => {
      const next = isEdit ? prev.map(c => c.id === cat.id ? cat : c) : [...prev, cat]
      try { localStorage.setItem('x8_cats', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const handleDeleteCat = useCallback((id) => {
    setExtraCats(prev => {
      const next = prev.filter(c => c.id !== id)
      try { localStorage.setItem('x8_cats', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const handleReset = useCallback(async () => {
    if (usuario) {
      await deleteAllLancamentos(usuario.id)
      await deleteAllMetas(usuario.id)
    }
    localStorage.removeItem('x8_notifs')
    localStorage.removeItem('x8_ultimas')
    localStorage.setItem('x8_data_reset', '1')
    setAppData(initData())
  }, [usuario])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.sidebar, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#fff', fontFamily: "'Segoe UI', sans-serif", textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 12 }}><span style={{ color: T.primary }}>X8</span> Finance</div>
          <div style={{ color: T.sidebarText, fontSize: 14 }}>Carregando...</div>
        </div>
      </div>
    )
  }

  if (!usuario) {
    return <Login onLogin={handleLogin} />
  }

  if (!empresa) {
    return (
      <SelectEmpresa
        usuario={usuario}
        onSelect={emp => { setEmpresa(emp); setPage('dashboard') }}
        data={appData}
        onLogout={handleLogout}
        empresas={empresas}
        onSaveEmpresa={handleSaveEmpresa}
      />
    )
  }

  const effectiveExtraCats = empresa?.id === 'kzl' ? CATS_KZL : extraCats
  const sharedProps = { empresa, data: empData, setPage, onSave: handleSave, onDelete: handleDelete, onSaveBatch: handleSaveBatch, extraCats: effectiveExtraCats }

  const renderPage = () => {
    if (PLACEHOLDER_PAGES.includes(page)) return <Placeholder page={page} />
    switch (page) {
      case 'dashboard': return <Dashboard {...sharedProps} />
      case 'receitas': return <Receitas {...sharedProps} />
      case 'despesas': return <Despesas {...sharedProps} />
      case 'transacoes': return <Transacoes {...sharedProps} onNovaDespesa={() => setPage('despesas')} onNovaReceita={() => setPage('receitas')} />
      case 'fluxo': return <FluxoCaixa {...sharedProps} />
      case 'mes_fechado': return <MesFechado {...sharedProps} onFechar={handleFecharMes} onReabrir={handleReabrirMes} usuario={usuario} />
      case 'metas': return <Metas {...sharedProps} />
      case 'importar': return <Importar empresa={empresa} onImport={handleImport} />
      case 'retirada_socios': return <RetiradaSocios {...sharedProps} />
      case 'relatorios': return <Relatorios {...sharedProps} />
      case 'empresas': return <Empresas setPage={setPage} empresas={empresas} onSaveEmpresa={handleSaveEmpresa} />
      case 'categorias': return <Categorias {...sharedProps} onSaveCat={handleSaveCat} onDeleteCat={handleDeleteCat} />
      case 'centro_custo': return <CentroCusto {...sharedProps} />
      case 'usuarios': return <Usuarios usuario={usuario} />
      case 'configuracoes': return <Configuracoes usuario={usuario} onLogout={handleLogout} empresa={empresa} onPerfilUpdate={handlePerfilUpdate} setPage={setPage} onReset={handleReset} />
      case 'notificacoes': return <Notificacoes setPage={setPage} />
      default: return <Placeholder page={page} />
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, fontFamily: "'Segoe UI', sans-serif" }}>
      <Sidebar
        page={page} setPage={setPage}
        collapsed={sidebarCollapsed}
        onToggle={() => {
          const n = !sidebarCollapsed
          setSidebarCollapsed(n)
          localStorage.setItem('x8_sidebar', n ? '1' : '')
        }}
        usuario={usuario} perfilFoto={perfilFoto} onLogout={handleLogout} empresa={empresa}
        isMobile={isMobile}
        mobileOpen={mobileMenuOpen}
        onMobileOpen={() => setMobileMenuOpen(true)}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div style={{ marginLeft: isMobile ? 0 : sidebarW, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0, transition: 'margin-left .2s ease' }}>
        <TopBar
          empresa={empresa}
          setEmpresa={emp => { setEmpresa(emp); setPage('dashboard'); localStorage.setItem('x8_last_page', 'dashboard') }}
          usuario={usuario}
          onLogout={handleLogout}
          setPage={setPage}
          sidebarWidth={isMobile ? 0 : sidebarW}
          isMobile={isMobile}
        />
        <main style={{ flex: 1, marginTop: 60, padding: isMobile ? '16px 14px 80px' : '28px 28px 40px', overflowX: 'hidden' }}>
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
