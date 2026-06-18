import { useMemo, useState } from 'react'
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { T, fmt, fmtPct, fd } from '../theme'
import { useMobile } from '../context/MobileContext'

const TODAY  = new Date().toISOString().slice(0, 10)
const MESES  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const QUICK_PRESETS = [
  'Hoje','Ontem','Últimos 7 Dias','Últimos 15 Dias','Este Mês',
  'Mês Passado','Este Trimestre','Este Ano','Personalizado',
]

function addDays(ds, n) { const d = new Date(ds); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

function thisMonthRange() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth()
  const last = new Date(y, m + 1, 0).getDate()
  return {
    inicio: `${y}-${String(m+1).padStart(2,'0')}-01`,
    fim:    `${y}-${String(m+1).padStart(2,'0')}-${String(last).padStart(2,'0')}`,
  }
}

function presetRange(label) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth()
  const isoLastDay = (yr, mo) => new Date(yr, mo + 1, 0).toISOString().slice(0, 10)
  if (label === 'Hoje')           return { inicio: TODAY, fim: TODAY }
  if (label === 'Ontem')          return { inicio: addDays(TODAY, -1), fim: addDays(TODAY, -1) }
  if (label === 'Últimos 7 Dias') return { inicio: addDays(TODAY, -6), fim: TODAY }
  if (label === 'Últimos 15 Dias')return { inicio: addDays(TODAY, -14), fim: TODAY }
  if (label === 'Este Mês')       return thisMonthRange()
  if (label === 'Mês Passado') {
    const pm = m === 0 ? 11 : m - 1, py = m === 0 ? y - 1 : y
    return { inicio: `${py}-${String(pm+1).padStart(2,'0')}-01`, fim: isoLastDay(py, pm) }
  }
  if (label === 'Este Trimestre') {
    const qs = m - (m % 3)
    return { inicio: `${y}-${String(qs+1).padStart(2,'0')}-01`, fim: isoLastDay(y, qs + 2) }
  }
  if (label === 'Este Ano')       return { inicio: `${y}-01-01`, fim: `${y}-12-31` }
  return null
}

function prevRange(inicio, fim) {
  const s = new Date(inicio + 'T00:00:00'), e = new Date(fim + 'T00:00:00')
  const dur = e - s + 86400000
  const pe  = new Date(s - 86400000)
  const ps  = new Date(pe - dur + 86400000)
  return { inicio: ps.toISOString().slice(0, 10), fim: pe.toISOString().slice(0, 10) }
}

function delta(curr, prev) {
  if (!prev || prev === 0) return null
  return ((curr - prev) / Math.abs(prev)) * 100
}

function buildFluxo(lancs, inicio, fim) {
  const sD = new Date(inicio + 'T00:00:00')
  const eD = new Date(fim + 'T00:00:00')
  const days = Math.round((eD - sD) / 86400000) + 1
  let saldo = 0
  const pts = []
  if (days <= 32) {
    for (let d = new Date(sD); d <= eD; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10)
      const dl = lancs.filter(l => l.data === ds)
      const ent = dl.filter(l => l.tipo === 'receita' && l.status === 'Recebida').reduce((s, l) => s + l.valor, 0)
      const sai = dl.filter(l => (l.tipo === 'despesa' && (l.status === 'Paga' || l.status === 'Pago')) || l.tipo === 'retirada').reduce((s, l) => s + l.valor, 0)
      saldo += ent - sai
      pts.push({ label: String(d.getDate()).padStart(2,'0'), entradas: ent, saidas: sai, saldo })
    }
  } else {
    let d = new Date(sD.getFullYear(), sD.getMonth(), 1)
    while (d <= eD) {
      const ym = d.toISOString().slice(0, 7)
      const ml = lancs.filter(l => l.data?.startsWith(ym))
      const ent = ml.filter(l => l.tipo === 'receita' && l.status === 'Recebida').reduce((s, l) => s + l.valor, 0)
      const sai = ml.filter(l => (l.tipo === 'despesa' && (l.status === 'Paga' || l.status === 'Pago')) || l.tipo === 'retirada').reduce((s, l) => s + l.valor, 0)
      saldo += ent - sai
      pts.push({ label: MESES[d.getMonth()], entradas: ent, saidas: sai, saldo })
      d.setMonth(d.getMonth() + 1)
    }
  }
  return pts
}

// ── Sub-components ────────────────────────────────────────────────────────────
function DeltaBadge({ value, invert }) {
  if (value === null || value === undefined) return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
  const good = invert ? value <= 0 : value >= 0
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: good ? '#dcfce7' : '#fee2e2', color: good ? '#15803d' : '#dc2626' }}>
      {value >= 0 ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
    </span>
  )
}

function KpiCard({ label, value, deltaVal, invert, sub, onClick, warn }) {
  return (
    <div onClick={onClick} style={{ background: 'var(--card)', borderRadius: 14, padding: '18px 18px 14px', border: `1px solid ${warn ? '#fca5a5' : 'var(--border)'}`, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: -.2, marginBottom: 8, wordBreak: 'break-word' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <DeltaBadge value={deltaVal} invert={invert} />
        {sub && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</span>}
      </div>
    </div>
  )
}

function FluxoTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {fmt(p.value)}</div>)}
    </div>
  )
}

function SectionHead({ title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      {action}
    </div>
  )
}

function LinkBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', padding: 0 }}>
      {label} →
    </button>
  )
}

function Pill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 400, border: active ? 'none' : '1.5px solid var(--border)', background: active ? T.primary : 'var(--card)', color: active ? '#fff' : 'var(--text-sub)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', whiteSpace: 'nowrap' }}>
      {label}
    </button>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Dashboard({ empresa, data, setPage }) {
  const isMobile = useMobile()

  const init = thisMonthRange()
  const [editInicio, setEditInicio] = useState(init.inicio)
  const [editFim, setEditFim]       = useState(init.fim)
  const [inicio, setInicio]         = useState(init.inicio)
  const [fim, setFim]               = useState(init.fim)
  const [preset, setPreset]         = useState('Este Mês')

  const applyPreset = (label) => {
    setPreset(label)
    if (label === 'Personalizado') return
    const r = presetRange(label)
    if (!r) return
    setEditInicio(r.inicio); setEditFim(r.fim)
    setInicio(r.inicio); setFim(r.fim)
  }
  const applyDates = () => {
    setInicio(editInicio); setFim(editFim)
    setPreset('Personalizado')
  }

  const prev = useMemo(() => prevRange(inicio, fim), [inicio, fim])
  const lancs = useMemo(() => data.lancamentos || [], [data.lancamentos])

  const filtered     = useMemo(() => lancs.filter(l => l.data >= inicio && l.data <= fim), [lancs, inicio, fim])
  const prevFiltered = useMemo(() => lancs.filter(l => l.data >= prev.inicio && l.data <= prev.fim), [lancs, prev])

  // KPIs — fluxo de caixa (realizados)
  const { tRec, tDesp, tRet } = useMemo(() => ({
    tRec:  filtered.filter(l => l.tipo === 'receita' && l.status === 'Recebida').reduce((s, l) => s + l.valor, 0),
    tDesp: filtered.filter(l => l.tipo === 'despesa' && (l.status === 'Paga' || l.status === 'Pago')).reduce((s, l) => s + l.valor, 0),
    tRet:  filtered.filter(l => l.tipo === 'retirada').reduce((s, l) => s + l.valor, 0),
  }), [filtered])

  const lucro = tRec - tDesp
  const caixa = lucro - tRet

  // KPIs — período anterior
  const { pRec, pDesp, pRet } = useMemo(() => ({
    pRec:  prevFiltered.filter(l => l.tipo === 'receita' && l.status === 'Recebida').reduce((s, l) => s + l.valor, 0),
    pDesp: prevFiltered.filter(l => l.tipo === 'despesa' && (l.status === 'Paga' || l.status === 'Pago')).reduce((s, l) => s + l.valor, 0),
    pRet:  prevFiltered.filter(l => l.tipo === 'retirada').reduce((s, l) => s + l.valor, 0),
  }), [prevFiltered])

  const pLucro = pRec - pDesp
  const pCaixa = pLucro - pRet

  // Contas pendentes
  const { contasReceber, contasPagar } = useMemo(() => ({
    contasReceber: filtered.filter(l => l.tipo === 'receita' && l.status === 'A receber').reduce((s, l) => s + l.valor, 0),
    contasPagar:   filtered.filter(l => l.tipo === 'despesa' && (l.status === 'A Pagar' || l.status === 'Atrasada')).reduce((s, l) => s + l.valor, 0),
  }), [filtered])

  // Fluxo
  const fluxo    = useMemo(() => buildFluxo(lancs, inicio, fim), [lancs, inicio, fim])
  const fluxoTot = useMemo(() => fluxo.reduce((acc, d) => ({ ent: acc.ent + d.entradas, sai: acc.sai + d.saidas }), { ent: 0, sai: 0 }), [fluxo])

  // Categorias (Top 5)
  const despByCat = useMemo(() => {
    const map = {}
    filtered.filter(l => l.tipo === 'despesa').forEach(l => { map[l.catNome||'Outros'] = (map[l.catNome||'Outros']||0) + l.valor })
    return Object.entries(map).map(([n, v]) => ({ n: n.length > 26 ? n.slice(0,24)+'…' : n, v })).sort((a, b) => b.v - a.v).slice(0, 5)
  }, [filtered])

  const recByCat = useMemo(() => {
    const map = {}
    filtered.filter(l => l.tipo === 'receita').forEach(l => { map[l.catNome||'Outros'] = (map[l.catNome||'Outros']||0) + l.valor })
    return Object.entries(map).map(([n, v]) => ({ n: n.length > 26 ? n.slice(0,24)+'…' : n, v })).sort((a, b) => b.v - a.v).slice(0, 5)
  }, [filtered])

  // Projeção próximos 30 dias
  const previsao = useMemo(() => {
    const d30 = addDays(TODAY, 30)
    const future = lancs.filter(l => l.data > TODAY && l.data <= d30)
    const entradas = future.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
    const saidas   = future.filter(l => l.tipo === 'despesa' || l.tipo === 'retirada').reduce((s, l) => s + l.valor, 0)
    return { entradas, saidas, saldo: caixa + entradas - saidas }
  }, [lancs, caixa])

  // Saúde Financeira
  const saude = useMemo(() => {
    if (tRec === 0 && tDesp === 0)
      return { nivel: 'Sem Dados', color: '#9ca3af', bg: 'var(--bg)', msg: 'Nenhum lançamento realizado no período.' }
    const margem = tRec > 0 ? (lucro / tRec) * 100 : 0
    if (lucro < 0)
      return { nivel: 'Crítica', color: '#dc2626', bg: '#fff1f1', msg: 'Despesas superam as receitas. Revisão imediata necessária.' }
    if (caixa < 0)
      return { nivel: 'Atenção', color: '#ca8a04', bg: '#fefce8', msg: 'Caixa negativo após retiradas dos sócios. Monitorar.' }
    if (margem < 15)
      return { nivel: 'Atenção', color: '#ca8a04', bg: '#fefce8', msg: `Margem de ${fmtPct(margem)} — revise as despesas para melhorar o resultado.` }
    return { nivel: 'Excelente', color: '#16a34a', bg: '#f0fdf4', msg: `Fluxo saudável com margem de ${fmtPct(margem)} no período.` }
  }, [lucro, caixa, tRec, tDesp])

  // Insights NORVO IA
  const insights = useMemo(() => {
    const items = []
    if (filtered.length === 0) {
      items.push({ texto: 'Nenhum lançamento registrado no período selecionado.', pos: null })
      return items
    }
    const dRec = delta(tRec, pRec)
    if (dRec !== null)
      items.push({ texto: `Receita ${dRec >= 0 ? 'cresceu' : 'caiu'} ${Math.abs(dRec).toFixed(1)}% em relação ao período anterior.`, pos: dRec >= 0 })
    const margem = tRec > 0 ? (lucro / tRec) * 100 : 0
    if (tRec > 0)
      items.push({ texto: `Margem líquida de ${fmtPct(margem)} — ${margem >= 20 ? 'excelente resultado' : margem >= 10 ? 'dentro do esperado' : 'abaixo do ideal'}.`, pos: margem >= 10 })
    if (despByCat[0])
      items.push({ texto: `"${despByCat[0].n}" representa a maior concentração de despesas no período.`, pos: null })
    if (recByCat[0])
      items.push({ texto: `"${recByCat[0].n}" é a principal fonte de receita com ${fmt(recByCat[0].v)}.`, pos: true })
    if (contasReceber > 0)
      items.push({ texto: `${fmt(contasReceber)} em contas a receber no período — acompanhe as cobranças.`, pos: null })
    if (contasPagar > 0)
      items.push({ texto: `${fmt(contasPagar)} em contas a pagar ou atrasadas — monitore os vencimentos.`, pos: false })
    items.push({ texto: lucro >= 0 ? `Resultado positivo de ${fmt(lucro)} no período.` : `Resultado negativo de ${fmt(Math.abs(lucro))} — revisão de custos recomendada.`, pos: lucro >= 0 })
    return items.slice(0, 6)
  }, [filtered, tRec, pRec, lucro, tDesp, despByCat, recByCat, contasReceber, contasPagar])

  const recentes = useMemo(() => [...filtered].sort((a, b) => (b.data || '').localeCompare(a.data || '')).slice(0, 8), [filtered])
  const metas = data.metas || []

  const col2     = isMobile ? '1fr' : '1fr 1fr'
  const colSaude = isMobile ? '1fr' : '240px 1fr'
  const colPrev  = isMobile ? '1fr' : '1fr 1fr'
  const kpiCols  = isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)'

  const inpSty = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: 'var(--text)', maxWidth: 1400, margin: '0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Dashboard</h1>
            <div style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 3 }}>{empresa?.nome} · {fd(inicio)} a {fd(fim)}</div>
          </div>
        </div>

        {/* Quick presets */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {QUICK_PRESETS.map(p => <Pill key={p} label={p} active={preset === p} onClick={() => applyPreset(p)} />)}
        </div>

        {/* Date picker + Apply */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>De</div>
            <input type="date" value={editInicio} onChange={e => { setEditInicio(e.target.value); setPreset('Personalizado') }} style={inpSty} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>Até</div>
            <input type="date" value={editFim} onChange={e => { setEditFim(e.target.value); setPreset('Personalizado') }} style={inpSty} />
          </div>
          <button onClick={applyDates} style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>Aplicar</button>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: kpiCols, gap: 12, marginBottom: 20 }}>
        <KpiCard label="Receita Total"    value={fmt(tRec)}   deltaVal={delta(tRec, pRec)}     sub="vs. anterior" />
        <KpiCard label="Despesas Totais"  value={fmt(tDesp)}  deltaVal={delta(tDesp, pDesp)}   sub="vs. anterior" invert />
        <KpiCard label="Lucro Líquido"    value={fmt(lucro)}  deltaVal={delta(lucro, pLucro)}  sub="vs. anterior" />
        <KpiCard label="Saldo em Caixa"   value={fmt(caixa)}  deltaVal={delta(caixa, pCaixa)}  sub="após retiradas" />
        <KpiCard label="Contas a Receber" value={fmt(contasReceber)} deltaVal={null} sub="a receber no período" onClick={() => setPage('receitas')} />
        <KpiCard label="Contas a Pagar"   value={fmt(contasPagar)}   deltaVal={null} sub="a pagar / atrasadas" warn={contasPagar > 0} onClick={() => setPage('despesas')} />
      </div>

      {/* ── SAÚDE FINANCEIRA + NORVO AI ── */}
      <div style={{ display: 'grid', gridTemplateColumns: colSaude, gap: 14, marginBottom: 20 }}>

        {/* Saúde Financeira */}
        <div style={{ background: saude.bg, borderRadius: 14, padding: '20px', border: `1px solid ${saude.color}44` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 14 }}>Saúde Financeira</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: saude.color, flexShrink: 0 }} />
            <span style={{ fontSize: 20, fontWeight: 900, color: saude.color }}>{saude.nivel}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.55 }}>{saude.msg}</div>
        </div>

        {/* NORVO AI */}
        <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', borderLeft: '4px solid #0D2545', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0D2545', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: .3 }}>NORVO IA</div>
              <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>Análise inteligente · {fd(inicio)} a {fd(fim)}</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: T.primary, background: T.primary + '18', padding: '3px 10px', borderRadius: 10, letterSpacing: .5 }}>AUTO</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 7 }}>
            {insights.map((ins, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 12px', background: 'var(--bg)', borderRadius: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: ins.pos === null ? '#9ca3af' : ins.pos ? '#16a34a' : '#dc2626' }} />
                <span style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.45 }}>{ins.texto}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FLUXO DE CAIXA ── */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 20, overflow: 'hidden' }}>
        <SectionHead title="Fluxo de Caixa" action={<LinkBtn label="Ver completo" onClick={() => setPage('fluxo')} />} />
        <div style={{ padding: '18px 20px 16px' }}>
          <div style={{ display: 'flex', gap: 28, marginBottom: 16, flexWrap: 'wrap' }}>
            {[['Entradas', T.green, fluxoTot.ent],['Saídas', T.red, fluxoTot.sai],['Saldo', T.blue, fluxoTot.ent - fluxoTot.sai]].map(([l, c, v]) => (
              <div key={l}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{fmt(v)}</div>
              </div>
            ))}
          </div>
          {fluxo.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={fluxo} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip content={<FluxoTooltip />} />
                <Bar dataKey="entradas" name="Entradas" fill={T.green} opacity={0.75} radius={[3,3,0,0]} maxBarSize={16} />
                <Bar dataKey="saidas"   name="Saídas"   fill={T.red}   opacity={0.75} radius={[3,3,0,0]} maxBarSize={16} />
                <Line type="monotone"  dataKey="saldo" name="Saldo" stroke={T.blue} strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Nenhum lançamento no período</div>
          )}
        </div>
      </div>

      {/* ── PROJEÇÃO + METAS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: colPrev, gap: 14, marginBottom: 20 }}>

        {/* Projeção Próximos 30 Dias */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <SectionHead title="Projeção — Próximos 30 Dias" action={null} />
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
              Baseada em lançamentos futuros cadastrados no sistema.
            </div>
            {[
              { label: 'Entradas Previstas', value: previsao.entradas, color: '#16a34a' },
              { label: 'Saídas Previstas',   value: previsao.saidas,   color: '#dc2626' },
              { label: 'Saldo Projetado',    value: previsao.saldo,    color: previsao.saldo >= 0 ? '#7c3aed' : '#dc2626', big: true },
            ].map(({ label, value, color, big }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-sub)', fontWeight: big ? 700 : 400 }}>{label}</span>
                <span style={{ fontSize: big ? 18 : 14, fontWeight: big ? 900 : 700, color }}>{fmt(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Metas */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <SectionHead title="Metas" action={<LinkBtn label="Gerenciar" onClick={() => setPage('metas')} />} />
          <div style={{ padding: '16px 20px' }}>
            {metas.length === 0 ? (
              <div>
                <div style={{ color: 'var(--text-sub)', fontSize: 13, marginBottom: 14 }}>Nenhuma meta cadastrada.</div>
                <button onClick={() => setPage('metas')} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Criar Meta</button>
              </div>
            ) : metas.slice(0, 3).map(m => {
              const pct = Math.min(100, Math.round((m.acumulado || 0) / (m.objetivo || 1) * 100))
              const tipos = { receita: 'Meta de Receita', lucro: 'Meta de Lucro', margem: 'Meta de Margem' }
              const cor = pct >= 100 ? '#16a34a' : T.primary
              return (
                <div key={m.id} style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{tipos[m.tipo] || 'Meta'}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: cor }}>{pct}% concluído</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-sub)', marginBottom: 7 }}>
                    <span>Atual: <strong style={{ color: 'var(--text)' }}>{fmt(m.acumulado || 0)}</strong></span>
                    <span>Meta: <strong style={{ color: 'var(--text)' }}>{fmt(m.objetivo || 0)}</strong></span>
                  </div>
                  <div style={{ background: 'var(--border)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                    <div style={{ background: cor, height: '100%', width: `${pct}%`, borderRadius: 6, transition: 'width .6s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── TOP 5 DESPESAS + TOP 5 RECEITAS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: col2, gap: 14, marginBottom: 20 }}>
        {[
          { title: 'Top 5 Despesas', cats: despByCat, color: '#dc2626', page: 'despesas' },
          { title: 'Top 5 Receitas', cats: recByCat,  color: '#16a34a', page: 'receitas' },
        ].map(({ title, cats, color, page }) => {
          const total = cats.reduce((s, c) => s + c.v, 0)
          return (
            <div key={title} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <SectionHead title={title} action={<LinkBtn label="Ver tudo" onClick={() => setPage(page)} />} />
              <div style={{ padding: '14px 20px' }}>
                {cats.length === 0 ? (
                  <div style={{ color: 'var(--text-sub)', fontSize: 13, padding: '8px 0' }}>Nenhum dado no período.</div>
                ) : cats.map((cat, i) => {
                  const pct = total > 0 ? (cat.v / total * 100) : 0
                  return (
                    <div key={cat.n} style={{ marginBottom: i < cats.length - 1 ? 14 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', minWidth: 18, flexShrink: 0 }}>#{i+1}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.n}</span>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color }}>{fmt(cat.v)}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 5 }}>{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div style={{ height: 5, background: 'var(--border)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: 3 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── ÚLTIMAS TRANSAÇÕES ── */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <SectionHead title="Últimas Transações" action={<LinkBtn label="Ver todas" onClick={() => setPage('transacoes')} />} />
        {recentes.length === 0 && (
          <div style={{ padding: '24px 20px', color: 'var(--text-sub)', fontSize: 13 }}>Nenhuma transação no período.</div>
        )}
        {recentes.map((l, i) => {
          const isR = l.tipo === 'receita', isRet = l.tipo === 'retirada'
          const cor = isRet ? '#7c3aed' : isR ? '#16a34a' : '#dc2626'
          const statusC = (l.status === 'Recebida' || l.status === 'Pago' || l.status === 'Paga') ? '#16a34a' : l.status === 'Atrasada' ? '#dc2626' : '#ca8a04'
          return (
            <div key={l.id||i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderTop: i > 0 ? '1px solid var(--border-light)' : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: isR ? '#f0fdf4' : isRet ? '#ede9fe' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: cor, fontWeight: 800, fontSize: 14 }}>{isR ? '↑' : isRet ? '←' : '↓'}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.desc}</div>
                <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                  {l.catNome} · {l.data?.split('-').reverse().join('/')} · <span style={{ color: statusC, fontWeight: 600 }}>{l.status}</span>
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: cor, flexShrink: 0 }}>{isR ? '+' : '-'}{fmt(l.valor)}</div>
            </div>
          )
        })}
        {recentes.length > 0 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)', textAlign: 'center' }}>
            <button onClick={() => setPage('transacoes')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-sub)', cursor: 'pointer', fontFamily: 'inherit' }}>
              Ver Todas as Transações →
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
