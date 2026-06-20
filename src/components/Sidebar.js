import { useState } from 'react'
import { T } from '../theme'
import { useTheme } from '../context/ThemeContext'
import { getModuloStatus, planoMinimoModulo } from '../modules'

const PERFIL_CARGO = { master: 'Master', admin: 'Administrador', gerente: 'Gerente Financeiro', contador: 'Contador', visualizador: 'Visualizador' }

const S = {
  bg: 'var(--sidebar-bg)',
  active: 'rgba(244,123,32,0.15)',
  hover: 'rgba(255,255,255,0.06)',
  txt: 'rgba(255,255,255,0.48)',
  txtActive: '#ffffff',
  accent: '#F47B20',
  border: 'rgba(255,255,255,0.09)',
  W: 280,
  WC: 82,
}

function Ico({ name, size = 18 }) {
  let inner
  if (name === 'dashboard')
    inner = <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>
  else if (name === 'transacoes')
    inner = <><path d="M7 16V4"/><path d="M3 8l4-4 4 4"/><path d="M17 8v12"/><path d="M21 16l-4 4-4-4"/></>
  else if (name === 'receitas')
    inner = <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>
  else if (name === 'despesas')
    inner = <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>
  else if (name === 'fluxo')
    inner = <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  else if (name === 'retirada_socios')
    inner = <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>
  else if (name === 'fornecedores')
    inner = <><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M19 8l2 2-4 4"/></>
  else if (name === 'clientes')
    inner = <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>
  else if (name === 'relatorios')
    inner = <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>
  else if (name === 'mes_fechado')
    inner = <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>
  else if (name === 'empresas')
    inner = <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></>
  else if (name === 'categorias')
    inner = <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>
  else if (name === 'centro_custo')
    inner = <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><line x1="3.27" y1="6.96" x2="12" y2="12.01"/><line x1="12" y1="22.08" x2="12" y2="12"/></>
  else if (name === 'metas')
    inner = <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
  else if (name === 'usuarios')
    inner = <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>
  else if (name === 'configuracoes')
    inner = <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>
  else if (name === 'comparativo_empresas')
    inner = <><rect x="2" y="3" width="9" height="18" rx="2"/><rect x="13" y="3" width="9" height="18" rx="2"/><line x1="6.5" y1="8" x2="6.5" y2="8"/><line x1="6.5" y1="12" x2="6.5" y2="12"/><line x1="6.5" y1="16" x2="6.5" y2="16"/><line x1="17.5" y1="8" x2="17.5" y2="8"/><line x1="17.5" y1="12" x2="17.5" y2="12"/><line x1="17.5" y1="16" x2="17.5" y2="16"/></>
  else if (name === 'logs')
    inner = <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></>
  else if (name === 'viabilidade_inc')
    inner = <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>
  else if (name === 'meu_plano')
    inner = <><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></>
  else if (name === 'lock')
    inner = <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>
  else if (name === 'chevron_left')
    inner = <polyline points="15 18 9 12 15 6"/>
  else if (name === 'chevron_right')
    inner = <polyline points="9 6 15 12 9 18"/>
  else if (name === 'user')
    inner = <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>
  else if (name === 'key')
    inner = <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>
  else if (name === 'logout')
    inner = <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>
  else if (name === 'sun')
    inner = <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>
  else if (name === 'moon')
    inner = <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  else if (name === 'menu')
    inner = <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>
  else
    inner = <circle cx="12" cy="12" r="4"/>

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}>
      {inner}
    </svg>
  )
}

const NAV_GROUPS = [
  { label: null, items: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  ]},
  { label: 'Financeiro', items: [
    { id: 'transacoes', label: 'Transações', icon: 'transacoes' },
    { id: 'receitas', label: 'Receitas', icon: 'receitas' },
    { id: 'despesas', label: 'Despesas', icon: 'despesas' },
    { id: 'retirada_socios', label: 'Retirada dos Sócios', icon: 'retirada_socios' },
    { id: 'fluxo', label: 'Fluxo de Caixa', icon: 'fluxo' },
  ]},
  { label: 'Análises', items: [
    { id: 'relatorios', label: 'Relatórios', icon: 'relatorios' },
    { id: 'comparativo_empresas', label: 'Comparativo de Empresas', icon: 'comparativo_empresas' },
    { id: 'mes_fechado', label: 'Fechamento Mensal', icon: 'mes_fechado' },
  ]},
  { label: 'Gestão', items: [
    { id: 'empresas', label: 'Empresas', icon: 'empresas' },
    { id: 'categorias', label: 'Categorias', icon: 'categorias' },
    { id: 'centro_custo', label: 'Centro de Custo', icon: 'centro_custo' },
    { id: 'metas', label: 'Metas Financeiras', icon: 'metas' },
    { id: 'fornecedores', label: 'Fornecedores', icon: 'fornecedores' },
    { id: 'clientes', label: 'Clientes', icon: 'clientes' },
  ]},
  { label: 'Incorporação', items: [
    { id: 'viabilidade_inc', label: 'Viabilidade', icon: 'viabilidade_inc' },
  ]},
  { label: 'Sistema', items: [
    { id: 'meu_plano', label: 'Meu Plano', icon: 'meu_plano' },
    { id: 'usuarios', label: 'Usuários', icon: 'usuarios' },
    { id: 'configuracoes', label: 'Configurações', icon: 'configuracoes' },
    { id: 'logs', label: 'Logs do Sistema', icon: 'logs' },
  ]},
]

const BOTTOM_NAV_ITEMS = [
  { id: 'dashboard', icon: 'dashboard', label: 'Início' },
  { id: 'receitas', icon: 'receitas', label: 'Receitas' },
  { id: 'despesas', icon: 'despesas', label: 'Despesas' },
  { id: 'relatorios', icon: 'relatorios', label: 'Relatórios' },
]

function BottomNav({ page, setPage, onMenuOpen }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: S.bg, borderTop: `1px solid ${S.border}`,
      display: 'flex', alignItems: 'stretch', zIndex: 400,
      boxShadow: '0 -2px 16px rgba(0,0,0,0.3)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {BOTTOM_NAV_ITEMS.map(item => {
        const active = page === item.id
        return (
          <button key={item.id} onClick={() => setPage(item.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 3, background: 'none', border: 'none',
            cursor: 'pointer', color: active ? '#fff' : S.txt,
            borderTop: `2px solid ${active ? S.accent : 'transparent'}`,
            transition: 'color .15s', minHeight: 56, padding: '8px 4px',
            WebkitTapHighlightColor: 'transparent',
          }}>
            <span style={{ color: active ? S.accent : 'inherit', display: 'flex' }}>
              <Ico name={item.icon} size={22} />
            </span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, letterSpacing: '.02em' }}>{item.label}</span>
          </button>
        )
      })}
      <button onClick={onMenuOpen} style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 3, background: 'none', border: 'none',
        cursor: 'pointer', color: S.txt, borderTop: '2px solid transparent',
        minHeight: 56, padding: '8px 4px', WebkitTapHighlightColor: 'transparent',
      }}>
        <span style={{ display: 'flex' }}><Ico name="menu" size={22} /></span>
        <span style={{ fontSize: 10, fontWeight: 400, letterSpacing: '.02em' }}>Menu</span>
      </button>
    </nav>
  )
}

export default function Sidebar({ page, setPage, collapsed, onToggle, usuario, perfilFoto, onLogout, empresa, isMobile, mobileOpen, onMobileOpen, onMobileClose, acesso }) {
  const [userMenu, setUserMenu] = useState(false)
  const { dark, toggleTheme } = useTheme()

  const nomeDisplay = usuario?.nome || 'Usuário'
  const cargoDisplay = acesso?.isMaster ? 'Master' : (usuario?.cargo || PERFIL_CARGO[usuario?.perfil] || 'Usuário')
  const inicial = (nomeDisplay[0] || 'U').toUpperCase()

  const [upgradeHint, setUpgradeHint] = useState(null)

  const navigate = id => {
    setPage(id)
    if (isMobile && onMobileClose) onMobileClose()
  }

  const handleItemClick = (item) => {
    if (item.status === 'bloqueado_plano') {
      const minPlano = planoMinimoModulo(item.id)
      setUpgradeHint({ label: item.label, plano: minPlano })
      const t = setTimeout(() => setUpgradeHint(null), 4000)
      return () => clearTimeout(t)
    }
    navigate(item.id)
  }

  // Filtra grupos: oculta itens bloqueados por segmento; mantém (com lock) os bloqueados por plano
  const segmento = empresa?.segmento
  const plano    = empresa?.plano
  const isMaster = !!acesso?.isMaster
  const ADMIN_ONLY = ['empresas', 'usuarios', 'logs']   // só master vê (Fase 2 · Etapa 2)
  const visibleGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items
      .map(item => ({ ...item, status: getModuloStatus(item.id, segmento, plano) }))
      .filter(item => item.status !== 'bloqueado_segmento')
      .filter(item => isMaster || !ADMIN_ONLY.includes(item.id)),
  })).filter(group => group.items.length > 0)

  // ── MOBILE RENDER ────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Overlay drawer */}
        {mobileOpen && (
          <>
            <div
              onClick={onMobileClose}
              style={{ position: 'fixed', inset: 0, zIndex: 498, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
            />
            <aside style={{
              position: 'fixed', left: 0, top: 0, bottom: 60, width: 288, zIndex: 499,
              background: S.bg, display: 'flex', flexDirection: 'column',
              boxShadow: '4px 0 32px rgba(0,0,0,0.45)',
              overflow: 'hidden',
            }}>
              {/* Drawer header */}
              <div style={{
                height: 64, display: 'flex', alignItems: 'center', gap: 10,
                padding: '0 16px 0 18px', borderBottom: `1px solid ${S.border}`, flexShrink: 0,
              }}>
                <svg width="20" height="24" viewBox="0 0 60 70" fill="none" style={{ flexShrink: 0 }}>
                  <rect x="0" y="0" width="14" height="70" fill="white" rx="1.5" />
                  <polygon points="14,0 32,0 46,70 28,70" fill="#F47B20" />
                  <rect x="46" y="0" width="14" height="70" fill="white" rx="1.5" />
                </svg>
                <span style={{ fontWeight: 800, fontSize: 17, color: '#fff', letterSpacing: -0.3, flex: 1 }}>Norvo</span>
                <button
                  onClick={onMobileClose}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.txt, padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {/* Drawer nav */}
              <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', padding: '8px 0 6px' }}>
                {visibleGroups.map((group, gi) => (
                  <div key={gi} style={{ marginBottom: 2 }}>
                    {group.label && (
                      <div style={{
                        padding: '10px 20px 4px', fontSize: 10, fontWeight: 700,
                        letterSpacing: 1.2, color: S.txt, textTransform: 'uppercase', userSelect: 'none',
                      }}>{group.label}</div>
                    )}
                    {group.items.map(item => {
                      const active = page === item.id
                      const locked = item.status === 'bloqueado_plano'
                      return (
                        <div key={item.id} style={{ padding: '1px 8px' }}>
                          <button
                            onClick={() => handleItemClick(item)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 11,
                              width: '100%', padding: '11px 12px',
                              background: active ? S.active : 'transparent',
                              color: locked ? 'rgba(255,255,255,0.28)' : (active ? S.txtActive : S.txt),
                              border: 'none',
                              borderLeft: active ? `3px solid ${S.accent}` : '3px solid transparent',
                              borderRadius: 10, cursor: locked ? 'default' : 'pointer', fontFamily: 'inherit',
                              fontSize: 14, fontWeight: active ? 600 : 400,
                              textAlign: 'left',
                            }}>
                            <span style={{ color: locked ? 'rgba(255,255,255,0.28)' : (active ? S.accent : 'inherit'), display: 'flex', flexShrink: 0 }}>
                              <Ico name={item.icon} size={18} />
                            </span>
                            <span style={{ flex: 1 }}>{item.label}</span>
                            {locked && <Ico name="lock" size={13} />}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </nav>

              {/* Drawer footer */}
              <div style={{ borderTop: `1px solid ${S.border}`, padding: '12px 16px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  {perfilFoto ? (
                    <img src={perfilFoto} alt="Perfil" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${S.accent}55` }} />
                  ) : (
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: S.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                      {inicial}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeDisplay}</div>
                    <div style={{ color: S.txt, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cargoDisplay}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { toggleTheme(); }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: S.hover, border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', color: S.txt, fontFamily: 'inherit', fontSize: 12 }}>
                    <Ico name={dark ? 'sun' : 'moon'} size={14} />
                    {dark ? 'Claro' : 'Escuro'}
                  </button>
                  <button
                    onClick={() => { onMobileClose && onMobileClose(); onLogout && onLogout() }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(220,38,38,0.12)', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#f87171', fontFamily: 'inherit', fontSize: 12 }}>
                    <Ico name="logout" size={14} />
                    Sair
                  </button>
                </div>
              </div>
            </aside>
          </>
        )}

        {/* Bottom navigation bar */}
        <BottomNav page={page} setPage={setPage} onMenuOpen={onMobileOpen} />
      </>
    )
  }

  // ── DESKTOP RENDER ────────────────────────────────────────────────────────────
  const toggleBtn = (
    <button onClick={onToggle}
      title={collapsed ? 'Expandir menu' : 'Recolher menu'}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', color: S.txt,
        padding: 5, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'color .15s, background .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = S.hover; e.currentTarget.style.color = '#fff' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = S.txt }}>
      <Ico name={collapsed ? 'chevron_right' : 'chevron_left'} size={17} />
    </button>
  )

  return (
    <aside style={{
      width: collapsed ? S.WC : S.W,
      background: S.bg,
      height: '100vh',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', left: 0, top: 0, zIndex: 300,
      transition: 'width .2s ease',
      overflow: 'hidden',
    }}>

      {/* ── HEADER ── */}
      <div style={{
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: collapsed ? '0 12px' : '0 10px 0 18px',
        borderBottom: `1px solid ${S.border}`, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', flex: collapsed ? 0 : 1 }}>
          <svg width="20" height="24" viewBox="0 0 60 70" fill="none" style={{ flexShrink: 0 }}>
            <rect x="0" y="0" width="14" height="70" fill="white" rx="1.5" />
            <polygon points="14,0 32,0 46,70 28,70" fill="#F47B20" />
            <rect x="46" y="0" width="14" height="70" fill="white" rx="1.5" />
          </svg>
          {!collapsed && (
            <span style={{ fontWeight: 800, fontSize: 17, color: '#fff', letterSpacing: -0.3, whiteSpace: 'nowrap' }}>
              Norvo
            </span>
          )}
        </div>
        {toggleBtn}
      </div>

      {/* ── NAV ── */}
      <nav className="sidebar-nav" style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0,
        padding: '10px 0 6px', scrollbarWidth: 'thin',
      }}>
        {visibleGroups.map((group, gi) => (
          <div key={gi} style={{ marginBottom: collapsed ? 0 : 2 }}>
            {group.label && !collapsed && (
              <div style={{
                padding: '10px 20px 4px', fontSize: 10, fontWeight: 700,
                letterSpacing: 1.2, color: S.txt, textTransform: 'uppercase',
                userSelect: 'none',
              }}>
                {group.label}
              </div>
            )}
            {group.items.map(item => {
              const active = page === item.id
              const locked = item.status === 'bloqueado_plano'
              return (
                <div key={item.id} style={{ padding: '1px 8px' }}>
                  <button
                    onClick={() => handleItemClick(item)}
                    title={collapsed ? (locked ? `🔒 ${item.label}` : item.label) : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 11,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      width: '100%', padding: collapsed ? '11px 0' : '9px 12px',
                      background: active ? S.active : 'transparent',
                      color: locked ? 'rgba(255,255,255,0.28)' : (active ? S.txtActive : S.txt),
                      border: 'none',
                      borderLeft: active ? `3px solid ${S.accent}` : '3px solid transparent',
                      borderRadius: 10, cursor: locked ? 'default' : 'pointer', fontFamily: 'inherit',
                      fontSize: 13.5, fontWeight: active ? 600 : 400,
                      textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden',
                      transition: 'background .15s, color .15s',
                    }}
                    onMouseEnter={e => {
                      if (!active && !locked) { e.currentTarget.style.background = S.hover; e.currentTarget.style.color = '#fff' }
                    }}
                    onMouseLeave={e => {
                      if (!active && !locked) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = S.txt }
                    }}>
                    <span style={{ color: locked ? 'rgba(255,255,255,0.28)' : (active ? S.accent : 'inherit'), display: 'flex', flexShrink: 0 }}>
                      <Ico name={item.icon} size={18} />
                    </span>
                    {!collapsed && (
                      <>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                        {locked && <Ico name="lock" size={12} />}
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── FOOTER ── */}
      <div style={{ borderTop: `1px solid ${S.border}`, padding: '10px 8px', flexShrink: 0 }}>

        {/* Toast de upgrade */}
        {upgradeHint && !collapsed && (
          <div style={{
            background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.35)',
            borderRadius: 10, padding: '10px 12px', marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <Ico name="lock" size={13} />
              <span style={{ color: '#c4b5fd', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: .7 }}>Módulo Bloqueado</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 1.4, marginBottom: 8 }}>
              <strong style={{ color: '#fff' }}>{upgradeHint.label}</strong> está disponível no Plano{' '}
              <strong style={{ color: '#c4b5fd' }}>{upgradeHint.plano}</strong>.
            </div>
            <button onClick={() => { setUpgradeHint(null); setPage('meu_plano') }}
              style={{ width: '100%', background: '#7c3aed', border: 'none', borderRadius: 7, padding: '6px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Ver Meu Plano
            </button>
          </div>
        )}

        {userMenu && (
          <>
            <div onClick={() => setUserMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 399 }} />
            <div style={{
              position: 'fixed',
              bottom: 76, left: collapsed ? S.WC + 8 : 8,
              width: 224, zIndex: 400,
              background: T.white, borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)', border: `1px solid ${T.border}`,
            }}>
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.border}`, background: T.bg }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{nomeDisplay}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{usuario?.email || '—'}</div>
              </div>
              {[
                { icon: 'user', label: 'Meu Perfil', action: () => { setPage('configuracoes'); setUserMenu(false) } },
                { icon: 'key', label: 'Alterar Senha', action: () => { setPage('configuracoes'); setUserMenu(false) } },
                { icon: 'configuracoes', label: 'Configurações', action: () => { setPage('configuracoes'); setUserMenu(false) } },
                { icon: dark ? 'sun' : 'moon', label: dark ? 'Modo Claro' : 'Modo Escuro', action: () => { toggleTheme(); setUserMenu(false) } },
              ].map(({ icon, label, action }) => (
                <button key={label} onClick={action}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: T.text, textAlign: 'left' }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.bg }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <span style={{ color: T.muted, display: 'flex' }}><Ico name={icon} size={15} /></span>
                  {label}
                </button>
              ))}
              <div style={{ borderTop: `1px solid ${T.border}` }} />
              <button onClick={() => { setUserMenu(false); onLogout && onLogout() }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: T.red, textAlign: 'left' }}
                onMouseEnter={e => { e.currentTarget.style.background = T.redL }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                <span style={{ display: 'flex' }}><Ico name="logout" size={15} /></span>
                Sair do Sistema
              </button>
            </div>
          </>
        )}

        <button onClick={() => setUserMenu(m => !m)}
          title={collapsed ? nomeDisplay : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? 'center' : 'flex-start',
            width: '100%', padding: collapsed ? '8px' : '8px 10px',
            background: userMenu ? S.hover : 'transparent',
            border: 'none', borderRadius: 10, cursor: 'pointer',
            transition: 'background .15s',
          }}
          onMouseEnter={e => { if (!userMenu) e.currentTarget.style.background = S.hover }}
          onMouseLeave={e => { if (!userMenu) e.currentTarget.style.background = 'transparent' }}>
          {perfilFoto ? (
            <img src={perfilFoto} alt="Perfil" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${S.accent}55` }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: S.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
              {inicial}
            </div>
          )}
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nomeDisplay.split(' ')[0]}
                </div>
                <div style={{ color: S.txt, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cargoDisplay.split('/')[0].trim()}{empresa?.nome ? ` · ${empresa.nome.split(' ')[0]}` : ''}
                </div>
              </div>
              <span style={{ color: S.txt, fontSize: 12, flexShrink: 0, display: 'inline-block', transform: userMenu ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
