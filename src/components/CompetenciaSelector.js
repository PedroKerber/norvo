import { useState, useRef } from 'react'
import { T } from '../theme'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_S = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const _n = new Date()
export const CURRENT_MES = `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}`
export const COMPETENCIA_DEFAULT = { mesAno: CURRENT_MES, dateRange: null, activePreset: null }

const PRESETS = [
  { key:'hoje',      label:'Hoje' },
  { key:'7d',        label:'7 dias' },
  { key:'30d',       label:'30 dias' },
  { key:'mes_atual', label:'Mês Atual' },
  { key:'mes_ant',   label:'Mês Anterior' },
  { key:'ano_atual', label:'Ano Atual' },
]

export function getMesLabel(mesAno) {
  const [ano, mes] = mesAno.split('-').map(Number)
  return `${MESES[mes - 1]}/${ano}`
}

export function filterByCompetencia(lancs, { mesAno, dateRange }) {
  if (dateRange) {
    return lancs.filter(x => {
      if (!x.data) return false
      const d = new Date(x.data + 'T00:00:00')
      return d >= dateRange.from && d <= dateRange.to
    })
  }
  return lancs.filter(x => x.data?.startsWith(mesAno))
}

export function getCompLabel({ mesAno, activePreset }) {
  if (!activePreset) return getMesLabel(mesAno)
  if (activePreset === 'hoje') return 'Hoje'
  if (activePreset === '7d') return 'Últimos 7 dias'
  if (activePreset === '30d') return 'Últimos 30 dias'
  if (activePreset === 'mes_atual') return `Mês Atual — ${getMesLabel(mesAno)}`
  if (activePreset === 'mes_ant') return `Mês Anterior — ${getMesLabel(mesAno)}`
  if (activePreset === 'ano_atual') return `Ano ${new Date().getFullYear()}`
  return getMesLabel(mesAno)
}

export default function CompetenciaSelector({ mesAno = CURRENT_MES, dateRange = null, activePreset = null, onChange }) {
  const triggerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [navAno, setNavAno] = useState(() => Number(mesAno.split('-')[0]))

  const [anoN, mesN] = mesAno.split('-').map(Number)
  const label = getCompLabel({ mesAno, activePreset })

  const openDropdown = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, left: r.left })
    }
    setNavAno(anoN)
    setOpen(true)
  }

  const emit = (next) => onChange?.(next)

  const navMes = (dir) => {
    const d = new Date(anoN, mesN - 1 + dir, 1)
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    emit({ mesAno: next, dateRange: null, activePreset: null })
  }

  const handlePreset = (key) => {
    const n = new Date()
    const today = new Date(n.getFullYear(), n.getMonth(), n.getDate())
    const todayMes = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`
    if (key === 'hoje') {
      const to = new Date(today); to.setHours(23,59,59,999)
      emit({ mesAno: todayMes, dateRange: { from: today, to }, activePreset: key })
    } else if (key === '7d') {
      const from = new Date(today); from.setDate(from.getDate()-6)
      const to = new Date(today); to.setHours(23,59,59,999)
      emit({ mesAno: todayMes, dateRange: { from, to }, activePreset: key })
    } else if (key === '30d') {
      const from = new Date(today); from.setDate(from.getDate()-29)
      const to = new Date(today); to.setHours(23,59,59,999)
      emit({ mesAno: todayMes, dateRange: { from, to }, activePreset: key })
    } else if (key === 'mes_atual') {
      emit({ mesAno: todayMes, dateRange: null, activePreset: key })
    } else if (key === 'mes_ant') {
      const p = new Date(n.getFullYear(), n.getMonth()-1, 1)
      emit({ mesAno: `${p.getFullYear()}-${String(p.getMonth()+1).padStart(2,'0')}`, dateRange: null, activePreset: key })
    } else if (key === 'ano_atual') {
      const from = new Date(n.getFullYear(), 0, 1)
      const to = new Date(n.getFullYear(), 11, 31, 23, 59, 59, 999)
      emit({ mesAno: todayMes, dateRange: { from, to }, activePreset: key })
    }
    setOpen(false)
  }

  const handleSelectMes = (mStr) => {
    emit({ mesAno: mStr, dateRange: null, activePreset: null })
    setOpen(false)
  }

  const btnNav = {
    background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
    width: 36, height: 40, cursor: 'pointer', color: T.sub, fontSize: 17,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={() => navMes(-1)} title="Mês anterior" style={btnNav}>‹</button>

        <button ref={triggerRef} onClick={openDropdown} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: T.white, border: `1px solid ${open ? T.primary : T.border}`,
          borderRadius: 10, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: open ? `0 0 0 3px ${T.primaryLight}` : '0 1px 4px rgba(0,0,0,0.07)',
          transition: 'all 0.15s',
        }}>
          <div style={{ background: T.primaryLight, borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div style={{ textAlign: 'left', minWidth: 110 }}>
            <div style={{ fontSize: 9, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', lineHeight: 1 }}>Competência</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginTop: 3, whiteSpace: 'nowrap' }}>{label}</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        <button onClick={() => navMes(1)} title="Próximo mês" style={btnNav}>›</button>
      </div>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 450 }} />
          <div style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 451,
            background: T.white, borderRadius: 14, width: 300,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: `1px solid ${T.border}`,
            padding: '16px 16px 14px', fontFamily: "'Segoe UI', sans-serif",
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Competência Financeira</span>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
            </div>

            <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }}>Atalhos rápidos</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 14 }}>
              {PRESETS.map(p => (
                <button key={p.key} onClick={() => handlePreset(p.key)} style={{
                  padding: '6px 0', borderRadius: 7, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit',
                  background: activePreset === p.key ? T.primary : T.bg,
                  color: activePreset === p.key ? '#fff' : T.sub,
                  border: `1px solid ${activePreset === p.key ? T.primary : T.border}`,
                  transition: 'all 0.1s',
                }}>{p.label}</button>
              ))}
            </div>

            <div style={{ height: 1, background: T.border, margin: '0 -16px 14px' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <button onClick={() => setNavAno(a => a - 1)} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, width: 30, height: 30, cursor: 'pointer', color: T.sub, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>‹</button>
              <span style={{ fontWeight: 900, fontSize: 17, color: T.text, letterSpacing: '-0.3px' }}>{navAno}</span>
              <button onClick={() => setNavAno(a => a + 1)} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, width: 30, height: 30, cursor: 'pointer', color: T.sub, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>›</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {MESES_S.map((m, i) => {
                const mStr = `${navAno}-${String(i+1).padStart(2,'0')}`
                const isSel = !dateRange && !activePreset && mesAno === mStr
                const isNow = mStr === CURRENT_MES
                return (
                  <button key={m} onClick={() => handleSelectMes(mStr)} style={{
                    padding: '9px 4px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                    fontWeight: isSel || isNow ? 700 : 500, textAlign: 'center',
                    fontFamily: 'inherit',
                    background: isSel ? T.primary : isNow && !isSel ? T.primaryLight : 'transparent',
                    color: isSel ? '#fff' : isNow && !isSel ? T.green : T.text,
                    border: isNow && !isSel ? `1px solid ${T.primary}` : '1px solid transparent',
                    transition: 'all 0.1s',
                  }}>{m}</button>
                )
              })}
            </div>

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{label}</span>
              <button onClick={() => handleSelectMes(CURRENT_MES)} style={{ background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', flexShrink: 0 }}>
                Hoje
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
