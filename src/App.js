import { useState, useCallback, useEffect } from 'react'
import { useMobile } from './context/MobileContext'
import { T, uid } from './theme'
import { initData, EMPRESAS, CATS_KZL } from './data'
import { getModuloStatus, labelSegmento, labelPlano, getLimitesPlano } from './modules'
import { supabase, getAllLancamentos, getLancamentos, saveLancamento, deleteLancamento, saveLancamentos, getMetas, saveMeta, deleteMeta, signIn, signOut, deleteAllLancamentos, deleteAllMetas, getEmpresas, seedEmpresas, saveEmpresa, updateEmpresa, setEmpresaStatus, getCategorias, saveCategoria, deleteCategoria, getMyAccess } from './supabase'

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
import MeuPlano from './pages/MeuPlano'

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
  const [extraCats, setExtraCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [perfilFoto, setPerfilFoto] = useState('')
  const [acesso, setAcesso] = useState(null) // { isMaster, empresas } — verdade do servidor (Fase 2)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('x8_sidebar') === '1')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const sidebarW = sidebarCollapsed ? 82 : 280

  // Verifica sessão ao carregar
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const u = data.session.user
        setUsuario({ id: u.id, email: u.email, nome: u.user_metadata?.nome || u.email.split('@')[0], perfil: u.user_metadata?.perfil || null, cargo: u.user_metadata?.cargo || '', telefone: u.user_metadata?.telefone || '', cpf: u.user_metadata?.cpf || '', foto: u.user_metadata?.foto || '' })
        setPerfilFoto(u.user_metadata?.foto || '')
      }
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user
        setUsuario({ id: u.id, email: u.email, nome: u.user_metadata?.nome || u.email.split('@')[0], perfil: u.user_metadata?.perfil || null, cargo: u.user_metadata?.cargo || '', telefone: u.user_metadata?.telefone || '', cpf: u.user_metadata?.cpf || '', foto: u.user_metadata?.foto || '' })
        setPerfilFoto(u.user_metadata?.foto || '')
      } else {
        setUsuario(null)
        setEmpresa(null)
        setPerfilFoto('')
        setAcesso(null)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Salva página e empresa no localStorage para sobreviver ao reload
  useEffect(() => { localStorage.setItem('x8_last_page', page) }, [page])
  useEffect(() => { if (empresa) localStorage.setItem('x8_last_empresa', empresa.id) }, [empresa])

  // Carrega empresas do Supabase (com seed na 1ª carga) e restaura última empresa.
  // Fallback para localStorage/EMPRESAS durante a transição (Fase 4).
  useEffect(() => {
    if (!usuario) return

    const customLS = (() => {
      try { return JSON.parse(localStorage.getItem(`x8_empresas_${usuario.id}`) || '[]') } catch { return [] }
    })()
    const fallbackAll = [...EMPRESAS, ...customLS]
    // isOwner agora vem do servidor (user_roles.is_master) — definido dentro do IIFE.

    const applyEmpresas = (list) => {
      setEmpresas(list)
      const lastId = localStorage.getItem('x8_last_empresa')
      if (lastId) {
        const found = list.find(e => e.id === lastId)
        if (found && found.status !== 'inativa') setEmpresa(found)
      }
    }

    ;(async () => {
      const acc = await getMyAccess()
      setAcesso(acc)
      const isOwner = acc.isMaster
      try {
        let emps = await getEmpresas()
        if (isOwner) {
          // Correção segura e idempotente: leva ao Supabase as empresas que ainda
          // só existem no localStorage (demo na 1ª carga + órfãs do dono), preservando
          // id e owner. Nunca apaga nem sobrescreve (upsert ignoreDuplicates).
          const existentes = new Set(emps.map(e => e.id))
          const aSemear = []
          if (emps.length === 0) aSemear.push(...EMPRESAS)
          customLS.forEach(e => { if (e?.id && !existentes.has(e.id)) aSemear.push(e) })
          if (aSemear.length > 0) {
            await seedEmpresas(aSemear, usuario.id)
            emps = await getEmpresas()
          }
        }
        applyEmpresas(emps.length > 0 ? emps : fallbackAll)
      } catch {
        // tabela ainda não criada / erro de rede → comportamento anterior
        if (!isOwner) {
          try {
            const { data } = await supabase.from('user_empresa_access')
              .select('empresa_id').eq('collaborator_user_id', usuario.id)
            const ids = new Set((data || []).map(r => r.empresa_id))
            const accessible = fallbackAll.filter(e => ids.has(e.id))
            applyEmpresas(accessible.length > 0 ? accessible : fallbackAll)
          } catch { applyEmpresas(fallbackAll) }
        } else {
          applyEmpresas(fallbackAll)
        }
      }
    })()

    // Pré-carrega todos os lançamentos para exibir stats na tela de seleção
    getAllLancamentos().then(lancs => {
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
    const empId = empresa.id
    Promise.all([
      getLancamentos(empId),
      getMetas(empId),
    ]).then(([lancamentos, metas]) => {
      setAppData(prev => ({ ...prev, [empId]: { ...prev[empId], lancamentos, metas } }))
    }).catch(console.error)

    // Categorias customizadas da empresa (Fase 1 — Supabase, por empresa)
    ;(async () => {
      try {
        let cats = await getCategorias(empId)
        // Migração única do x8_cats (global) → empresa ativa, se ainda não migrado
        if (cats.length === 0 && localStorage.getItem('x8_cats_migrado') !== '1') {
          let legado = []
          try { legado = JSON.parse(localStorage.getItem('x8_cats') || '[]') } catch {}
          if (legado.length > 0) {
            for (const c of legado) {
              try { await saveCategoria({ ...c, status: 'ativa' }, empId) } catch {}
            }
            localStorage.setItem('x8_cats_migrado', '1')
            cats = await getCategorias(empId)
          }
        }
        setExtraCats(cats)
      } catch { setExtraCats([]) }
    })()
  }, [usuario, empresa])

  const empData = empresa ? (appData[empresa.id] || { lancamentos: [], metas: [] }) : { lancamentos: [], metas: [] }
  const empresasAtivas = empresas.filter(e => e.status !== 'inativa')

  const handleLogin = useCallback(async (email, senha) => {
    const user = await signIn(email, senha)
    setUsuario({ id: user.id, email: user.email, nome: user.user_metadata?.nome || user.email.split('@')[0], perfil: user.user_metadata?.perfil || null, cargo: user.user_metadata?.cargo || '', telefone: user.user_metadata?.telefone || '', cpf: user.user_metadata?.cpf || '', foto: user.user_metadata?.foto || '' })
    setPerfilFoto(user.user_metadata?.foto || '')
  }, [])

  const handlePerfilUpdate = useCallback(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (!u) return
      setUsuario({ id: u.id, email: u.email, nome: u.user_metadata?.nome || u.email.split('@')[0], perfil: u.user_metadata?.perfil || null, cargo: u.user_metadata?.cargo || '', telefone: u.user_metadata?.telefone || '', cpf: u.user_metadata?.cpf || '', foto: u.user_metadata?.foto || '' })
      setPerfilFoto(u.user_metadata?.foto || '')
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
    setAcesso(null)
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

  const handleSaveEmpresa = useCallback(async (form, onLimitError) => {
    const limites = getLimitesPlano(empresa?.plano)
    // limite só se aplica dentro do app (empresa selecionada); na tela de seleção, libera
    if (empresa && empresas.filter(e => e.status !== 'inativa').length >= limites.empresas) {
      if (onLimitError) onLimitError(limites.empresas, labelPlano(empresa?.plano))
      return
    }
    const words = (form.nome || '').trim().split(/\s+/).filter(Boolean)
    const initials = words.slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'EM'
    const newEmp = {
      id: uid(),
      nome: (form.nome || '').trim(),
      initials,
      cnpj: (form.cnpj || '').trim(),
      cor: form.cor || '#16a34a',
      segmento: form.segmento || '',
      setor: labelSegmento(form.segmento),
      plano: 'basico',
      status: 'ativa',
    }
    try { await saveEmpresa(newEmp, usuario.id) } catch {}
    try {
      const saved = JSON.parse(localStorage.getItem(`x8_empresas_${usuario.id}`) || '[]')
      localStorage.setItem(`x8_empresas_${usuario.id}`, JSON.stringify([...saved, newEmp]))
    } catch {}
    setEmpresas(prev => [...prev, newEmp])
    setAppData(prev => ({ ...prev, [newEmp.id]: { lancamentos: [], metas: [], mesFechado: false } }))
  }, [usuario, empresa, empresas])

  const handleUpdateEmpresa = useCallback(async (id, form) => {
    const words = (form.nome || '').trim().split(/\s+/).filter(Boolean)
    const initials = words.slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'EM'
    const dbPatch = {
      nome: (form.nome || '').trim(),
      cnpj: (form.cnpj || '').trim(),
      segmento: form.segmento || '',
      cor: form.cor || '#16a34a',
      initials,
    }
    const statePatch = { ...dbPatch, setor: labelSegmento(form.segmento) }
    try { await updateEmpresa(id, dbPatch) } catch {}
    setEmpresas(prev => prev.map(e => e.id === id ? { ...e, ...statePatch } : e))
    setEmpresa(prev => (prev && prev.id === id ? { ...prev, ...statePatch } : prev))
    try {
      const saved = JSON.parse(localStorage.getItem(`x8_empresas_${usuario.id}`) || '[]')
      localStorage.setItem(`x8_empresas_${usuario.id}`, JSON.stringify(saved.map(e => e.id === id ? { ...e, ...statePatch } : e)))
    } catch {}
  }, [usuario])

  const handleSetEmpresaStatus = useCallback(async (id, status) => {
    try { await setEmpresaStatus(id, status) } catch {}
    setEmpresas(prev => prev.map(e => e.id === id ? { ...e, status } : e))
    try {
      const saved = JSON.parse(localStorage.getItem(`x8_empresas_${usuario.id}`) || '[]')
      localStorage.setItem(`x8_empresas_${usuario.id}`, JSON.stringify(saved.map(e => e.id === id ? { ...e, status } : e)))
    } catch {}
  }, [usuario])

  const handleSaveCat = useCallback(async (cat, isEdit) => {
    if (!empresa) return
    const item = { ...cat, status: cat.status || 'ativa' }
    try { await saveCategoria(item, empresa.id) } catch {}
    setExtraCats(prev => isEdit ? prev.map(c => c.id === item.id ? item : c) : [...prev, item])
  }, [empresa])

  const handleDeleteCat = useCallback(async (id) => {
    try { await deleteCategoria(id) } catch {}
    setExtraCats(prev => prev.filter(c => c.id !== id))
  }, [])

  const handleSetCatStatus = useCallback(async (cat, status) => {
    if (!empresa) return
    const item = { ...cat, status }
    try { await saveCategoria(item, empresa.id) } catch {}
    setExtraCats(prev => prev.map(c => c.id === item.id ? item : c))
  }, [empresa])

  const handleReset = useCallback(async () => {
    if (!empresa) return
    // Reset por empresa atual (Fase 4 — Etapa 2): não afeta as demais empresas
    await deleteAllLancamentos(empresa.id)
    await deleteAllMetas(empresa.id)
    setAppData(prev => ({ ...prev, [empresa.id]: { lancamentos: [], metas: [], mesFechado: false } }))
  }, [empresa])

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
        empresas={empresasAtivas}
        onSaveEmpresa={handleSaveEmpresa}
      />
    )
  }

  const effectiveExtraCats = empresa?.id === 'kzl' ? [...CATS_KZL, ...extraCats] : extraCats
  const extraCatsAtivas = effectiveExtraCats.filter(c => c.status !== 'inativa')
  const sharedProps = { empresa, data: empData, setPage, onSave: handleSave, onDelete: handleDelete, onSaveBatch: handleSaveBatch, extraCats: extraCatsAtivas }

  const renderPage = () => {
    if (PLACEHOLDER_PAGES.includes(page)) return <Placeholder page={page} />

    // ── Guarda por PERFIL (Fase 2 · Etapa 2): páginas administrativas só p/ master ──
    const ADMIN_PAGES = ['usuarios', 'empresas', 'logs']
    if (ADMIN_PAGES.includes(page) && !acesso?.isMaster) {
      return (
        <div style={{ textAlign: 'center', padding: '64px 24px', fontFamily: "'Segoe UI', sans-serif" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontWeight: 800, fontSize: 22, margin: '0 0 10px', color: 'var(--text)' }}>
            {acesso ? 'Sem permissão' : 'Verificando permissões…'}
          </h2>
          <p style={{ color: 'var(--text-sub)', fontSize: 15, maxWidth: 420, margin: '0 auto 10px', lineHeight: 1.6 }}>
            {acesso ? 'Esta área é restrita ao perfil Master.' : 'Aguarde um instante.'}
          </p>
          {acesso && (
            <button onClick={() => setPage('dashboard')}
              style={{ marginTop: 24, background: T.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              ← Voltar ao Dashboard
            </button>
          )}
        </div>
      )
    }

    // ── Guarda de acesso: segmento oculta; plano exibe tela de upgrade ───────
    const moduloStatus = getModuloStatus(page, empresa?.segmento, empresa?.plano)

    if (moduloStatus === 'bloqueado_segmento') {
      const segLabel = labelSegmento(empresa?.segmento)
      return (
        <div style={{ textAlign: 'center', padding: '64px 24px', fontFamily: "'Segoe UI', sans-serif" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontWeight: 800, fontSize: 22, margin: '0 0 10px', color: 'var(--text)' }}>
            Módulo não disponível
          </h2>
          <p style={{ color: 'var(--text-sub)', fontSize: 15, maxWidth: 420, margin: '0 auto 10px', lineHeight: 1.6 }}>
            Este módulo não está disponível para empresas do segmento{' '}
            <strong style={{ color: T.primary }}>{segLabel}</strong>.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Se precisar desta funcionalidade, verifique com o administrador do sistema.
          </p>
          <button onClick={() => setPage('dashboard')}
            style={{ marginTop: 24, background: T.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            ← Voltar ao Dashboard
          </button>
        </div>
      )
    }

    if (moduloStatus === 'bloqueado_plano') {
      const planoAtual = labelPlano(empresa?.plano)
      return (
        <div style={{ textAlign: 'center', padding: '64px 24px', fontFamily: "'Segoe UI', sans-serif" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>⭐</div>
          <h2 style={{ fontWeight: 800, fontSize: 22, margin: '0 0 10px', color: 'var(--text)' }}>
            Disponível em planos superiores
          </h2>
          <p style={{ color: 'var(--text-sub)', fontSize: 15, maxWidth: 420, margin: '0 auto 10px', lineHeight: 1.6 }}>
            Este módulo não está incluído no Plano{' '}
            <strong style={{ color: T.primary }}>{planoAtual}</strong>.
            Faça upgrade para desbloquear esta funcionalidade.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
            <button onClick={() => setPage('dashboard')}
              style={{ background: 'var(--card)', color: 'var(--text)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 20px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              ← Voltar
            </button>
            <button onClick={() => setPage('meu_plano')}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Ver Meu Plano
            </button>
          </div>
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
      case 'empresas': return <Empresas setPage={setPage} empresas={empresas} onSaveEmpresa={handleSaveEmpresa} onUpdateEmpresa={handleUpdateEmpresa} onSetStatus={handleSetEmpresaStatus} plano={empresa?.plano} limiteEmpresas={getLimitesPlano(empresa?.plano).empresas} />
      case 'meu_plano': return <MeuPlano empresa={empresa} empresas={empresas} usuario={usuario} setPage={setPage} />
      case 'categorias': return <Categorias {...sharedProps} extraCats={effectiveExtraCats} onSaveCat={handleSaveCat} onDeleteCat={handleDeleteCat} onSetStatus={handleSetCatStatus} />
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
        usuario={usuario} perfilFoto={perfilFoto} onLogout={handleLogout} empresa={empresa} acesso={acesso}
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
          empresas={empresasAtivas}
        />
        <main style={{ flex: 1, marginTop: 60, padding: isMobile ? '16px 14px calc(80px + env(safe-area-inset-bottom, 0px))' : '28px 28px 40px', overflowX: 'hidden' }}>
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
