import { useState } from 'react'
import { T } from '../theme'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'transacoes', label: 'Transações', icon: '↕' },
  { id: 'receitas', label: 'Receitas', icon: '↑' },
  { id: 'despesas', label: 'Despesas', icon: '↓' },
  { id: 'fluxo', label: 'Fluxo de Caixa', icon: '〜' },
  { id: 'contas_pagar', label: 'Contas a Pagar', icon: '📤' },
  { id: 'contas_receber', label: 'Contas a Receber', icon: '📥' },
  { id: 'relatorios', label: 'Relatórios', icon: '📊' },
  { id: 'mes_fechado', label: 'Mês Fechado', icon: '📅' },
  { id: 'empresas', label: 'Empresas', icon: '🏢' },
  { id: 'categorias', label: 'Categorias', icon: '🏷' },
  { id: 'centro_custo', label: 'Centro de Custo', icon: '⚙' },
  { id: 'fornecedores', label: 'Fornecedores', icon: '🤝' },
  { id: 'clientes', label: 'Clientes', icon: '👥' },
  { id: 'metas', label: 'Metas', icon: '🎯' },
  { id: 'importar', label: 'Importar Planilha', icon: '📥' },
  { id: 'usuarios', label: 'Usuários', icon: '👥' },
  { id: 'configuracoes', label: 'Configurações', icon: '⚙' },
]

export default function Sidebar({ page, setPage, open, onClose, usuario, perfilFoto, onLogout }) {
  const [userMenu, setUserMenu] = useState(false)
  const savedPerfil = JSON.parse(localStorage.getItem('x8_perfil') || '{}')
  const nomeDisplay = savedPerfil.nome || usuario?.nome || 'Usuário'
  const cargoDisplay = savedPerfil.cargo || 'Master'
  const inicial = (nomeDisplay || 'U')[0].toUpperCase()
  const Item = ({ item }) => {
    const active = page === item.id
    return (
      <button onClick={() => { setPage(item.id); onClose && onClose() }} style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px',
        background: active ? T.sidebarActive : 'transparent',
        color: active ? T.sidebarTextActive : T.sidebarText,
        border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 14, fontWeight: active ? 600 : 400, textAlign: 'left',
        transition: 'background .15s, color .15s',
        borderLeft: active ? `3px solid ${T.primary}` : '3px solid transparent',
      }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.sidebarHover }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
        <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
      </button>
    )
  }

  const sidebarStyle = {
    width: 240, background: T.sidebar, height: '100vh',
    display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0, zIndex: 300,
    transition: 'transform .25s',
  }

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 299, display: 'none' }}
          className="mobile-overlay" />
      )}

      <aside style={{ ...sidebarStyle, ...(open === false ? { transform: 'translateX(-100%)' } : {}) }}>
        {/* Logo */}
        <div style={{ padding: '24px 18px 16px', borderBottom: `1px solid ${T.sidebarActive}` }}>
          <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: -0.5, color: '#fff' }}>
            <span style={{ color: T.primary }}>X8</span>
            <span style={{ fontWeight: 300, opacity: 0.8 }}> FINANCE</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 0', scrollbarWidth: 'none' }}>
          {NAV.map(item => <Item key={item.id} item={item} />)}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '12px 14px', borderTop: `1px solid ${T.sidebarActive}` }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: T.sidebarText, fontSize: 11, marginBottom: 4 }}>Central de ajuda</div>
            <div style={{ color: T.primary, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Fale com nosso suporte →</div>
          </div>
          <div style={{ background: T.sidebarActive, borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>⭐</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Upgrade</span>
            </div>
            <div style={{ color: T.sidebarText, fontSize: 11, marginBottom: 8 }}>Seu plano atual é <span style={{ color: T.primary, fontWeight: 600 }}>Essencial</span></div>
            <button style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}>Fazer upgrade</button>
          </div>

          {/* Perfil do usuário */}
          <div style={{ position: 'relative' }}>
            <div onClick={() => setUserMenu(m => !m)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 8, background: userMenu ? T.sidebarActive : 'transparent', cursor: 'pointer', transition: 'background .15s' }}
              onMouseEnter={e => { if (!userMenu) e.currentTarget.style.background = T.sidebarHover }}
              onMouseLeave={e => { if (!userMenu) e.currentTarget.style.background = 'transparent' }}>
              {perfilFoto ? (
                <img src={perfilFoto} alt="Perfil" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${T.primary}` }} />
              ) : (
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{inicial}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeDisplay.split(' ')[0]}</div>
                <div style={{ color: T.sidebarText, fontSize: 11 }}>{cargoDisplay.split('/')[0].trim()}</div>
              </div>
              <span style={{ color: T.sidebarText, fontSize: 10 }}>▲</span>
            </div>

            {userMenu && (
              <>
                <div onClick={() => setUserMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 299 }} />
                <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 4, background: T.white, borderRadius: 10, boxShadow: T.shadowMd, zIndex: 300, overflow: 'hidden' }}>
                  {[
                    { icon: '👤', label: 'Meu Perfil', action: () => { setPage('configuracoes'); setUserMenu(false); onClose && onClose() } },
                    { icon: '🔒', label: 'Alterar Senha', action: () => { setPage('configuracoes'); setUserMenu(false); onClose && onClose() } },
                    { icon: '⚙', label: 'Configurações', action: () => { setPage('configuracoes'); setUserMenu(false); onClose && onClose() } },
                  ].map(({ icon, label, action }) => (
                    <button key={label} onClick={action} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: T.text, textAlign: 'left' }}
                      onMouseEnter={e => { e.currentTarget.style.background = T.bg }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                      <span>{icon}</span> {label}
                    </button>
                  ))}
                  <div style={{ borderTop: `1px solid ${T.border}` }} />
                  <button onClick={() => { setUserMenu(false); onLogout && onLogout() }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: T.red, textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.background = T.redL }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                    <span>↩</span> Sair do Sistema
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
