import { useState, useEffect } from 'react'
import { T } from '../theme'
import { useMobile } from '../context/MobileContext'

export const Card = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{
    background: T.white, borderRadius: 12, boxShadow: T.shadow,
    border: `1px solid ${T.border}`, cursor: onClick ? 'pointer' : 'default', ...style
  }}>{children}</div>
)

export const Btn = ({ children, onClick, variant = 'primary', sm, full, disabled, style = {}, icon }) => {
  const variants = {
    primary: { background: T.primary, color: '#fff', border: `1px solid ${T.primary}` },
    outline: { background: 'transparent', color: T.primary, border: `1px solid ${T.primary}` },
    danger: { background: T.red, color: '#fff', border: `1px solid ${T.red}` },
    ghost: { background: 'transparent', color: T.sub, border: `1px solid ${T.border}` },
    dark: { background: T.sidebar, color: '#fff', border: `1px solid ${T.sidebar}` },
  }
  const v = variants[variant] || variants.primary
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      ...v, borderRadius: 8, padding: sm ? '6px 14px' : '10px 18px',
      fontWeight: 600, fontSize: sm ? 13 : 14, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, width: full ? '100%' : 'auto',
      fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
      whiteSpace: 'nowrap', transition: 'opacity .15s', ...style
    }}>
      {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
      {children}
    </button>
  )
}

export const Badge = ({ label, color = T.green, bg }) => (
  <span style={{
    background: bg || color + '18', color, borderRadius: 20,
    padding: '3px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
  }}>{label}</span>
)

export const StatusBadge = ({ status }) => {
  const map = {
    'Recebida': { color: T.green, bg: T.greenL },
    'Recebido': { color: T.green, bg: T.greenL },
    'Pago': { color: T.green, bg: T.greenL },
    'Paga': { color: T.green, bg: T.greenL },
    'A receber': { color: T.blue, bg: T.blueL },
    'A Pagar': { color: T.yellow, bg: T.yellowL },
    'Pendente': { color: T.yellow, bg: T.yellowL },
    'Atrasada': { color: T.red, bg: T.redL },
    'Atrasado': { color: T.red, bg: T.redL },
    'Cancelada': { color: T.muted, bg: T.borderLight },
    'Cancelado': { color: T.muted, bg: T.borderLight },
  }
  const s = map[status] || { color: T.muted, bg: T.borderLight }
  return <Badge label={status} color={s.color} bg={s.bg} />
}

export const KpiCard = ({ icon, iconBg, label, value, delta, deltaLabel, sub, onClick }) => {
  const isPos = delta >= 0
  return (
    <Card onClick={onClick} style={{ padding: '18px 20px', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ background: iconBg || T.primaryLight, borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
        <span style={{ color: T.sub, fontSize: 13 }}>{label}</span>
      </div>
      <div style={{ fontWeight: 800, fontSize: 22, color: T.text, marginBottom: 6 }}>{value}</div>
      {delta !== undefined && (
        <div style={{ fontSize: 12, color: T.sub }}>
          <span style={{ color: isPos ? T.green : T.red, fontWeight: 600 }}>
            {isPos ? '↑' : '↓'} {Math.abs(delta).toFixed(1).replace('.', ',')}%
          </span> {deltaLabel || 'vs período anterior'}
        </div>
      )}
      {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{sub}</div>}
    </Card>
  )
}

export const Input = ({ label, value, onChange, placeholder, type = 'text', err, style = {} }) => {
  const [foc, setFoc] = useState(false)
  return (
    <div style={{ marginBottom: 14, ...style }}>
      {label && <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: T.text, marginBottom: 5 }}>{label}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
        style={{ width: '100%', background: T.white, border: `1.5px solid ${err ? T.red : foc ? T.primary : T.border}`, borderRadius: 8, padding: '9px 12px', color: T.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      {err && <div style={{ color: T.red, fontSize: 12, marginTop: 3 }}>⚠ {err}</div>}
    </div>
  )
}

export const Select = ({ label, value, onChange, options, placeholder, style = {} }) => (
  <div style={{ marginBottom: 14, ...style }}>
    {label && <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: T.text, marginBottom: 5 }}>{label}</label>}
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={onChange} style={{ width: '100%', background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '9px 32px 9px 12px', color: value ? T.text : T.muted, fontSize: 14, outline: 'none', appearance: 'none', fontFamily: 'inherit' }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted, pointerEvents: 'none', fontSize: 12 }}>▾</span>
    </div>
  </div>
)

export const Modal = ({ title, onClose, children, footer, width = 520 }) => {
  const isMobile = useMobile()
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center', padding: isMobile ? 0 : 20,
    }}>
      <Card style={{
        width: '100%', maxWidth: isMobile ? '100%' : width,
        maxHeight: isMobile ? '92dvh' : '90vh',
        display: 'flex', flexDirection: 'column',
        borderRadius: isMobile ? '18px 18px 0 0' : 12,
      }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: T.sub }}>✕</button>
        </div>
        <div style={{ padding: isMobile ? '16px' : 20, overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && (
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
            {footer}
          </div>
        )}
      </Card>
    </div>
  )
}

export const Toast = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t) }, [onDone])
  const isMob = window.innerWidth < 768
  return (
    <div style={{
      position: 'fixed', zIndex: 9999, boxShadow: T.shadowMd,
      background: type === 'error' ? T.red : T.primary, color: '#fff',
      borderRadius: 10, padding: '12px 20px', fontWeight: 600, fontSize: 14,
      ...(isMob
        ? { bottom: 82, left: 16, right: 16, textAlign: 'center' }
        : { top: 20, right: 20 })
    }}>
      {type === 'error' ? '❌  ' : '✅  '}{msg}
    </div>
  )
}

export const Confirm = ({ msg, onYes, onNo }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
    <Card style={{ padding: 28, maxWidth: 360, width: '100%', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Confirmar exclusão</div>
      <div style={{ color: T.sub, fontSize: 14, marginBottom: 22 }}>{msg}</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn full variant="ghost" onClick={onNo}>Cancelar</Btn>
        <Btn full variant="danger" onClick={onYes}>Excluir</Btn>
      </div>
    </Card>
  </div>
)

export const EmptyState = ({ icon, title, sub, action }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
    <div style={{ fontSize: 52, marginBottom: 14 }}>{icon}</div>
    <div style={{ fontWeight: 700, fontSize: 16, color: T.sub, marginBottom: 6 }}>{title}</div>
    {sub && <div style={{ color: T.muted, fontSize: 14, marginBottom: 20 }}>{sub}</div>}
    {action}
  </div>
)

export const FilterBar = ({ children }) => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
    {children}
  </div>
)

export const SearchInput = ({ value, onChange, placeholder = 'Buscar...' }) => (
  <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted, fontSize: 14 }}>🔍</span>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '8px 12px 8px 34px', color: T.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
  </div>
)

export const Table = ({ columns, data, onRow, emptyState }) => {
  const isMobile = useMobile()

  if (isMobile) {
    const actionCol = columns.find(c => c.key === 'id')
    const mainCols  = columns.filter(c => c.key !== 'id')

    if (data.length === 0) return emptyState ? <>{emptyState}</> : null

    return (
      <div>
        {data.map((row, i) => (
          <div key={row.id || i}
            onClick={onRow ? () => onRow(row) : undefined}
            style={{ padding: '13px 16px', borderBottom: `1px solid ${T.borderLight}`, cursor: onRow ? 'pointer' : 'default' }}>
            {mainCols.map(col => {
              const rendered = col.render ? col.render(row[col.key], row) : row[col.key]
              return (
                <div key={col.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 11, color: T.muted, fontWeight: 600, flexShrink: 0, minWidth: 72 }}>{col.label}</span>
                  <div style={{ textAlign: 'right', minWidth: 0, overflow: 'hidden' }}>{rendered}</div>
                </div>
              )
            })}
            {actionCol && (
              <div onClick={e => e.stopPropagation()}
                style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.borderLight}`, display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 6 }}>
                {actionCol.render ? actionCol.render(row[actionCol.key], row) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${T.border}` }}>
            {columns.map(col => (
              <th key={col.key} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: T.sub, fontSize: 12, whiteSpace: 'nowrap' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && emptyState ? (
            <tr><td colSpan={columns.length}>{emptyState}</td></tr>
          ) : data.map((row, i) => (
            <tr key={row.id || i} onClick={onRow ? () => onRow(row) : undefined}
              style={{ borderBottom: `1px solid ${T.borderLight}`, cursor: onRow ? 'pointer' : 'default', transition: 'background .1s' }}
              onMouseEnter={e => { if (onRow) e.currentTarget.style.background = T.bg }}
              onMouseLeave={e => { e.currentTarget.style.background = '' }}>
              {columns.map(col => (
                <td key={col.key} style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
