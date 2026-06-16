import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { T, fmt, fmtS, fmtPct, fd } from '../theme'
import { Card, Badge, StatusBadge } from '../components/ui'
import { CATS_DESPESA, CATS_RECEITA, CONTAS } from '../data'

// ── module-level helpers ──────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10)
const MESES  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const FORMAS = ['PIX','Boleto','Cartão de Crédito','Cartão de Débito','TED','DOC','Cheque','Dinheiro']
const STATUS_OPTS = ['Recebida','A receber','Paga','A Pagar','Atrasada','Cancelada']
const CENTROS = ['Administrativo','Comercial','Marketing','Financeiro','TI','RH','Operacional']
const ALL_CATS = [...CATS_DESPESA, ...CATS_RECEITA]
const CAT_COLORS = ['#16a34a','#2563eb','#7c3aed','#ea580c','#0891b2','#9ca3af','#dc2626','#ca8a04']
const QUICK_PRESETS = ['Hoje','Esta Semana','Este Mês','Mês Passado','Últimos 30 Dias','Este Ano','Personalizado']

function isoLastDay(y, m) { return new Date(y, m + 1, 0).toISOString().slice(0, 10) }

function addDays(ds, n) {
  const d = new Date(ds); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10)
}

function thisMonthRange() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth()
  return { inicio: `${y}-${String(m+1).padStart(2,'0')}-01`, fim: isoLastDay(y, m) }
}

function presetRange(label) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth()
  if (label === 'Hoje')          return { inicio: TODAY, fim: TODAY }
  if (label === 'Esta Semana') {
    const dow = now.getDay() || 7
    const mon = new Date(now); mon.setDate(now.getDate() - dow + 1)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return { inicio: mon.toISOString().slice(0,10), fim: sun.toISOString().slice(0,10) }
  }
  if (label === 'Este Mês')      return thisMonthRange()
  if (label === 'Mês Passado') {
    const pm = m === 0 ? 11 : m - 1, py = m === 0 ? y - 1 : y
    return { inicio: `${py}-${String(pm+1).padStart(2,'0')}-01`, fim: isoLastDay(py, pm) }
  }
  if (label === 'Últimos 30 Dias') return { inicio: addDays(TODAY, -29), fim: TODAY }
  if (label === 'Este Ano')      return { inicio: `${y}-01-01`, fim: `${y}-12-31` }
  return null
}

function calcDelta(cur, prev) {
  if (!prev) return null
  return ((cur - prev) / prev) * 100
}

function buildChart(lancs, inicio, fim) {
  const s = new Date(inicio), e = new Date(fim)
  const days = Math.round((e - s) / 86400000) + 1
  const pts = []
  if (days <= 31) {
    let cR = 0, cD = 0
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10)
      const r  = lancs.filter(l => l.data === ds && l.tipo === 'receita').reduce((a,l) => a + l.valor, 0)
      const dp = lancs.filter(l => l.data === ds && l.tipo === 'despesa').reduce((a,l) => a + l.valor, 0)
      cR += r; cD += dp
      const day = d.getDate()
      if (day === 1 || day % 5 === 0 || +d === +e)
        pts.push({ label: ds.slice(5).replace('-','/'), Receitas: cR, Despesas: cD, Resultado: cR - cD })
    }
  } else if (days <= 90) {
    let d = new Date(s)
    while (d <= e) {
      const we = new Date(d); we.setDate(d.getDate() + 6); if (we > e) we.setTime(e.getTime())
      const ds = d.toISOString().slice(0,10), de = we.toISOString().slice(0,10)
      const r  = lancs.filter(l => l.data >= ds && l.data <= de && l.tipo === 'receita').reduce((a,l) => a+l.valor, 0)
      const dp = lancs.filter(l => l.data >= ds && l.data <= de && l.tipo === 'despesa').reduce((a,l) => a+l.valor, 0)
      pts.push({ label: ds.slice(5).replace('-','/'), Receitas: r, Despesas: dp, Resultado: r - dp })
      d.setDate(d.getDate() + 7)
    }
  } else {
    let d = new Date(s.getFullYear(), s.getMonth(), 1)
    while (d <= e) {
      const ym = d.toISOString().slice(0,7)
      const r  = lancs.filter(l => l.data && l.data.startsWith(ym) && l.tipo === 'receita').reduce((a,l) => a+l.valor, 0)
      const dp = lancs.filter(l => l.data && l.data.startsWith(ym) && l.tipo === 'despesa').reduce((a,l) => a+l.valor, 0)
      pts.push({ label: MESES[d.getMonth()] + '/' + String(d.getFullYear()).slice(2), Receitas: r, Despesas: dp, Resultado: r - dp })
      d.setMonth(d.getMonth() + 1)
    }
  }
  return pts
}

const DEFAULT_FILTER = { ...thisMonthRange(), cat: '', status: '', cliente: '', fornecedor: '', conta: '', forma: '', centro: '' }

const iSty = { display: 'block', width: '100%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
const sSty = { ...iSty, cursor: 'pointer' }
function chip(active) {
  return {
    padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: active ? 600 : 400,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
    border: active ? 'none' : '1.5px solid var(--border)',
    background: active ? T.primary : 'var(--card)',
    color: active ? '#fff' : 'var(--text-sub)',
  }
}
function hdrBtn(bg, color) {
  return { display: 'flex', alignItems: 'center', gap: 6, background: bg, border: bg === 'var(--card)' ? '1px solid var(--border)' : 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, color, fontWeight: bg !== 'var(--card)' ? 600 : 400, fontFamily: 'inherit' }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Relatorios({ empresa, data, setPage }) {
  const allLancs = useMemo(() => data.lancamentos || [], [data.lancamentos])

  // Filter edit state (pending, not yet applied)
  const [editInicio, setEditInicio]     = useState(DEFAULT_FILTER.inicio)
  const [editFim, setEditFim]           = useState(DEFAULT_FILTER.fim)
  const [editCat, setEditCat]           = useState('')
  const [preset, setPreset]             = useState('Este Mês')
  const [showAvancado, setShowAvancado] = useState(false)
  const [editStatus, setEditStatus]     = useState('')
  const [editCliente, setEditCliente]   = useState('')
  const [editForn, setEditForn]         = useState('')
  const [editConta, setEditConta]       = useState('')
  const [editForma, setEditForma]       = useState('')
  const [editCentro, setEditCentro]     = useState('')

  // Applied state (triggers data calculations)
  const [applied, setApplied] = useState(DEFAULT_FILTER)

  // Table state
  const [search, setSearch]   = useState('')
  const [pageNum, setPageNum] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [sortKey, setSortKey] = useState('data')
  const [sortDir, setSortDir] = useState('desc')

  const applyPreset = (label) => {
    setPreset(label)
    if (label === 'Personalizado') return
    const range = presetRange(label)
    if (!range) return
    setEditInicio(range.inicio)
    setEditFim(range.fim)
    setApplied(prev => ({ ...prev, inicio: range.inicio, fim: range.fim }))
    setPageNum(1)
  }

  const applyFilters = () => {
    setApplied({ inicio: editInicio, fim: editFim, cat: editCat, status: editStatus, cliente: editCliente, fornecedor: editForn, conta: editConta, forma: editForma, centro: editCentro })
    setPageNum(1)
  }

  const clearFilters = () => {
    const r = thisMonthRange()
    setEditInicio(r.inicio); setEditFim(r.fim); setEditCat(''); setPreset('Este Mês')
    setEditStatus(''); setEditCliente(''); setEditForn(''); setEditConta(''); setEditForma(''); setEditCentro('')
    setApplied(DEFAULT_FILTER); setPageNum(1)
  }

  // Filtered data
  const filteredLancs = useMemo(() => allLancs.filter(l => {
    const d = l.data || ''
    if (d < applied.inicio || d > applied.fim) return false
    if (applied.cat && l.cat !== applied.cat) return false
    if (applied.status && l.status !== applied.status) return false
    if (applied.cliente && !(l.cliente || '').toLowerCase().includes(applied.cliente.toLowerCase())) return false
    if (applied.fornecedor && !(l.fornecedor || '').toLowerCase().includes(applied.fornecedor.toLowerCase())) return false
    if (applied.conta && l.contaBancaria !== applied.conta) return false
    if (applied.forma && l.formaPagamento !== applied.forma) return false
    if (applied.centro && l.centroCusto !== applied.centro) return false
    return true
  }), [allLancs, applied])

  // Previous period for deltas
  const prevLancs = useMemo(() => {
    const s = new Date(applied.inicio), e = new Date(applied.fim)
    const days = Math.round((e - s) / 86400000) + 1
    const prevFim = addDays(applied.inicio, -1)
    const prevInicio = addDays(prevFim, -(days - 1))
    return allLancs.filter(l => { const d = l.data || ''; return d >= prevInicio && d <= prevFim })
  }, [allLancs, applied])

  // KPIs
  const kRec  = filteredLancs.filter(l => l.tipo === 'receita').reduce((s,l) => s + l.valor, 0)
  const kDesp = filteredLancs.filter(l => l.tipo === 'despesa').reduce((s,l) => s + l.valor, 0)
  const kRes  = kRec - kDesp
  const kAR   = filteredLancs.filter(l => l.tipo === 'receita' && l.status === 'A receber').reduce((s,l) => s + l.valor, 0)
  const kAP   = filteredLancs.filter(l => l.tipo === 'despesa' && l.status === 'A Pagar').reduce((s,l) => s + l.valor, 0)
  const margem = kRec > 0 ? (kRes / kRec) * 100 : 0

  const pRec  = prevLancs.filter(l => l.tipo === 'receita').reduce((s,l) => s + l.valor, 0)
  const pDesp = prevLancs.filter(l => l.tipo === 'despesa').reduce((s,l) => s + l.valor, 0)
  const pAR   = prevLancs.filter(l => l.tipo === 'receita' && l.status === 'A receber').reduce((s,l) => s + l.valor, 0)
  const pAP   = prevLancs.filter(l => l.tipo === 'despesa' && l.status === 'A Pagar').reduce((s,l) => s + l.valor, 0)

  // Chart
  const chartData = useMemo(() => buildChart(filteredLancs, applied.inicio, applied.fim), [filteredLancs, applied])

  // Table
  const tableData = useMemo(() => {
    let arr = [...filteredLancs]
    if (search) {
      const q = search.toLowerCase()
      arr = arr.filter(l => [l.desc, l.catNome, l.cliente, l.fornecedor, l.status].filter(Boolean).some(v => v.toLowerCase().includes(q)))
    }
    arr.sort((a, b) => {
      if (sortKey === 'valor') return sortDir === 'desc' ? (b.valor||0) - (a.valor||0) : (a.valor||0) - (b.valor||0)
      const av = String(a[sortKey] || ''), bv = String(b[sortKey] || '')
      return sortDir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv)
    })
    return arr
  }, [filteredLancs, search, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(tableData.length / perPage))
  const pagedData  = tableData.slice((pageNum - 1) * perPage, pageNum * perPage)

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
    setPageNum(1)
  }

  // Exports
  const exportExcel = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(tableData.map(l => ({
      Data: l.data, Tipo: l.tipo === 'receita' ? 'Receita' : 'Despesa',
      Descrição: l.desc, Categoria: l.catNome, Status: l.status,
      Valor: l.valor, Cliente: l.cliente || '', Fornecedor: l.fornecedor || '',
    })))
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório')
    XLSX.writeFile(wb, `relatorio_${empresa?.nome||'x8'}_${applied.inicio}_${applied.fim}.xlsx`)
  }

  const exportPDF = () => {
    const html = `<html><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#111}
      h1{font-size:20px;margin:0 0 4px}p{color:#666;margin:0 0 16px}
      .kpis{display:flex;gap:24px;margin-bottom:20px}
      .kpi .kl{font-size:11px;color:#666}.kpi .kv{font-size:16px;font-weight:700}
      table{width:100%;border-collapse:collapse}
      th{background:#f3f4f6;text-align:left;padding:8px;font-size:11px;border-bottom:1px solid #e5e7eb}
      td{padding:8px;border-bottom:1px solid #f3f4f6;font-size:12px}
    </style></head><body>
      <h1>Relatório Financeiro — ${empresa?.nome||''}</h1>
      <p>Período: ${fd(applied.inicio)} a ${fd(applied.fim)}</p>
      <div class="kpis">
        <div class="kpi"><div class="kl">Receitas</div><div class="kv" style="color:#16a34a">${fmt(kRec)}</div></div>
        <div class="kpi"><div class="kl">Despesas</div><div class="kv" style="color:#dc2626">${fmt(kDesp)}</div></div>
        <div class="kpi"><div class="kl">Resultado</div><div class="kv">${fmt(kRes)}</div></div>
        <div class="kpi"><div class="kl">Margem</div><div class="kv">${fmtPct(margem)}</div></div>
      </div>
      <table>
        <tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Status</th><th>Valor</th></tr>
        ${tableData.map(l => `<tr>
          <td>${fd(l.data)}</td><td>${l.tipo==='receita'?'Receita':'Despesa'}</td>
          <td>${l.desc||''}</td><td>${l.catNome||''}</td><td>${l.status||''}</td>
          <td style="color:${l.tipo==='receita'?'#16a34a':'#dc2626'};font-weight:700">${fmt(l.valor)}</td>
        </tr>`).join('')}
      </table>
    </body></html>`
    const win = window.open('','_blank')
    if (win) { win.document.write(html); win.document.close(); win.print() }
  }

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: 'var(--text)' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Relatórios</h1>
          <div style={{ color: 'var(--text-sub)', fontSize: 14 }}>Analise o desempenho financeiro da sua empresa.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={hdrBtn('var(--card)', 'var(--text-sub)')}>💾 Salvar relatório</button>
          <button onClick={exportExcel} style={hdrBtn('#16a34a', '#fff')}>📊 Exportar Excel</button>
          <button onClick={exportPDF}   style={hdrBtn('#dc2626', '#fff')}>📄 Exportar PDF</button>
          <button style={hdrBtn('var(--card)', 'var(--text-sub)')}>⋮</button>
        </div>
      </div>

      {/* FILTROS */}
      <Card style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto auto', gap: 12, alignItems: 'end', marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>Data inicial</label>
            <input type="date" value={editInicio} onChange={e => { setEditInicio(e.target.value); setPreset('Personalizado') }} style={iSty} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>Data final</label>
            <input type="date" value={editFim} onChange={e => { setEditFim(e.target.value); setPreset('Personalizado') }} style={iSty} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>Empresa</label>
            <div style={{ ...iSty, background: 'var(--bg)', color: 'var(--text-sub)', cursor: 'default' }}>{empresa?.nome || '—'}</div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>Categoria</label>
            <select value={editCat} onChange={e => setEditCat(e.target.value)} style={sSty}>
              <option value="">Todas</option>
              {ALL_CATS.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <button onClick={applyFilters} style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            ✅ Aplicar filtros
          </button>
          <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            🔄 Limpar filtros
          </button>
        </div>

        {/* Quick presets */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {QUICK_PRESETS.map(p => (
            <button key={p} onClick={() => applyPreset(p)} style={chip(preset === p)}>{p}</button>
          ))}
        </div>

        {/* Advanced filters */}
        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <button onClick={() => setShowAvancado(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            Filtros Avançados {showAvancado ? '▲' : '▼'}
          </button>
          {showAvancado && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 12 }}>
              {[
                { label: 'Centro de Custo',    val: editCentro,  set: setEditCentro,  opts: CENTROS },
                { label: 'Status',             val: editStatus,  set: setEditStatus,  opts: STATUS_OPTS },
                { label: 'Conta Bancária',     val: editConta,   set: setEditConta,   opts: CONTAS.map(c => c.nome) },
                { label: 'Forma de Pagamento', val: editForma,   set: setEditForma,   opts: FORMAS },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>{f.label}</label>
                  <select value={f.val} onChange={e => f.set(e.target.value)} style={sSty}>
                    <option value="">Todos</option>
                    {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>Cliente</label>
                <input placeholder="Buscar cliente..." value={editCliente} onChange={e => setEditCliente(e.target.value)} style={iSty} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>Fornecedor</label>
                <input placeholder="Buscar fornecedor..." value={editForn} onChange={e => setEditForn(e.target.value)} style={iSty} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>Projeto</label>
                <input placeholder="Em breve..." style={{ ...iSty, opacity: 0.5, cursor: 'not-allowed' }} readOnly />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Receitas',   value: kRec,  d: calcDelta(kRec, pRec),   color: T.green,  bg: T.greenL,  icon: '↑' },
          { label: 'Despesas',   value: kDesp, d: calcDelta(kDesp, pDesp), color: T.red,    bg: T.redL,    icon: '↓' },
          { label: 'Resultado',  value: kRes,  d: calcDelta(kRes, pRec - pDesp), color: T.blue, bg: T.blueL, icon: '$' },
          { label: 'A Receber',  value: kAR,   d: calcDelta(kAR, pAR),     color: '#ea580c', bg: T.orangeL, icon: '📅' },
          { label: 'A Pagar',    value: kAP,   d: calcDelta(kAP, pAP),     color: '#ca8a04', bg: T.yellowL, icon: '📤' },
        ].map(k => (
          <Card key={k.label} style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: k.color, fontWeight: 700, flexShrink: 0 }}>{k.icon}</div>
              <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{k.label}</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: 19, color: k.color, marginBottom: 6 }}>{fmtS(k.value)}</div>
            {k.d !== null && isFinite(k.d) && (
              <div style={{ fontSize: 11, color: k.d >= 0 ? T.green : T.red }}>
                {k.d >= 0 ? '↑' : '↓'} {Math.abs(k.d).toFixed(1)}% vs período anterior
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* CHART + RESUMO */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, marginBottom: 20 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Receitas x Despesas x Resultado ⓘ</div>
              <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                {[['Receitas', T.green], ['Despesas', T.red], ['Resultado', T.blue]].map(([l, c]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-sub)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />{l}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: 'var(--text-sub)' }}>Mensal ▾</div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v} />
                <Tooltip formatter={v => fmt(v)} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="Receitas" stroke={T.green}  strokeWidth={2.5} dot={{ r: 3, fill: T.green  }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Despesas" stroke={T.red}    strokeWidth={2.5} dot={{ r: 3, fill: T.red    }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Resultado" stroke={T.blue}  strokeWidth={2.5} dot={{ r: 3, fill: T.blue  }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 14 }}>
              Nenhum lançamento no período selecionado
            </div>
          )}
        </Card>

        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Resumo do período</div>
          {[
            { label: 'Total de receitas',  value: fmt(kRec),       color: T.green },
            { label: 'Total de despesas',  value: fmt(kDesp),      color: T.red   },
            { label: 'Resultado líquido',  value: fmt(kRes),       color: kRes >= 0 ? T.green : T.red },
            { label: 'Margem de lucro',    value: fmtPct(margem),  color: margem >= 0 ? T.green : T.red },
          ].map((r, i, arr) => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, marginBottom: i < arr.length - 1 ? 12 : 0, borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{r.label}</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: r.color }}>{r.value}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* LANÇAMENTOS */}
      <Card>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Lançamentos</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted, fontSize: 13 }}>🔍</span>
              <input value={search} onChange={e => { setSearch(e.target.value); setPageNum(1) }}
                placeholder="Buscar lançamentos..."
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px 7px 32px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', width: 220 }} />
            </div>
            <button style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--text-sub)', fontFamily: 'inherit' }}>⊞ Colunas</button>
            <button style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--text-sub)', fontFamily: 'inherit' }}>⋮ Mais opções</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {[['data','Data'],['tipo','Tipo'],['desc','Descrição'],['catNome','Categoria'],['status','Status'],['valor','Valor']].map(([key, lbl]) => (
                  <th key={key} onClick={() => toggleSort(key)}
                    style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', cursor: 'pointer', background: 'var(--bg)', whiteSpace: 'nowrap', userSelect: 'none' }}>
                    {lbl}{sortKey === key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </th>
                ))}
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', background: 'var(--bg)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pagedData.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 14 }}>Nenhum lançamento encontrado no período selecionado</td></tr>
              ) : pagedData.map((l, i) => {
                const isRec = l.tipo === 'receita'
                const cats = isRec ? CATS_RECEITA : CATS_DESPESA
                const ci = cats.findIndex(c => c.id === l.cat)
                const catColor = CAT_COLORS[ci >= 0 ? ci % CAT_COLORS.length : 0]
                return (
                  <tr key={l.id || i}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'default' }}>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>{fd(l.data)}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: isRec ? T.greenL : T.redL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: isRec ? T.green : T.red, fontWeight: 700, fontSize: 11 }}>{isRec ? '↑' : '↓'}</span>
                        </div>
                        <span style={{ color: 'var(--text-sub)' }}>{isRec ? 'Receita' : 'Despesa'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 500, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.desc}</td>
                    <td style={{ padding: '11px 16px' }}>{l.catNome ? <Badge label={l.catNome} color={catColor} /> : <span style={{ color: T.muted }}>—</span>}</td>
                    <td style={{ padding: '11px 16px' }}><StatusBadge status={l.status} /></td>
                    <td style={{ padding: '11px 16px', fontWeight: 700, fontSize: 14, color: isRec ? T.green : T.red, whiteSpace: 'nowrap' }}>
                      {isRec ? '' : '-'}{fmt(l.valor)}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setPage(isRec ? 'receitas' : 'despesas')} title="Abrir lançamento"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub)', fontSize: 15, padding: '2px 4px' }}>👁</button>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub)', fontSize: 15, padding: '2px 4px' }}>⋮</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--text-sub)', flexWrap: 'wrap', gap: 8 }}>
          <span>
            Exibindo {tableData.length === 0 ? 0 : (pageNum-1)*perPage+1} a {Math.min(pageNum*perPage, tableData.length)} de {tableData.length} registros
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[['«', () => setPageNum(1)], ['‹', () => setPageNum(p => Math.max(1,p-1))]].map(([lbl, fn]) => (
              <button key={lbl} onClick={fn} disabled={pageNum === 1}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: pageNum===1?'default':'pointer', opacity: pageNum===1?0.4:1, fontFamily: 'inherit' }}>{lbl}</button>
            ))}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, pageNum - 2)) + i
              return p <= totalPages ? (
                <button key={p} onClick={() => setPageNum(p)}
                  style={{ background: pageNum===p ? T.primary : 'var(--bg)', color: pageNum===p ? '#fff' : 'var(--text-sub)', border: pageNum===p ? 'none' : '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: pageNum===p ? 700 : 400, minWidth: 32, fontFamily: 'inherit' }}>{p}</button>
              ) : null
            })}
            {totalPages > 5 && pageNum < totalPages - 2 && <>
              <span style={{ padding: '0 4px' }}>...</span>
              <button onClick={() => setPageNum(totalPages)}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>{totalPages}</button>
            </>}
            {[['›', () => setPageNum(p => Math.min(totalPages,p+1))], ['»', () => setPageNum(totalPages)]].map(([lbl, fn]) => (
              <button key={lbl} onClick={fn} disabled={pageNum === totalPages}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: pageNum===totalPages?'default':'pointer', opacity: pageNum===totalPages?0.4:1, fontFamily: 'inherit' }}>{lbl}</button>
            ))}
            <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPageNum(1) }}
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: 'var(--text-sub)', fontFamily: 'inherit', marginLeft: 8 }}>
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} por página</option>)}
            </select>
          </div>
        </div>
      </Card>
    </div>
  )
}
