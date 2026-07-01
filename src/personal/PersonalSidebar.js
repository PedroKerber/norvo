import { useState } from 'react'
import { T } from '../theme'
import { useTheme } from '../context/ThemeContext'

// Paleta espelhada do Sidebar empresarial (navy + laranja)
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
  else if (name === 'receitas')
    inner = <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>
  else if (name === 'despesas')
    inner = <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>
  else if (name === 'contas')
    inner = <><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></>
  else if (name === 'cartoes')
    inner = <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>
  else if (name === 'investimentos')
    inner = <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>
  else if (name === 'dividas')
    inner = <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>
  else if (name === 'metas')
    inner = <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>
  else if (name === 'relatorios')
    inner = <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>
  else if (name === 'configuracoes')
    inner = <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>
  else if (name === 'chevron_left')  inner = <polyline points="15 18 9 12 15 6"/>
  else if (name === 'chevron_right') inner = <polyline points="9 6 15 12 9 18"/>
  else if (name === 'user')          inner = <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>
  else if (name === 'logout')        inner = <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>
  else if (name === 'sun')           inner = <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>
  else if (name === 'moon')          inner = <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  else if (name === 'menu')          inner = <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>
  else inner = <circle cx="12" cy="12" r="4"/>
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}>{inner}</svg>
  )
}

// Navegação do ambiente Pessoa Física (só módulos pessoais)
export const PF_NAV_GROUPS = [
  { label: null, items: [{ id: 'dashboard', label: 'Dashboard', icon: 'dashboard' }] },
  { label: 'Finanças', items: [
    { id: 'receitas', label: 'Receitas', icon: 'receitas' },
    { id: 'despesas', label: 'Despesas', icon: 'despesas' },
    { id: 'contas',   label: 'Contas',   icon: 'contas'   },
    { id: 'cartoes',  label: 'Cartões',  icon: 'cartoes'  },
  ]},
  { label: 'Patrimônio', items: [
    { id: 'investimentos', label: 'Investimentos', icon: 'investimentos' },
    { id: 'dividas',       label: 'Dívidas',       icon: 'dividas'       },
    { id: 'metas',         label: 'Metas',         icon: 'metas'         },
  ]},
  { label: 'Análise', items: [
    { id: 'relatorios', label: 'Relatórios', icon: 'relatorios' },
  ]},
]

const BOTTOM = [
  { id: 'dashboard', icon: 'dashboard', label: 'Início' },
  { id: 'receitas',  icon: 'receitas',  label: 'Receitas' },
  { id: 'despesas',  icon: 'despesas',  label: 'Despesas' },
  { id: 'contas',    icon: 'contas',    label: 'Contas' },
]

function BottomNav({ page, setPage, onMenuOpen }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, background: S.bg,
      borderTop: `1px solid ${S.border}`, display: 'flex', zIndex: 400,
      boxShadow: '0 -2px 16px rgba(0,0,0,0.3)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {BOTTOM.map(item => {
        const active = page === item.id
        return (
          <button key={item.id} onClick={() => setPage(item.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3, background: 'none', border: 'none', cursor: 'pointer', color: active ? '#fff' : S.txt,
            borderTop: `2px solid ${active ? S.accent : 'transparent'}`, minHeight: 56, padding: '8px 4px',
            WebkitTapHighlightColor: 'transparent',
          }}>
            <span style={{ color: active ? S.accent : 'inherit', display: 'flex' }}><Ico name={item.icon} size={22} /></span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{item.label}</span>
          </button>
        )
      })}
      <button onClick={onMenuOpen} style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 3, background: 'none', border: 'none', cursor: 'pointer', color: S.txt, minHeight: 56, padding: '8px 4px',
        WebkitTapHighlightColor: 'transparent',
      }}>
        <span style={{ display: 'flex' }}><Ico name="menu" size={22} /></span>
        <span style={{ fontSize: 10 }}>Menu</span>
      </button>
    </nav>
  )
}

export default function PersonalSidebar({ page, setPage, collapsed, onToggle, usuario, perfilFoto, onLogout, isMobile, mobileOpen, onMobileOpen, onMobileClose }) {
  const [userMenu, setUserMenu] = useState(false)
  const { dark, toggleTheme } = useTheme()

  const nomeDisplay = usuario?.nome || 'Usuário'
  const inicial = (nomeDisplay[0] || 'U').toUpperCase()
  const navigate = id => { setPage(id); if (isMobile && onMobileClose) onMobileClose() }

  const NavList = ({ compact }) => (
    <>
      {PF_NAV_GROUPS.map((group, gi) => (
        <div key={gi} style={{ marginBottom: compact ? 0 : 2 }}>
          {group.label && !collapsed && (
            <div style={{ padding: '10px 20px 4px', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: S.txt, textTransform: 'uppercase', userSelect: 'none' }}>{group.label}</div>
          )}
          {group.items.map(item => {
            const active = page === item.id
            return (
              <div key={item.id} style={{ padding: '1px 8px' }}>
                <button onClick={() => navigate(item.id)} title={collapsed ? item.label : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 11,
                    justifyContent: collapsed ? 'center' : 'flex-start', width: '100%',
                    padding: collapsed ? '11px 0' : '9px 12px',
                    background: active ? S.active : 'transparent', color: active ? S.txtActive : S.txt,
                    border: 'none', borderLeft: active ? `3px solid ${S.accent}` : '3px solid transparent',
                    borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5,
                    fontWeight: active ? 600 : 400, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden',
                    transition: 'background .15s, color .15s',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = S.hover; e.currentTarget.style.color = '#fff' } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = S.txt } }}>
                  <span style={{ color: active ? S.accent : 'inherit', display: 'flex', flexShrink: 0 }}><Ico name={item.icon} size={18} /></span>
                  {!collapsed && <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                </button>
              </div>
            )
          })}
        </div>
      ))}
    </>
  )

  const LogoMark = () => (
    <svg width="20" height="24" viewBox="0 0 60 70" fill="none" style={{ flexShrink: 0 }}>
      <rect x="0" y="0" width="14" height="70" fill="white" rx="1.5" />
      <polygon points="14,0 32,0 46,70 28,70" fill="#F47B20" />
      <rect x="46" y="0" width="14" height="70" fill="white" rx="1.5" />
    </svg>
  )

  // ── MOBILE ──
  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <>
            <div onClick={onMobileClose} style={{ position: 'fixed', inset: 0, zIndex: 498, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }} />
            <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 60, width: 288, zIndex: 499, background: S.bg, display: 'flex', flexDirection: 'column', boxShadow: '4px 0 32px rgba(0,0,0,0.45)', overflow: 'hidden' }}>
              <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px 0 18px', borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
                <LogoMark />
                <span style={{ fontWeight: 800, fontSize: 17, color: '#fff', letterSpacing: -0.3, flex: 1 }}>Norvo <span style={{ color: S.accent, fontSize: 12, fontWeight: 700 }}>Pessoal</span></span>
                <button onClick={onMobileClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.txt, padding: 6, display: 'flex' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', padding: '8px 0 6px' }}><NavList /></nav>
              <div style={{ borderTop: `1px solid ${S.border}`, padding: '12px 16px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: S.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15 }}>{inicial}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeDisplay}</div>
                    <div style={{ color: S.txt, fontSize: 12 }}>Conta Pessoal</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={toggleTheme} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: S.hover, border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', color: S.txt, fontFamily: 'inherit', fontSize: 12 }}>
                    <Ico name={dark ? 'sun' : 'moon'} size={14} />{dark ? 'Claro' : 'Escuro'}
                  </button>
                  <button onClick={() => { onMobileClose && onMobileClose(); onLogout && onLogout() }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(220,38,38,0.12)', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#f87171', fontFamily: 'inherit', fontSize: 12 }}>
                    <Ico name="logout" size={14} />Sair
                  </button>
                </div>
              </div>
            </aside>
          </>
        )}
        <BottomNav page={page} setPage={setPage} onMenuOpen={onMobileOpen} />
      </>
    )
  }

  // ── DESKTOP ──
  return (
    <aside style={{ width: collapsed ? S.WC : S.W, background: S.bg, height: '100vh', display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0, zIndex: 300, transition: 'width .2s ease', overflow: 'hidden' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: collapsed ? '0 12px' : '0 10px 0 18px', borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', flex: collapsed ? 0 : 1 }}>
          <LogoMark />
          {!collapsed && <span style={{ fontWeight: 800, fontSize: 17, color: '#fff', letterSpacing: -0.3, whiteSpace: 'nowrap' }}>Norvo <span style={{ color: S.accent, fontSize: 12, fontWeight: 700 }}>Pessoal</span></span>}
        </div>
        <button onClick={onToggle} title={collapsed ? 'Expandir menu' : 'Recolher menu'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.txt, padding: 5, borderRadius: 7, display: 'flex', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = S.hover; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = S.txt }}>
          <Ico name={collapsed ? 'chevron_right' : 'chevron_left'} size={17} />
        </button>
      </div>

      <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, padding: '10px 0 6px', scrollbarWidth: 'thin' }}>
        <NavList compact={collapsed} />
      </nav>

      <div style={{ borderTop: `1px solid ${S.border}`, padding: '10px 8px', flexShrink: 0 }}>
        {userMenu && (
          <>
            <div onClick={() => setUserMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 399 }} />
            <div style={{ position: 'fixed', bottom: 76, left: collapsed ? S.WC + 8 : 8, width: 224, zIndex: 400, background: T.white, borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', border: `1px solid ${T.border}` }}>
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.border}`, background: T.bg }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{nomeDisplay}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{usuario?.email || '—'}</div>
              </div>
              <button onClick={() => { toggleTheme(); setUserMenu(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: T.text, textAlign: 'left' }}
                onMouseEnter={e => { e.currentTarget.style.background = T.bg }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                <span style={{ color: T.muted, display: 'flex' }}><Ico name={dark ? 'sun' : 'moon'} size={15} /></span>{dark ? 'Modo Claro' : 'Modo Escuro'}
              </button>
              <div style={{ borderTop: `1px solid ${T.border}` }} />
              <button onClick={() => { setUserMenu(false); onLogout && onLogout() }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: T.red, textAlign: 'left' }}
                onMouseEnter={e => { e.currentTarget.style.background = T.redL }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                <span style={{ display: 'flex' }}><Ico name="logout" size={15} /></span>Sair do Sistema
              </button>
            </div>
          </>
        )}
        <button onClick={() => setUserMenu(m => !m)} title={collapsed ? nomeDisplay : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start', width: '100%', padding: collapsed ? '8px' : '8px 10px', background: userMenu ? S.hover : 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer', transition: 'background .15s' }}
          onMouseEnter={e => { if (!userMenu) e.currentTarget.style.background = S.hover }} onMouseLeave={e => { if (!userMenu) e.currentTarget.style.background = 'transparent' }}>
          {perfilFoto
            ? <img src={perfilFoto} alt="Perfil" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${S.accent}55` }} />
            : <div style={{ width: 36, height: 36, borderRadius: '50%', background: S.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{inicial}</div>}
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeDisplay.split(' ')[0]}</div>
                <div style={{ color: S.txt, fontSize: 11 }}>Conta Pessoal</div>
              </div>
              <span style={{ color: S.txt, fontSize: 12, flexShrink: 0, transform: userMenu ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
