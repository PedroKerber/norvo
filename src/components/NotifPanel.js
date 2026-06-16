import { useState } from 'react'
import { T } from '../theme'
import { useNotif, timeAgo } from '../context/NotifContext'
import { EMPRESAS } from '../data'

const FILTROS = ['Todas', 'Não lidas', 'Financeiro', 'Sistema', 'Usuários', 'Empresas']

const TIPO_MAP = { financeiro: 'Financeiro', sistema: 'Sistema', usuarios: 'Usuários', empresas: 'Empresas' }

function empNome(id) {
  return EMPRESAS.find(e => e.id === id)?.nome?.split(' ').slice(0, 2).join(' ') || id
}

export function NIcon({ name, size = 18, color = 'currentColor' }) {
  let inner
  if (name === 'clock') inner = <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>
  else if (name === 'alert') inner = <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>
  else if (name === 'trending-up') inner = <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>
  else if (name === 'calendar') inner = <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>
  else if (name === 'user-plus') inner = <><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></>
  else if (name === 'building') inner = <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></>
  else if (name === 'file-text') inner = <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></>
  else if (name === 'target') inner = <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>
  else if (name === 'upload') inner = <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>
  else if (name === 'key') inner = <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>
  else if (name === 'shield') inner = <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  else if (name === 'lock') inner = <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>
  else if (name === 'check-circle') inner = <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
  else if (name === 'x-circle') inner = <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>
  else if (name === 'bell') inner = <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>
  else if (name === 'check') inner = <polyline points="20 6 9 17 4 12"/>
  else if (name === 'trash') inner = <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>
  else if (name === 'search') inner = <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>
  else if (name === 'filter') inner = <><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></>
  else if (name === 'arrow-right') inner = <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>
  else inner = <circle cx="12" cy="12" r="4"/>

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}>
      {inner}
    </svg>
  )
}

export default function NotifPanel({ onClose, setPage }) {
  const { notifs, unreadCount, marcarLida, marcarTodasLidas, limparLidas } = useNotif()
  const [filtro, setFiltro] = useState('Todas')

  const filtered = notifs.filter(n => {
    if (filtro === 'Não lidas') return !n.lida
    if (filtro === 'Financeiro') return n.tipo === 'financeiro'
    if (filtro === 'Sistema') return n.tipo === 'sistema'
    if (filtro === 'Usuários') return n.tipo === 'usuarios'
    if (filtro === 'Empresas') return n.tipo === 'empresas'
    return true
  })

  const visible = filtered.slice(0, 7)

  const handleAcao = (n) => {
    marcarLida(n.id)
    if (n.acao?.page) { setPage(n.acao.page); onClose() }
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 499 }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 68, right: 16, width: 390, maxHeight: '80vh',
        background: T.white, borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.15)', border: `1px solid ${T.border}`,
        zIndex: 500, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <NIcon name="bell" size={18} color={T.primary} />
              <span style={{ fontWeight: 700, fontSize: 16, color: T.text }}>Notificações</span>
              {unreadCount > 0 && (
                <span style={{ background: '#dc2626', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                  {unreadCount}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {unreadCount > 0 && (
                <button onClick={marcarTodasLidas}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: T.primary, fontWeight: 600, padding: '4px 8px', borderRadius: 6 }}
                  onMouseEnter={e => e.currentTarget.style.background = T.primaryLight}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  Marcar lidas
                </button>
              )}
              <button onClick={limparLidas}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: T.muted, fontWeight: 500, padding: '4px 8px', borderRadius: 6 }}
                onMouseEnter={e => e.currentTarget.style.background = T.borderLight}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                Limpar lidas
              </button>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: T.muted }}>Acompanhe alertas importantes do sistema.</p>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 4, marginTop: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
            {FILTROS.map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                style={{
                  background: filtro === f ? T.primary : 'transparent',
                  color: filtro === f ? '#fff' : T.muted,
                  border: `1px solid ${filtro === f ? T.primary : T.border}`,
                  borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'background .15s, color .15s',
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1, scrollbarWidth: 'thin' }}>
          {visible.length === 0 ? (
            <div style={{ padding: '40px 18px', textAlign: 'center', color: T.muted }}>
              <NIcon name="bell" size={32} color={T.border} />
              <p style={{ margin: '12px 0 0', fontSize: 13 }}>Nenhuma notificação {filtro !== 'Todas' ? `em "${filtro}"` : ''}</p>
            </div>
          ) : visible.map((n, i) => (
            <div key={n.id} style={{
              display: 'flex', gap: 12, padding: '13px 18px',
              borderBottom: i < visible.length - 1 ? `1px solid ${T.borderLight}` : 'none',
              background: n.lida ? 'transparent' : 'rgba(37,99,235,0.04)',
              borderLeft: `3px solid ${n.lida ? 'transparent' : '#2563eb'}`,
              transition: 'background .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = n.lida ? T.borderLight : 'rgba(37,99,235,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = n.lida ? 'transparent' : 'rgba(37,99,235,0.04)'}>

              {/* Icon badge */}
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: n.cor + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: 1,
              }}>
                <NIcon name={n.icone} size={16} color={n.cor} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: n.lida ? 500 : 700, fontSize: 13, color: T.text, lineHeight: 1.3 }}>
                    {n.titulo}
                  </span>
                  {!n.lida && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563eb', flexShrink: 0, marginTop: 3 }} />}
                </div>
                <p style={{ margin: '3px 0 6px', fontSize: 12, color: T.sub, lineHeight: 1.45,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {n.descricao}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: T.muted }}>{timeAgo(n.data)}</span>
                  <span style={{ fontSize: 10, color: T.muted }}>·</span>
                  <span style={{ fontSize: 11, color: T.muted }}>{empNome(n.empresa)}</span>
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 4,
                    background: T.borderLight, color: T.muted, fontWeight: 600,
                  }}>{TIPO_MAP[n.tipo]}</span>
                  <div style={{ flex: 1 }} />
                  {n.acao && (
                    <button onClick={() => handleAcao(n)}
                      style={{ fontSize: 11, fontWeight: 600, color: T.primary, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      {n.acao.label} →
                    </button>
                  )}
                  {!n.lida && (
                    <button onClick={() => marcarLida(n.id)}
                      title="Marcar como lida"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, display: 'flex', padding: 0 }}>
                      <NIcon name="check" size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 18px', borderTop: `1px solid ${T.border}`, background: T.bg }}>
          <button onClick={() => { setPage('notificacoes'); onClose() }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: '100%', padding: '8px', background: 'none', border: `1px solid ${T.border}`,
              borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
              fontWeight: 600, color: T.sub,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.white; e.currentTarget.style.color = T.text }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = T.sub }}>
            Ver central de notificações
            <NIcon name="arrow-right" size={14} />
          </button>
        </div>
      </div>
    </>
  )
}
