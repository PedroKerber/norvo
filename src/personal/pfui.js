// ── NORVO · Plano Pessoa Física — componentes visuais premium ───────────────
// Reutilizáveis, alinhados à referência (laranja, cards suaves, valores grandes).
// Presentational only — não contêm regra de negócio.
import { useState, useRef, useEffect } from 'react'

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

// ── Kit de filtros premium (reutilizável em todas as telas PF) ───────────────
// Componentes presentational; a lógica de filtro continua em cada tela.

// Busca destacada com ícone de lupa.
export const PfSearch = ({ value, onChange, placeholder = 'Buscar…' }) => (
  <div className="pf-search">
    <span className="pf-search-ico" aria-hidden>🔍</span>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    {value && <button type="button" className="pf-search-clear" onClick={() => onChange('')} aria-label="Limpar busca">✕</button>}
  </div>
)

// Select estilizado (pílula) — mesma API leve dos selects do app.
export const PfSelect = ({ value, onChange, options = [], placeholder, ariaLabel }) => (
  <div className="pf-fselect">
    <select value={value} onChange={onChange} aria-label={ariaLabel || placeholder}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => typeof o === 'string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <span className="pf-fselect-caret" aria-hidden>▾</span>
  </div>
)

// Chips rápidos (segmented control) — ex.: status.
export const PfSegment = ({ value, onChange, options = [] }) => (
  <div className="pf-seg">
    {options.map(o => (
      <button key={o.value} type="button"
        className={'pf-seg-chip' + (value === o.value ? ' active' : '')}
        onClick={() => onChange(o.value)}>{o.label}</button>
    ))}
  </div>
)

// ── Filtro de período premium (100% custom — SEM input date/month nativo) ────
const _MFULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const _MABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const _pad = (n) => String(n).padStart(2, '0')
const _ymd = (y, m, d) => `${y}-${_pad(m)}-${_pad(d)}`
const _lastDay = (y, m) => new Date(y, m, 0).getDate()
const _brDate = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
const _mkDay = (y, m, d) => ({ from: _ymd(y, m, d), to: _ymd(y, m, d), label: _brDate(_ymd(y, m, d)), kind: 'dia' })
const _mkMonth = (y, m) => ({ from: _ymd(y, m, 1), to: _ymd(y, m, _lastDay(y, m)), label: `${_MFULL[m - 1]} / ${y}`, kind: 'mes' })
const _mkYear = (y) => ({ from: _ymd(y, 1, 1), to: _ymd(y, 12, 31), label: `Ano de ${y}`, kind: 'ano' })
const _mkRange = (f, t) => ({ from: f, to: t, label: `${_brDate(f)} – ${_brDate(t)}`, kind: 'periodo' })

// Período do mês atual (default usado pelas telas ao inicializar o estado).
export const pfCurrentMonthPeriod = () => { const n = new Date(); return _mkMonth(n.getFullYear(), n.getMonth() + 1) }

// Select estilizado numérico (dropdown nativo de lista — NÃO é calendário).
const Nsel = ({ value, onChange, options }) => (
  <div className="pf-fselect" style={{ flex: 1 }}>
    <select value={value} onChange={e => onChange(Number(e.target.value))}>
      {options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
    </select>
    <span className="pf-fselect-caret" aria-hidden>▾</span>
  </div>
)

export const PfPeriodFilter = ({ value, onChange, onClear }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const now = new Date()
  const curY = now.getFullYear(), curM = now.getMonth() + 1, curD = now.getDate()

  const parts = (iso, fb) => { if (!iso) return fb; const [y, m, d] = iso.split('-').map(Number); return { y, m, d } }
  const fromValue = (v) => {
    const f = parts(v?.from, { y: curY, m: curM, d: curD })
    const t = parts(v?.to, f)
    const tab = v?.kind === 'ano' ? 'ano' : v?.kind === 'dia' ? 'dia' : v?.kind === 'periodo' ? 'periodo' : 'mes'
    return { tab, dia: { ...f }, mes: { y: f.y, m: f.m }, ano: { y: f.y }, per: { s: { ...f }, e: { ...t } } }
  }
  const [draft, setDraft] = useState(() => fromValue(value))

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const yearOpts = []; for (let y = curY + 1; y >= curY - 8; y--) yearOpts.push({ v: y, label: String(y) })
  const monthOpts = _MABBR.map((mn, i) => ({ v: i + 1, label: mn }))
  const dayOpts = (y, m) => { const arr = []; for (let d = 1; d <= _lastDay(y, m); d++) arr.push({ v: d, label: _pad(d) }); return arr }

  const apply = (p) => { onChange(p); setOpen(false) }
  const applyDraft = () => {
    const d = draft
    if (d.tab === 'dia') apply(_mkDay(d.dia.y, d.dia.m, Math.min(d.dia.d, _lastDay(d.dia.y, d.dia.m))))
    else if (d.tab === 'mes') apply(_mkMonth(d.mes.y, d.mes.m))
    else if (d.tab === 'ano') apply(_mkYear(d.ano.y))
    else {
      let f = _ymd(d.per.s.y, d.per.s.m, Math.min(d.per.s.d, _lastDay(d.per.s.y, d.per.s.m)))
      let t = _ymd(d.per.e.y, d.per.e.m, Math.min(d.per.e.d, _lastDay(d.per.e.y, d.per.e.m)))
      if (f > t) { const tmp = f; f = t; t = tmp }
      apply(_mkRange(f, t))
    }
  }

  const yest = new Date(now); yest.setDate(curD - 1)
  const daysAgo = (n) => { const dt = new Date(now); dt.setDate(curD - (n - 1)); return _ymd(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()) }
  const prevM = new Date(curY, curM - 2, 1)
  const today = _ymd(curY, curM, curD)
  const chips = [
    { label: 'Hoje', p: { from: today, to: today, label: 'Hoje', kind: 'atalho' } },
    { label: 'Ontem', p: (() => { const i = _ymd(yest.getFullYear(), yest.getMonth() + 1, yest.getDate()); return { from: i, to: i, label: 'Ontem', kind: 'atalho' } })() },
    { label: 'Este mês', p: _mkMonth(curY, curM) },
    { label: 'Mês passado', p: _mkMonth(prevM.getFullYear(), prevM.getMonth() + 1) },
    { label: 'Últimos 7 dias', p: { from: daysAgo(7), to: today, label: 'Últimos 7 dias', kind: 'atalho' } },
    { label: 'Últimos 30 dias', p: { from: daysAgo(30), to: today, label: 'Últimos 30 dias', kind: 'atalho' } },
    { label: 'Últimos 90 dias', p: { from: daysAgo(90), to: today, label: 'Últimos 90 dias', kind: 'atalho' } },
    { label: 'Este ano', p: _mkYear(curY) },
  ]

  return (
    <div className="pf-pf" ref={ref}>
      <button type="button" className={'pf-pf-trigger' + (open ? ' active' : '')}
        onClick={() => { if (!open) setDraft(fromValue(value)); setOpen(o => !o) }}>
        <span aria-hidden>📅</span>
        <span className="pf-pf-label">{value?.label || 'Selecionar período'}</span>
        <span className="pf-pf-caret" aria-hidden>▾</span>
      </button>
      {open && (
        <div className="pf-pf-panel">
          <div className="pf-pf-chips">
            {chips.map(c => (
              <button key={c.label} type="button"
                className={'pf-seg-chip' + (value && value.label === c.p.label ? ' active' : '')}
                onClick={() => apply(c.p)}>{c.label}</button>
            ))}
          </div>
          <div className="pf-pf-tabs">
            {[['dia', 'Dia'], ['mes', 'Mês'], ['ano', 'Ano'], ['periodo', 'Período']].map(([k, lb]) => (
              <button key={k} type="button" className={'pf-pf-tab' + (draft.tab === k ? ' active' : '')}
                onClick={() => setDraft(d => ({ ...d, tab: k }))}>{lb}</button>
            ))}
          </div>
          <div className="pf-pf-body">
            {draft.tab === 'dia' && (
              <div className="pf-pf-row">
                <Nsel value={draft.dia.d} onChange={v => setDraft(d => ({ ...d, dia: { ...d.dia, d: v } }))} options={dayOpts(draft.dia.y, draft.dia.m)} />
                <Nsel value={draft.dia.m} onChange={v => setDraft(d => ({ ...d, dia: { ...d.dia, m: v } }))} options={monthOpts} />
                <Nsel value={draft.dia.y} onChange={v => setDraft(d => ({ ...d, dia: { ...d.dia, y: v } }))} options={yearOpts} />
              </div>
            )}
            {draft.tab === 'mes' && (
              <>
                <div className="pf-pf-stepper">
                  <button type="button" onClick={() => setDraft(d => ({ ...d, mes: { ...d.mes, y: d.mes.y - 1 } }))} aria-label="Ano anterior">◀</button>
                  <span>{draft.mes.y}</span>
                  <button type="button" onClick={() => setDraft(d => ({ ...d, mes: { ...d.mes, y: d.mes.y + 1 } }))} aria-label="Próximo ano">▶</button>
                </div>
                <div className="pf-pf-grid">
                  {_MABBR.map((mn, i) => (
                    <button key={mn} type="button" className={'pf-pf-cell' + (draft.mes.m === i + 1 ? ' active' : '')}
                      onClick={() => setDraft(d => ({ ...d, mes: { ...d.mes, m: i + 1 } }))}>{mn}</button>
                  ))}
                </div>
              </>
            )}
            {draft.tab === 'ano' && (
              <div className="pf-pf-grid">
                {yearOpts.map(o => (
                  <button key={o.v} type="button" className={'pf-pf-cell' + (draft.ano.y === o.v ? ' active' : '')}
                    onClick={() => setDraft(d => ({ ...d, ano: { y: o.v } }))}>{o.v}</button>
                ))}
              </div>
            )}
            {draft.tab === 'periodo' && (
              <>
                <div className="pf-pf-sub">De</div>
                <div className="pf-pf-row">
                  <Nsel value={draft.per.s.d} onChange={v => setDraft(d => ({ ...d, per: { ...d.per, s: { ...d.per.s, d: v } } }))} options={dayOpts(draft.per.s.y, draft.per.s.m)} />
                  <Nsel value={draft.per.s.m} onChange={v => setDraft(d => ({ ...d, per: { ...d.per, s: { ...d.per.s, m: v } } }))} options={monthOpts} />
                  <Nsel value={draft.per.s.y} onChange={v => setDraft(d => ({ ...d, per: { ...d.per, s: { ...d.per.s, y: v } } }))} options={yearOpts} />
                </div>
                <div className="pf-pf-sub" style={{ marginTop: 10 }}>Até</div>
                <div className="pf-pf-row">
                  <Nsel value={draft.per.e.d} onChange={v => setDraft(d => ({ ...d, per: { ...d.per, e: { ...d.per.e, d: v } } }))} options={dayOpts(draft.per.e.y, draft.per.e.m)} />
                  <Nsel value={draft.per.e.m} onChange={v => setDraft(d => ({ ...d, per: { ...d.per, e: { ...d.per.e, m: v } } }))} options={monthOpts} />
                  <Nsel value={draft.per.e.y} onChange={v => setDraft(d => ({ ...d, per: { ...d.per, e: { ...d.per.e, y: v } } }))} options={yearOpts} />
                </div>
              </>
            )}
          </div>
          <div className="pf-pf-foot">
            {onClear && <button type="button" className="pf-clear" onClick={() => { onClear(); setOpen(false) }}>Limpar período</button>}
            <button type="button" className="pf-pf-apply" onClick={applyDraft}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Barra de filtros premium: busca + segmentos + controles (inline / "Mais filtros") + chips ativos.
export const PfFilterBar = ({ search, onSearch, searchPlaceholder, segments, inline, more, chips, onClear, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen)
  const active = (chips || []).filter(Boolean)
  return (
    <div className="pf-filter">
      <div className="pf-filter-top">
        {onSearch && <PfSearch value={search} onChange={onSearch} placeholder={searchPlaceholder} />}
        {inline}
        {more && (
          <button type="button" className={'pf-more-btn' + (open ? ' active' : '')} onClick={() => setOpen(o => !o)}>
            <span aria-hidden>⚙</span> Filtros{active.length ? ` · ${active.length}` : ''}
          </button>
        )}
      </div>
      {segments && <PfSegment value={segments.value} onChange={segments.onChange} options={segments.options} />}
      {more && open && <div className="pf-filter-more">{more}</div>}
      {active.length > 0 && (
        <div className="pf-active-chips">
          {active.map((c, i) => (
            <span key={i} className="pf-chip">
              {c.label}
              <button type="button" className="pf-chip-x" onClick={c.onRemove} aria-label={`Remover ${c.label}`}>✕</button>
            </span>
          ))}
          {onClear && <button type="button" className="pf-clear" onClick={onClear}>Limpar filtros</button>}
        </div>
      )}
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
