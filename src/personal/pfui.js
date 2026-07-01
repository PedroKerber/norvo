// ── NORVO · Plano Pessoa Física — componentes visuais premium ───────────────
// Reutilizáveis, alinhados à referência (laranja, cards suaves, valores grandes).
// Presentational only — não contêm regra de negócio.

export const PT = {
  orange: '#FF6A00',
  orange2: '#FF8A1C',
  orangeSoft: '#FFEDE0',
  green: '#059669',
  red: '#DC2626',
  orangeGrad: 'linear-gradient(135deg, #FF6A00 0%, #FF8A1C 100%)',
  sidebarGrad: 'linear-gradient(190deg, #0B0F14 0%, #0B0F14 50%, #3a1600 80%, #7a2f00 100%)',
}

// Botão primário/ghost premium
export const PfBtn = ({ children, onClick, ghost, disabled, icon, full, style = {} }) => (
  <button onClick={disabled ? undefined : onClick} disabled={disabled}
    className={ghost ? 'pf-btn pf-btn-ghost' : 'pf-btn'}
    style={{ width: full ? '100%' : 'auto', ...style }}>
    {icon && <span style={{ fontSize: 15 }}>{icon}</span>}{children}
  </button>
)

// Cabeçalho de página padronizado
export const PageHeader = ({ title, subtitle, right, actionLabel, onAction, actionIcon, actionGhost }) => (
  <div className="page-hd" style={{ marginBottom: 22 }}>
    <div>
      <h1 className="pf-h1">{title}</h1>
      {subtitle && <div style={{ color: 'var(--text-sub)', fontSize: 14, marginTop: 3 }}>{subtitle}</div>}
    </div>
    {right || (actionLabel && <PfBtn icon={actionIcon} ghost={actionGhost} onClick={onAction}>{actionLabel}</PfBtn>)}
  </div>
)

// Card de métrica (KPI) — bloco de ícone laranja, valor grande, delta/sub
export const MetricCard = ({ icon, label, value, delta, deltaLabel, sub, gradient, valueColor }) => {
  if (gradient) {
    return (
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '18px 20px', background: PT.orangeGrad, color: '#fff', boxShadow: '0 10px 26px rgba(255,106,0,0.30)' }}>
        <div style={{ position: 'absolute', right: -18, bottom: -22, fontSize: 120, opacity: 0.14, lineHeight: 1, pointerEvents: 'none' }}>{icon}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>{icon}</div>
          <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.95 }}>{label}</span>
        </div>
        <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.02em' }}>{value}</div>
        {sub && <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>{sub}</div>}
      </div>
    )
  }
  const isPos = delta >= 0
  return (
    <div className="pf-card pf-card-hover" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div className="pf-ico">{icon}</div>
        <span style={{ color: 'var(--text-sub)', fontSize: 13 }}>{label}</span>
      </div>
      <div style={{ fontWeight: 800, fontSize: 25, color: valueColor || 'var(--text)', letterSpacing: '-0.02em' }}>{value}</div>
      {delta !== undefined && delta !== null ? (
        <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 5 }}>
          <span style={{ color: isPos ? PT.green : PT.red, fontWeight: 700 }}>{isPos ? '↑' : '↓'} {Math.abs(delta).toFixed(1).replace('.', ',')}%</span> {deltaLabel || ''}
        </div>
      ) : (sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5 }}>{sub}</div>)}
    </div>
  )
}

// Switch premium (on/off) — usado no painel de personalização do Dashboard
export const PfSwitch = ({ checked, onChange, label, hint }) => (
  <label className="pf-cfg-row">
    <span style={{ minWidth: 0 }}>
      <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>{label}</span>
      {hint && <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{hint}</span>}
    </span>
    <span className="pf-switch">
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      <span className="pf-slider" />
    </span>
  </label>
)

// Card de seção (título + conteúdo) com estilo premium
export const SectionCard = ({ title, right, children, style = {}, bodyStyle = {} }) => (
  <div className="pf-card" style={{ padding: 20, ...style }}>
    {(title || right) && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        {title && <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{title}</div>}
        {right}
      </div>
    )}
    <div style={bodyStyle}>{children}</div>
  </div>
)
