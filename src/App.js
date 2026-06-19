import { useState, useCallback, useEffect } from 'react'
import { useMobile } from './context/MobileContext'
import { T, uid } from './theme'
import { initData, EMPRESAS, CATS_KZL } from './data'
import { isModuloPermitido, labelSegmento } from './modules'
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
import ComparativoEmpresas from './pages/ComparativoEmpresas'
import AtivarConta from './pages/AtivarConta'
import Configuracoes from './pages/Configuracoes'
import Notificacoes from './pages/Notificacoes'
import Placeholder from './pages/Placeholder'
import ViabilidadeIncorporacao from './pages/ViabilidadeIncorporacao'

const PLACEHOLDER_PAGES = ['fornecedores', 'clientes', 'scanner', 'contas_pagar', 'contas_receber']

export default function App() {
  const isMobile = useMobile()

  const [isInviteFlow] = useState(() => {
    const path = window.location.pathname
    const params = new URLSearchParams(window.location.hash.substring(1))
    const type = params.get('type')
    const errorCode = params.get('error_code')
    return path === '/ativar-conta' || type === 'invite' || errorCode === 'otp_expired' || errorCode === 'access_denied'
  })

  const [usuario, setUsuario] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [page, setPage] = useState(() => localStorage.getItem('x8_last_page') || 'dashboard')
  const [appData, setAppData] = useState(() => initData())
  const [empresas, setEmpresas] = useState(EMPRESAS)
  const [extraCats, setExtraCats] = useState(() => { try { return JSON.parse(localStorage.getItem('x8_cats') || '[]') } catch { return [] } })
  const [loading, setLoading] = useState(true)
  const [perfilFoto, setPerfilFoto] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('x8_sidebar') === '1')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const sidebarW = sidebarCollapsed ? 82 : 280

  // Verifica sessão ao carregar
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const u = data.session.user
        setUsuario({ id: u.id, email: u.email, nome: u.user_metadata?.nome || u.email.split('@')[0], perfil: u.user_metadata?.perfil || 'master', cargo: u.user_metadata?.cargo || '' })
        setPerfilFoto(localStorage.getItem(`x8_foto_${u.id}`) || '')
      }
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user
        setUsuario({ id: u.id, email: u.email, nome: u.user_metadata?.nome || u.email.split('@')[0], perfil: u.user_metadata?.perfil || 'master', cargo: u.user_metadata?.cargo || '' })
        setPerfilFoto(localStorage.getItem(`x8_foto_${u.id}`) || '')
      } else {
        setUsuario(null)
        setEmpresa(null)
        setPerfilFoto('')
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

    const applyEmpresas = (list) => {
      setEmpresas(list)
      const lastId = localStorage.getItem('x8_last_empresa')
      if (lastId) {
        const found = list.find(e => e.id === lastId)
        if (found) setEmpresa(found)
      }
    }

    // Usuários não-master/admin só veem as empresas às quais têm acesso
    if (usuario.perfil && usuario.perfil !== 'master' && usuario.perfil !== 'admin') {
      supabase.from('user_empresa_access')
        .select('empresa_id')
        .eq('collaborator_user_id', usuario.id)
        .then(({ data: accessData }) => {
          if (accessData && accessData.length > 0) {
            const ids = new Set(accessData.map(r => r.empresa_id))
            const accessible = all.filter(e => ids.has(e.id))
            applyEmpresas(accessible.length > 0 ? accessible : all)
          } else {
            applyEmpresas(all)
          }
        })
        .catch(() => applyEmpresas(all))
    } else {
      applyEmpresas(all)
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
    setUsuario({ id: user.id, email: user.email, nome: user.user_metadata?.nome || user.email.split('@')[0], perfil: user.user_metadata?.perfil || 'master', cargo: user.user_metadata?.cargo || '' })
    setPerfilFoto(localStorage.getItem(`x8_foto_${user.id}`) || '')
  }, [])

  const handlePerfilUpdate = useCallback(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id
      if (uid) setPerfilFoto(localStorage.getItem(`x8_foto_${uid}`) || '')
    })
  }, [])

  const handleLogout = useCallback(async () => {
    await signOut()
    localStorage.removeItem('x8_last_empresa')
    localStorage.removeItem('x8_last_page')
    localStorage.removeItem('x8_foto')
    localStorage.removeItem('x8_perfil')
    localStorage.removeItem('x8_usuarios_v2')
    Object.keys(localStorage)
      .filter(k => k.startsWith('x8_perms_'))
      .forEach(k => localStorage.removeItem(k))
    setPerfilFoto('')
    setUsuario(null)
    setEmpresas(EMPRESAS)
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
      segmento: form.segmento || '',
      setor: labelSegmento(form.segmento),
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

  if (isInviteFlow) return <AtivarConta />

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.sidebar, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#fff', fontFamily: "'Segoe UI', sans-serif", textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 12 }}><span style={{ color: T.primary }}>Norvo</span></div>
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

    // ── Guarda de segmento: bloqueia módulos não permitidos ──────────────────
    if (!isModuloPermitido(page, empresa?.segmento)) {
      const segLabel = labelSegmento(empresa?.segmento)
      return (
        <div style={{ textAlign: 'center', padding: '64px 24px', fontFamily: "'Segoe UI', sans-serif" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontWeight: 800, fontSize: 22, margin: '0 0 10px', color: 'var(--text)' }}>
            Módulo não disponível
          </h2>
          <p style={{ color: 'var(--text-sub)', fontSize: 15, maxWidth: 420, margin: '0 auto 10px', lineHeight: 1.6 }}>
            Este módulo não está disponível para empresas do segmento
            {' '}<strong style={{ color: T.primary }}>{segLabel}</strong>.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Se precisar desta funcionalidade, verifique com o administrador do sistema.
          </p>
          <button
            onClick={() => setPage('dashboard')}
            style={{ marginTop: 24, background: T.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            ← Voltar ao Dashboard
          </button>
        </div>
      )
    }

    switch (page) {
      case 'dashboard': return <Dashboard {...sharedProps} allData={appData} allEmpresas={empresas} />
      case 'receitas': return <Receitas {...sharedProps} />
      case 'despesas': return <Despesas {...sharedProps} />
      case 'transacoes': return <Transacoes {...sharedProps} onNovaDespesa={() => setPage('despesas')} onNovaReceita={() => setPage('receitas')} />
      case 'fluxo': return <FluxoCaixa {...sharedProps} />
      case 'mes_fechado': return <MesFechado {...sharedProps} onFechar={handleFecharMes} onReabrir={handleReabrirMes} usuario={usuario} />
      case 'metas': return <Metas {...sharedProps} />
      case 'importar': return <Importar empresa={empresa} onImport={handleImport} />
      case 'retirada_socios': return <RetiradaSocios {...sharedProps} />
      case 'relatorios': return <Relatorios {...sharedProps} allData={appData} allEmpresas={empresas} />
      case 'comparativo_empresas': return <ComparativoEmpresas appData={appData} empresas={empresas} />
      case 'empresas': return <Empresas setPage={setPage} empresas={empresas} onSaveEmpresa={handleSaveEmpresa} />
      case 'categorias': return <Categorias {...sharedProps} onSaveCat={handleSaveCat} onDeleteCat={handleDeleteCat} />
      case 'centro_custo': return <CentroCusto {...sharedProps} />
      case 'usuarios': return <Usuarios usuario={usuario} />
      case 'configuracoes': return <Configuracoes usuario={usuario} onLogout={handleLogout} empresa={empresa} onPerfilUpdate={handlePerfilUpdate} setPage={setPage} onReset={handleReset} />
      case 'notificacoes': return <Notificacoes setPage={setPage} />
      case 'viabilidade_inc': return <ViabilidadeIncorporacao />
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
          empresas={empresas}
        />
        <main style={{ flex: 1, marginTop: 60, padding: isMobile ? '16px 14px calc(80px + env(safe-area-inset-bottom, 0px))' : '28px 28px 40px', overflowX: 'hidden' }}>
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
