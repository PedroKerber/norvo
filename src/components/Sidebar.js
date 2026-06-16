import { useState } from 'react'
import { T } from '../theme'

// Sidebar palette (independent from T theme)
const S = {
  bg: '#07140F',
  active: 'rgba(22,163,74,0.14)',
  hover: 'rgba(255,255,255,0.06)',
  txt: 'rgba(255,255,255,0.48)',
  txtActive: '#ffffff',
  accent: '#16a34a',
  border: 'rgba(255,255,255,0.09)',
  W: 280,
  WC: 82,
}

// Feather-style SVG icon system — all shapes inside a React component (no module-level JSX)
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
  else if (name === 'contas_pagar')
    inner = <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>
  else if (name === 'contas_receber')
    inner = <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>
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
  else if (name === 'logs')
    inner = <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></>
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
    { id: 'fluxo', label: 'Fluxo de Caixa', icon: 'fluxo' },
    { id: 'contas_pagar', label: 'Contas a Pagar', icon: 'contas_pagar' },
    { id: 'contas_receber', label: 'Contas a Receber', icon: 'contas_receber' },
  ]},
  { label: 'Análises', items: [
    { id: 'relatorios', label: 'Relatórios', icon: 'relatorios' },
    { id: 'mes_fechado', label: 'Mês Fechado', icon: 'mes_fechado' },
  ]},
  { label: 'Gestão', items: [
    { id: 'empresas', label: 'Empresas', icon: 'empresas' },
    { id: 'categorias', label: 'Categorias', icon: 'categorias' },
    { id: 'centro_custo', label: 'Centro de Custo', icon: 'centro_custo' },
    { id: 'metas', label: 'Metas Financeiras', icon: 'metas' },
  ]},
  { label: 'Sistema', items: [
    { id: 'usuarios', label: 'Usuários', icon: 'usuarios' },
    { id: 'configuracoes', label: 'Configurações', icon: 'configuracoes' },
    { id: 'logs', label: 'Logs do Sistema', icon: 'logs' },
  ]},
]

export default function Sidebar({ page, setPage, collapsed, onToggle, usuario, perfilFoto, onLogout, empresa }) {
  const [userMenu, setUserMenu] = useState(false)

  const savedPerfil = JSON.parse(localStorage.getItem('x8_perfil') || '{}')
  const nomeDisplay = savedPerfil.nome || usuario?.nome || 'Usuário'
  const cargoDisplay = savedPerfil.cargo || 'Master'
  const inicial = (nomeDisplay[0] || 'U').toUpperCase()

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
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: S.accent, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 13, color: '#fff', letterSpacing: -0.5,
          }}>X8</div>
          {!collapsed && (
            <span style={{ fontWeight: 800, fontSize: 17, color: '#fff', letterSpacing: -0.3, whiteSpace: 'nowrap' }}>
              Finance
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
        {NAV_GROUPS.map((group, gi) => (
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
              return (
                <div key={item.id} style={{ padding: '1px 8px' }}>
                  <button
                    onClick={() => setPage(item.id)}
                    title={collapsed ? item.label : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 11,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      width: '100%', padding: collapsed ? '11px 0' : '9px 12px',
                      background: active ? S.active : 'transparent',
                      color: active ? S.txtActive : S.txt,
                      border: 'none',
                      borderLeft: active ? `3px solid ${S.accent}` : '3px solid transparent',
                      borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 13.5, fontWeight: active ? 600 : 400,
                      textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden',
                      transition: 'background .15s, color .15s',
                    }}
                    onMouseEnter={e => {
                      if (!active) { e.currentTarget.style.background = S.hover; e.currentTarget.style.color = '#fff' }
                    }}
                    onMouseLeave={e => {
                      if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = S.txt }
                    }}>
                    <span style={{ color: active ? S.accent : 'inherit', display: 'flex', flexShrink: 0 }}>
                      <Ico name={item.icon} size={18} />
                    </span>
                    {!collapsed && (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
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

        {/* User menu — rendered at fixed position to escape overflow:hidden */}
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

        {/* Profile button */}
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
