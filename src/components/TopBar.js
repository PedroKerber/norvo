import { useState } from 'react'
import { T } from '../theme'
import { EMPRESAS } from '../data'

export default function TopBar({ empresa, setEmpresa, onMenu, usuario, setPage, sidebarWidth = 280 }) {
  const [open, setOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)

  return (
    <header style={{
      position: 'fixed', top: 0, left: sidebarWidth, right: 0, height: 60, transition: 'left .2s ease',
      background: T.white, borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px',
      zIndex: 200, boxShadow: T.shadow,
    }}>
      {/* Hamburger */}
      <button onClick={onMenu} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: T.sub, display: 'none' }} className="hamburger">☰</button>

      <div style={{ flex: 1 }} />

      {/* Company selector */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setOpen(o => !o)} style={{
          display: 'flex', alignItems: 'center', gap: 8, background: T.bg,
          border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 12px',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <div style={{ background: empresa.cor + '22', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: empresa.cor, fontSize: 11, flexShrink: 0 }}>
            {empresa.initials}
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, color: T.text, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{empresa.nome}</span>
          <span style={{ color: T.muted, fontSize: 12 }}>▾</span>
        </button>
        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 299 }} />
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: T.shadowMd, zIndex: 300, minWidth: 220, maxHeight: 320, overflowY: 'auto' }}>
              {EMPRESAS.map(emp => (
                <button key={emp.id} onClick={() => { setEmpresa(emp); setOpen(false) }} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px',
                  background: emp.id === empresa.id ? T.primaryLight : 'transparent',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}>
                  <div style={{ background: emp.cor + '22', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: emp.cor, fontSize: 11, flexShrink: 0 }}>
                    {emp.initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{emp.nome}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{emp.setor}</div>
                  </div>
                  {emp.id === empresa.id && <span style={{ marginLeft: 'auto', color: T.primary, fontSize: 14 }}>✓</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Notifications */}
      <button style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: T.sub }}>
        🔔
        <span style={{ position: 'absolute', top: 0, right: 0, background: T.red, color: '#fff', borderRadius: 9, fontSize: 9, fontWeight: 700, padding: '1px 4px', lineHeight: 1 }}>3</span>
      </button>

      {/* User */}
      <div style={{ position: 'relative' }}>
        <div onClick={() => setUserOpen(o => !o)} style={{ width: 34, height: 34, borderRadius: '50%', background: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {(usuario?.nome || 'P')[0].toUpperCase()}
        </div>
        {userOpen && (
          <>
            <div onClick={() => setUserOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 299 }} />
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: T.shadowMd, zIndex: 300, minWidth: 200 }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{usuario?.nome}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{usuario?.email}</div>
              </div>
              <button onClick={() => { setPage('configuracoes'); setUserOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: T.text, textAlign: 'left' }}>
                ⚙ Configurações
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
