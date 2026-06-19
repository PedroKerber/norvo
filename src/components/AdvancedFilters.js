import { useState, useEffect } from 'react'
import { T } from '../theme'
import { CATS_DESPESA, CATS_RECEITA } from '../data'
import { useMobile } from '../context/MobileContext'

const PRESETS = ['Hoje','Ontem','Últimos 7 dias','Últimos 30 dias','Este mês','Mês passado','Este trimestre','Este ano']
const FORMAS  = ['PIX','Boleto','Cartão Crédito','Cartão Débito','TED','DOC','Dinheiro','Transferência','Cheque']
const CENTROS = ['Administrativo','Comercial','Marketing','Financeiro','TI','RH','Operacional']

function addDays(ds, n) {
  const d = new Date(ds + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10)
}

function lastDay(y, m) { return new Date(y, m + 1, 0).toISOString().slice(0, 10) }

export function thisMonthRange() {
  const d = new Date(), y = d.getFullYear(), m = d.getMonth()
  return { inicio: `${y}-${String(m + 1).padStart(2, '0')}-01`, fim: lastDay(y, m) }
}

export function presetRange(label) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth()
  const td = now.toISOString().slice(0, 10)
  if (label === 'Hoje')           return { inicio: td, fim: td }
  if (label === 'Ontem')          { const d = addDays(td, -1); return { inicio: d, fim: d } }
  if (label === 'Últimos 7 dias') return { inicio: addDays(td, -6), fim: td }
  if (label === 'Últimos 30 dias') return { inicio: addDays(td, -29), fim: td }
  if (label === 'Este mês')       return { inicio: `${y}-${String(m + 1).padStart(2, '0')}-01`, fim: lastDay(y, m) }
  if (label === 'Mês passado') {
    const pm = m === 0 ? 11 : m - 1, py = m === 0 ? y - 1 : y
    return { inicio: `${py}-${String(pm + 1).padStart(2, '0')}-01`, fim: lastDay(py, pm) }
  }
  if (label === 'Este trimestre') {
    const q = Math.floor(m / 3) * 3
    return { inicio: `${y}-${String(q + 1).padStart(2, '0')}-01`, fim: lastDay(y, q + 2) }
  }
  if (label === 'Este ano') return { inicio: `${y}-01-01`, fim: `${y}-12-31` }
  return null
}

export function defaultFilter() {
  return {
    ...thisMonthRange(), preset: 'Este mês',
    cat: '', status: '', cliente: '', fornecedor: '',
    centroCusto: '', forma: '', valorMin: '', valorMax: '', projeto: '',
  }
}

export function loadSavedFilter(key) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null } catch { return null }
}

export function filterLancamentos(lancs, f) {
  return lancs.filter(l => {
    const d = l.data || ''
    if (f.inicio && d < f.inicio) return false
    if (f.fim    && d > f.fim)    return false
    if (f.cat    && l.cat !== f.cat) return false
    if (f.status && l.status !== f.status) return false
    if (f.cliente    && !(l.cliente    || '').toLowerCase().includes(f.cliente.toLowerCase()))    return false
    if (f.fornecedor && !(l.fornecedor || '').toLowerCase().includes(f.fornecedor.toLowerCase())) return false
    if (f.centroCusto && l.centroCusto !== f.centroCusto) return false
    if (f.forma && l.formaPagamento !== f.forma && l.forma !== f.forma) return false
    if (f.projeto && !(l.projeto || '').toLowerCase().includes(f.projeto.toLowerCase())) return false
    if (f.valorMin) {
      const mn = parseFloat(String(f.valorMin).replace(/\./g, '').replace(',', '.')) || 0
      if (l.valor < mn) return false
    }
    if (f.valorMax) {
      const mx = parseFloat(String(f.valorMax).replace(/\./g, '').replace(',', '.'))
      if (mx && l.valor > mx) return false
    }
    return true
  })
}

const iSty = {
  display: 'block', width: '100%', background: 'var(--card)',
  border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px',
  color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

const sSty = { ...iSty, appearance: 'none', paddingRight: 28, cursor: 'pointer' }

function FLabel({ children }) {
  return <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>{children}</label>
}

function FSel({ value, onChange, children }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={sSty}>{children}</select>
      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 12 }}>▾</span>
    </div>
  )
}

export default function AdvancedFilters({ tipo = 'all', cats, filter, onApply, extraActions, storageKey }) {
  const isMobile = useMobile()
  const [ei, setEi]         = useState(filter.inicio)
  const [ef, setEf]         = useState(filter.fim)
  const [ecat, setEcat]     = useState(filter.cat)
  const [estatus, setEs]    = useState(filter.status)
  const [ecliente, setEc]   = useState(filter.cliente)
  const [eforn, setEforn]   = useState(filter.fornecedor)
  const [ecentro, setEcen]  = useState(filter.centroCusto)
  const [eforma, setEforma] = useState(filter.forma)
  const [emin, setEmin]     = useState(filter.valorMin)
  const [emax, setEmax]     = useState(filter.valorMax)
  const [eprojeto, setEproj]= useState(filter.projeto)
  const [preset, setPreset] = useState(filter.preset || 'Este mês')
  const [showAdv, setShowAdv] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setEi(filter.inicio); setEf(filter.fim)
    setEcat(filter.cat); setEs(filter.status)
    setEc(filter.cliente); setEforn(filter.fornecedor)
    setEcen(filter.centroCusto); setEforma(filter.forma)
    setEmin(filter.valorMin); setEmax(filter.valorMax)
    setEproj(filter.projeto); setPreset(filter.preset || 'Este mês')
  }, [filter])

  const applyPreset = (label) => {
    setPreset(label)
    if (label === 'Personalizado') return
    const r = presetRange(label)
    if (!r) return
    setEi(r.inicio); setEf(r.fim)
    onApply({ ...filter, inicio: r.inicio, fim: r.fim, preset: label })
  }

  const saveFavorite = () => {
    if (!storageKey) return
    localStorage.setItem(storageKey, JSON.stringify(filter))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const apply = () => onApply({
    inicio: ei, fim: ef, preset,
    cat: ecat, status: estatus, cliente: ecliente, fornecedor: eforn,
    centroCusto: ecentro, forma: eforma, valorMin: emin, valorMax: emax, projeto: eprojeto,
  })

  const clear = () => onApply(defaultFilter())

  const removeChip = (key) => onApply({ ...filter, [key]: '' })

  const statusOpts = tipo === 'despesa'
    ? ['A Pagar', 'Paga', 'Atrasada', 'Cancelada']
    : tipo === 'receita'
      ? ['A receber', 'Recebida', 'Atrasada', 'Cancelada']
      : ['A Pagar', 'Paga', 'A receber', 'Recebida', 'Atrasada', 'Cancelada']

  const allCats = cats && cats.length > 0 ? cats : [...CATS_DESPESA, ...CATS_RECEITA]

  const chips = [
    filter.cat        && { key: 'cat',        icon: '📂', label: allCats.find(c => c.id === filter.cat)?.nome || filter.cat },
    filter.status     && { key: 'status',      icon: '📌', label: filter.status },
    filter.cliente    && { key: 'cliente',     icon: '👤', label: filter.cliente },
    filter.fornecedor && { key: 'fornecedor',  icon: '🏢', label: filter.fornecedor },
    filter.centroCusto && { key: 'centroCusto', icon: '🏷', label: filter.centroCusto },
    filter.forma      && { key: 'forma',       icon: '💳', label: filter.forma },
    filter.projeto    && { key: 'projeto',     icon: '📋', label: filter.projeto },
    (filter.valorMin || filter.valorMax) && { key: '_valor', icon: '💰', label: `${filter.valorMin || '0'} — ${filter.valorMax || '∞'}`, keys: ['valorMin', 'valorMax'] },
  ].filter(Boolean)

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>

        {/* Linha principal */}
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <FLabel>📅 Data Inicial</FLabel>
                <input type="date" value={ei} onChange={e => { setEi(e.target.value); setPreset('Personalizado') }} style={iSty} />
              </div>
              <div>
                <FLabel>📅 Data Final</FLabel>
                <input type="date" value={ef} onChange={e => { setEf(e.target.value); setPreset('Personalizado') }} style={iSty} />
              </div>
            </div>
            <div>
              <FLabel>📂 Categoria</FLabel>
              <FSel value={ecat} onChange={setEcat}>
                <option value="">Todas</option>
                {allCats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </FSel>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={apply} style={{ flex: 2, background: T.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                🔍 Aplicar
              </button>
              <button onClick={clear} style={{ flex: 1, background: 'none', border: '1px solid var(--border)', color: 'var(--text-sub)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                🧹 Limpar
              </button>
              {storageKey && (
                <button onClick={saveFavorite} style={{ flex: 1, background: saved ? T.green : 'none', color: saved ? '#fff' : 'var(--text-sub)', border: `1px solid ${saved ? T.green : 'var(--border)'}`, borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', transition: 'all .2s' }}>
                  {saved ? '✓' : '💾'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr auto auto auto', gap: 12, alignItems: 'end', marginBottom: 14 }}>
            <div>
              <FLabel>📅 Data Inicial</FLabel>
              <input type="date" value={ei} onChange={e => { setEi(e.target.value); setPreset('Personalizado') }} style={iSty} />
            </div>
            <div>
              <FLabel>📅 Data Final</FLabel>
              <input type="date" value={ef} onChange={e => { setEf(e.target.value); setPreset('Personalizado') }} style={iSty} />
            </div>
            <div>
              <FLabel>📂 Categoria</FLabel>
              <FSel value={ecat} onChange={setEcat}>
                <option value="">Todas</option>
                {allCats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </FSel>
            </div>
            <button onClick={apply} style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              🔍 Aplicar
            </button>
            <button onClick={clear} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-sub)', borderRadius: 8, padding: '9px 14px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              🧹 Limpar
            </button>
            {storageKey && (
              <button onClick={saveFavorite} style={{ background: saved ? T.green : 'none', color: saved ? '#fff' : 'var(--text-sub)', border: `1px solid ${saved ? T.green : 'var(--border)'}`, borderRadius: 8, padding: '9px 14px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .2s' }}>
                {saved ? '✓ Salvo!' : '💾 Favorito'}
              </button>
            )}
          </div>
        )}

        {/* Presets rápidos */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {PRESETS.map(p => (
            <button key={p} onClick={() => applyPreset(p)} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: preset === p ? 600 : 400,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
              background: preset === p ? T.primary : 'var(--bg)',
              color: preset === p ? '#fff' : 'var(--text-sub)',
              border: preset === p ? 'none' : '1.5px solid var(--border)',
            }}>{p}</button>
          ))}
        </div>

        {/* Filtros Avançados */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <button onClick={() => setShowAdv(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
            Filtros Avançados {showAdv ? '▲' : '▼'}
          </button>
          {showAdv && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginTop: 14 }}>
              <div>
                <FLabel>📌 Status</FLabel>
                <FSel value={estatus} onChange={setEs}>
                  <option value="">Todos</option>
                  {statusOpts.map(s => <option key={s} value={s}>{s}</option>)}
                </FSel>
              </div>
              <div>
                <FLabel>💳 Forma de Pagamento</FLabel>
                <FSel value={eforma} onChange={setEforma}>
                  <option value="">Todas</option>
                  {FORMAS.map(f => <option key={f} value={f}>{f}</option>)}
                </FSel>
              </div>
              <div>
                <FLabel>🏷 Centro de Custo</FLabel>
                <FSel value={ecentro} onChange={setEcen}>
                  <option value="">Todos</option>
                  {CENTROS.map(c => <option key={c} value={c}>{c}</option>)}
                </FSel>
              </div>
              {tipo !== 'receita' && (
                <div>
                  <FLabel>🏢 Fornecedor</FLabel>
                  <input value={eforn} onChange={e => setEforn(e.target.value)} placeholder="Buscar fornecedor..." style={iSty} />
                </div>
              )}
              {tipo !== 'despesa' && (
                <div>
                  <FLabel>👤 Cliente</FLabel>
                  <input value={ecliente} onChange={e => setEc(e.target.value)} placeholder="Buscar cliente..." style={iSty} />
                </div>
              )}
              <div>
                <FLabel>📋 Projeto</FLabel>
                <input value={eprojeto} onChange={e => setEproj(e.target.value)} placeholder="Buscar projeto..." style={iSty} />
              </div>
              <div>
                <FLabel>💰 Valor mínimo</FLabel>
                <input value={emin} onChange={e => setEmin(e.target.value)} placeholder="Ex: 100,00" style={iSty} />
              </div>
              <div>
                <FLabel>💰 Valor máximo</FLabel>
                <input value={emax} onChange={e => setEmax(e.target.value)} placeholder="Ex: 5000,00" style={iSty} />
              </div>
              {extraActions}
            </div>
          )}
        </div>
      </div>

      {/* Chips de filtros ativos */}
      {chips.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-sub)', fontWeight: 600 }}>Filtros ativos:</span>
          {chips.map(ch => (
            <span key={ch.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: T.primaryLight, color: T.primary, borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 600, border: `1px solid ${T.primary}30` }}>
              {ch.icon} {ch.label}
              <button onClick={() => {
                if (ch.keys) {
                  const upd = { ...filter }; ch.keys.forEach(k => { upd[k] = '' }); onApply(upd)
                } else {
                  removeChip(ch.key)
                }
              }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.primary, fontSize: 14, lineHeight: 1, padding: 0, marginLeft: 2, fontFamily: 'inherit' }}>×</button>
            </span>
          ))}
          <button onClick={clear} style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Limpar todos</button>
        </div>
      )}
    </div>
  )
}
