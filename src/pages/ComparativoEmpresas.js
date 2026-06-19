import { useState, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import {
  BarChart, Bar, LineChart, Line, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import { T, fmt, fmtPct } from '../theme'
import { CATS_DESPESA, CATS_RECEITA } from '../data'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const CENTROS = ['Administrativo','Comercial','Marketing','Financeiro','TI','RH','Operacional']
const CHART_COLORS = ['#F47B20','#2563eb','#16a34a','#7c3aed','#ea580c','#0891b2','#dc2626']
const SORT_OPTIONS = [
  { id: 'receita', label: 'Maior Receita' },
  { id: 'lucro', label: 'Maior Lucro' },
  { id: 'margem', label: 'Melhor Margem' },
  { id: 'despesa', label: 'Menor Despesa' },
  { id: 'caixa', label: 'Maior Caixa' },
]
const CHART_TIPO_OPTS = [
  { id: 'receita', label: 'Receita' },
  { id: 'despesa', label: 'Despesas' },
  { id: 'lucro', label: 'Lucro' },
]

function thisMonthRange() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth()
  const last = new Date(y, m + 1, 0).getDate()
  return {
    inicio: `${y}-${String(m + 1).padStart(2,'0')}-01`,
    fim: `${y}-${String(m + 1).padStart(2,'0')}-${String(last).padStart(2,'0')}`,
  }
}

function prevPeriod(inicio, fim) {
  const s = new Date(inicio), e = new Date(fim)
  const dur = e.getTime() - s.getTime() + 86400000
  const pe = new Date(s.getTime() - 86400000)
  const ps = new Date(pe.getTime() - dur + 86400000)
  return { inicio: ps.toISOString().slice(0,10), fim: pe.toISOString().slice(0,10) }
}

function calcMetrics(lancamentos, inicio, fim, cat, centro) {
  let ls = lancamentos.filter(l => l.data >= inicio && l.data <= fim)
  if (cat) ls = ls.filter(l => l.cat === cat)
  if (centro) ls = ls.filter(l => l.centro === centro)
  const receita = ls.filter(l => l.tipo === 'receita' && l.status === 'Recebida').reduce((s,l) => s + (l.valor||0), 0)
  const despesa = ls.filter(l => l.tipo === 'despesa' && (l.status === 'Pago' || l.status === 'Paga')).reduce((s,l) => s + (l.valor||0), 0)
  const retirada = ls.filter(l => l.tipo === 'retirada').reduce((s,l) => s + (l.valor||0), 0)
  const lucro = receita - despesa - retirada
  const margem = receita > 0 ? (lucro / receita) * 100 : 0
  return { receita, despesa, retirada, lucro, margem, caixa: lucro }
}

const iSty = {
  width: '100%', background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

function Pill({ label, active, onClick, cor }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 400,
      cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
      border: active ? 'none' : '1.5px solid var(--border)',
      background: active ? (cor || T.primary) : 'var(--card)',
      color: active ? '#fff' : 'var(--text-sub)', transition: 'all .15s',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {cor && active && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', opacity: .7, flexShrink: 0 }} />}
      {label}
    </button>
  )
}

function MetricCard({ title, empresa, display, sub, cor, empty }) {
  if (!empresa || empty) return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
      padding: '18px 20px', flex: 1, minWidth: 190,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sem dados</div>
    </div>
  )
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
      padding: '18px 20px', flex: 1, minWidth: 190,
      borderLeft: `4px solid ${cor}`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, background: cor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 12, fontWeight: 800, flexShrink: 0,
        }}>{empresa.initials}</div>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', lineHeight: 1.3 }}>{empresa.nome}</div>
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, color: cor }}>{display}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function SortTh({ label, col, sortBy, setSortBy }) {
  const active = sortBy === col
  return (
    <th onClick={() => col && setSortBy(col)} style={{
      padding: '11px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700,
      color: active ? T.primary : 'var(--text-sub)', cursor: col ? 'pointer' : 'default',
      whiteSpace: 'nowrap', borderBottom: '2px solid var(--border)',
      background: 'var(--card)', position: 'sticky', top: 0, userSelect: 'none',
    }}>
      {label}{active ? ' ▲' : ''}
    </th>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-md)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-sub)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 13, color: p.color || T.text, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' && p.dataKey !== 'Margem%' ? fmt(p.value) : `${p.value}%`}
        </div>
      ))}
    </div>
  )
}

export default function ComparativoEmpresas({ appData, empresas }) {
  const mr = thisMonthRange()
  const [inicio, setInicio] = useState(mr.inicio)
  const [fim, setFim] = useState(mr.fim)
  const [empresasSel, setEmpresasSel] = useState([])
  const [filtrocat, setFiltrocat] = useState('')
  const [filtroCentro, setFiltroCentro] = useState('')
  const [sortBy, setSortBy] = useState('receita')
  const [chartTipo, setChartTipo] = useState('receita')

  const prev = useMemo(() => prevPeriod(inicio, fim), [inicio, fim])

  const empList = useMemo(() =>
    empresasSel.length > 0 ? empresas.filter(e => empresasSel.includes(e.id)) : empresas,
    [empresas, empresasSel]
  )

  const metricas = useMemo(() => empList.map(emp => {
    const lancs = appData[emp.id]?.lancamentos || []
    const curr = calcMetrics(lancs, inicio, fim, filtrocat, filtroCentro)
    const previous = calcMetrics(lancs, prev.inicio, prev.fim, filtrocat, filtroCentro)
    const crescimento = previous.receita > 0
      ? ((curr.receita - previous.receita) / previous.receita) * 100
      : null
    return { ...emp, ...curr, crescimento }
  }), [appData, empList, inicio, fim, filtrocat, filtroCentro, prev])

  const ranking = useMemo(() => [...metricas].sort((a, b) => {
    if (sortBy === 'receita') return b.receita - a.receita
    if (sortBy === 'lucro') return b.lucro - a.lucro
    if (sortBy === 'margem') return b.margem - a.margem
    if (sortBy === 'despesa') return a.despesa - b.despesa
    if (sortBy === 'caixa') return b.caixa - a.caixa
    return b.receita - a.receita
  }), [metricas, sortBy])

  const maiorFat = metricas.reduce((b,e) => !b || e.receita > b.receita ? e : b, null)
  const maiorLuc = metricas.reduce((b,e) => !b || e.lucro > b.lucro ? e : b, null)
  const melhorMarg = metricas.filter(e => e.receita > 0).reduce((b,e) => !b || e.margem > b.margem ? e : b, null)
  const maiorDesp = metricas.reduce((b,e) => !b || e.despesa > b.despesa ? e : b, null)
  const maiorCaixa = metricas.reduce((b,e) => !b || e.caixa > b.caixa ? e : b, null)

  const barData = useMemo(() => ranking.map(e => ({
    name: e.nome.split(' ').slice(0,2).join(' '),
    Receita: Math.round(e.receita),
    Despesas: Math.round(e.despesa),
    Lucro: Math.round(e.lucro),
    'Margem%': parseFloat(e.margem.toFixed(1)),
    lucroPos: e.lucro >= 0,
    margemOk: e.margem >= 20,
    margemNeg: e.margem < 0,
    cor: e.cor,
  })), [ranking])

  const evolData = useMemo(() => {
    const sD = new Date(inicio), eD = new Date(fim)
    const months = []
    let d = new Date(sD.getFullYear(), sD.getMonth(), 1)
    while (d <= eD) { months.push(d.toISOString().slice(0,7)); d.setMonth(d.getMonth() + 1) }
    return months.map(ym => {
      const row = { mes: MESES[parseInt(ym.slice(5,7)) - 1] + '/' + ym.slice(2,4) }
      metricas.forEach(emp => {
        const ls = (appData[emp.id]?.lancamentos || []).filter(l => l.data?.startsWith(ym))
        const key = emp.nome.split(' ')[0]
        if (chartTipo === 'receita')
          row[key] = ls.filter(l => l.tipo === 'receita' && l.status === 'Recebida').reduce((s,l) => s + (l.valor||0), 0)
        else if (chartTipo === 'despesa')
          row[key] = ls.filter(l => l.tipo === 'despesa' && (l.status === 'Pago' || l.status === 'Paga')).reduce((s,l) => s + (l.valor||0), 0)
        else {
          const rec = ls.filter(l => l.tipo === 'receita' && l.status === 'Recebida').reduce((s,l) => s + (l.valor||0), 0)
          const dep = ls.filter(l => l.tipo === 'despesa' && (l.status === 'Pago' || l.status === 'Paga')).reduce((s,l) => s + (l.valor||0), 0)
          const ret = ls.filter(l => l.tipo === 'retirada').reduce((s,l) => s + (l.valor||0), 0)
          row[key] = rec - dep - ret
        }
      })
      return row
    })
  }, [metricas, appData, inicio, fim, chartTipo])

  const resumo = useMemo(() => {
    const hasData = metricas.some(e => e.receita > 0 || e.despesa > 0)
    if (!hasData) return [{ cor: T.sub, texto: 'Nenhum lançamento encontrado no período selecionado. Ajuste os filtros ou período.' }]
    const items = []
    if (maiorFat?.receita > 0)
      items.push({ cor: T.primary, texto: `Maior faturamento: ${maiorFat.nome} com ${fmt(maiorFat.receita)} no período.` })
    const negativos = metricas.filter(e => e.lucro < 0)
    if (negativos.length > 0)
      items.push({ cor: T.red, texto: `Resultado negativo em: ${negativos.map(e => e.nome).join(', ')} — revisão de custos recomendada.` })
    const crescendo = [...metricas].filter(e => e.crescimento !== null && e.crescimento > 0).sort((a,b) => b.crescimento - a.crescimento)
    if (crescendo.length > 0)
      items.push({ cor: T.green, texto: `Maior crescimento: ${crescendo[0].nome} com +${fmtPct(crescendo[0].crescimento)} comparado ao período anterior.` })
    if (melhorMarg?.margem > 0)
      items.push({ cor: T.blue, texto: `Melhor margem de lucro: ${melhorMarg.nome} com ${fmtPct(melhorMarg.margem)} — referência de eficiência financeira.` })
    if (maiorDesp?.despesa > 0) {
      const pct = maiorDesp.receita > 0 ? maiorDesp.despesa / maiorDesp.receita * 100 : 0
      items.push({ cor: pct > 80 ? T.red : T.yellow, texto: `Maiores despesas: ${maiorDesp.nome} com ${fmt(maiorDesp.despesa)} (${fmtPct(pct)} da receita).` })
    }
    if (maiorCaixa?.caixa > 0)
      items.push({ cor: T.green, texto: `Maior caixa disponível: ${maiorCaixa.nome} com ${fmt(maiorCaixa.caixa)}.` })
    return items
  }, [metricas, maiorFat, melhorMarg, maiorDesp, maiorCaixa])

  const exportExcel = useCallback(() => {
    const ws = XLSX.utils.json_to_sheet(ranking.map((e, i) => ({
      'Posição': i + 1,
      'Empresa': e.nome,
      'Setor': e.setor,
      'Receita Total (R$)': e.receita,
      'Despesas Totais (R$)': e.despesa,
      'Lucro Líquido (R$)': e.lucro,
      'Margem (%)': parseFloat(e.margem.toFixed(2)),
      'Retirada dos Sócios (R$)': e.retirada,
      'Total em Caixa (R$)': e.caixa,
      'Crescimento (%)': e.crescimento !== null ? parseFloat(e.crescimento.toFixed(2)) : 'N/D',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Comparativo')
    XLSX.writeFile(wb, `comparativo_empresas_${inicio}_${fim}.xlsx`)
  }, [ranking, inicio, fim])

  const toggleEmp = id => setEmpresasSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const sect = (title, children, extra) => (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 24, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{title}</div>
        {extra}
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* ── HEADER ── */}
      <div className="page-hd">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0 }}>Comparativo de Empresas</h1>
          <p style={{ fontSize: 13, color: T.sub, margin: '4px 0 0' }}>
            Análise comparativa do desempenho financeiro · {inicio?.split('-').reverse().join('/')} a {fim?.split('-').reverse().join('/')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportExcel} style={{
            padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer',
          }}>Exportar Excel</button>
          <button onClick={() => window.print()} style={{
            padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            background: T.primary, color: '#fff', border: 'none', cursor: 'pointer',
          }}>Exportar PDF</button>
        </div>
      </div>

      {/* ── FILTROS ── */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 14 }}>Filtros</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.sub, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: .5 }}>Data Início</label>
            <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={iSty} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.sub, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: .5 }}>Data Fim</label>
            <input type="date" value={fim} onChange={e => setFim(e.target.value)} style={iSty} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.sub, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: .5 }}>Categoria</label>
            <select value={filtrocat} onChange={e => setFiltrocat(e.target.value)} style={iSty}>
              <option value="">Todas as categorias</option>
              <optgroup label="Receitas">{CATS_RECEITA.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</optgroup>
              <optgroup label="Despesas">{CATS_DESPESA.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</optgroup>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.sub, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: .5 }}>Centro de Custo</label>
            <select value={filtroCentro} onChange={e => setFiltroCentro(e.target.value)} style={iSty}>
              <option value="">Todos</option>
              {CENTROS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>Empresas</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <Pill label="Todas" active={empresasSel.length === 0} onClick={() => setEmpresasSel([])} />
            {empresas.map(e => (
              <Pill key={e.id} label={e.nome.split(' ').slice(0,2).join(' ')} active={empresasSel.includes(e.id)} onClick={() => toggleEmp(e.id)} cor={empresasSel.includes(e.id) ? e.cor : undefined} />
            ))}
          </div>
        </div>
      </div>

      {/* ── CARDS PRINCIPAIS ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <MetricCard title="Maior Faturamento" empresa={maiorFat} display={fmt(maiorFat?.receita)} sub={maiorFat?.setor} cor={T.green} />
        <MetricCard title="Maior Lucro Líquido" empresa={maiorLuc} display={fmt(maiorLuc?.lucro)} sub={maiorLuc?.setor} cor={T.blue} />
        <MetricCard title="Melhor Margem" empresa={melhorMarg} display={melhorMarg ? fmtPct(melhorMarg.margem) : '—'} sub={melhorMarg ? `Lucro: ${fmt(melhorMarg.lucro)}` : ''} cor={T.primary} />
        <MetricCard title="Maior Despesa" empresa={maiorDesp} display={fmt(maiorDesp?.despesa)} sub={maiorDesp?.setor} cor={T.red} />
        <MetricCard title="Maior Caixa Disponível" empresa={maiorCaixa} display={fmt(maiorCaixa?.caixa)} sub={maiorCaixa?.setor} cor={T.purple} />
      </div>

      {/* ── RANKING ── */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>Ranking de Empresas</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SORT_OPTIONS.map(o => (
              <button key={o.id} onClick={() => setSortBy(o.id)} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: sortBy === o.id ? 700 : 400,
                border: sortBy === o.id ? 'none' : '1.5px solid var(--border)',
                background: sortBy === o.id ? T.primary : 'var(--card)',
                color: sortBy === o.id ? '#fff' : 'var(--text-sub)', cursor: 'pointer', fontFamily: 'inherit',
              }}>{o.label}</button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
            <thead>
              <tr>
                <SortTh label="#" col={null} sortBy={sortBy} setSortBy={setSortBy} />
                <SortTh label="Empresa" col={null} sortBy={sortBy} setSortBy={setSortBy} />
                <SortTh label="Receita Total" col="receita" sortBy={sortBy} setSortBy={setSortBy} />
                <SortTh label="Despesas" col="despesa" sortBy={sortBy} setSortBy={setSortBy} />
                <SortTh label="Lucro Líquido" col="lucro" sortBy={sortBy} setSortBy={setSortBy} />
                <SortTh label="Margem" col="margem" sortBy={sortBy} setSortBy={setSortBy} />
                <SortTh label="Retirada Sócios" col={null} sortBy={sortBy} setSortBy={setSortBy} />
                <SortTh label="Caixa" col="caixa" sortBy={sortBy} setSortBy={setSortBy} />
                <SortTh label="Crescimento" col={null} sortBy={sortBy} setSortBy={setSortBy} />
              </tr>
            </thead>
            <tbody>
              {ranking.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: 48, textAlign: 'center', color: T.sub, fontSize: 14 }}>
                    Nenhuma empresa selecionada
                  </td>
                </tr>
              )}
              {ranking.map((emp, i) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-light)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <td style={{ padding: '13px 14px', fontSize: 14, fontWeight: 800, color: i === 0 ? T.primary : T.sub }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 9, background: emp.cor, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 11, fontWeight: 800,
                      }}>{emp.initials}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{emp.nome}</div>
                        <div style={{ fontSize: 11, color: T.sub }}>{emp.setor}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '13px 14px', fontSize: 13, fontWeight: 700, color: T.green }}>{fmt(emp.receita)}</td>
                  <td style={{ padding: '13px 14px', fontSize: 13, color: T.red }}>{fmt(emp.despesa)}</td>
                  <td style={{ padding: '13px 14px', fontSize: 13, fontWeight: 700, color: emp.lucro >= 0 ? T.blue : T.red }}>{fmt(emp.lucro)}</td>
                  <td style={{ padding: '13px 14px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      background: emp.margem >= 20 ? '#dcfce7' : emp.margem >= 0 ? '#fef3c7' : '#fee2e2',
                      color: emp.margem >= 20 ? T.green : emp.margem >= 0 ? '#d97706' : T.red,
                    }}>{fmtPct(emp.margem)}</span>
                  </td>
                  <td style={{ padding: '13px 14px', fontSize: 13, color: T.sub }}>{fmt(emp.retirada)}</td>
                  <td style={{ padding: '13px 14px', fontSize: 13, fontWeight: 700, color: emp.caixa >= 0 ? T.text : T.red }}>{fmt(emp.caixa)}</td>
                  <td style={{ padding: '13px 14px', fontSize: 13 }}>
                    {emp.crescimento !== null
                      ? <span style={{ fontWeight: 700, color: emp.crescimento >= 0 ? T.green : T.red }}>
                          {emp.crescimento >= 0 ? '+' : ''}{fmtPct(emp.crescimento)}
                        </span>
                      : <span style={{ color: T.sub }}>N/D</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── GRÁFICOS ── */}
      {sect(
        'Comparativo Visual',
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 28, marginBottom: 32 }}>

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.sub, marginBottom: 12 }}>Receita por Empresa</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top:4, right:8, bottom:4, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-sub)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-sub)' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Receita" fill={T.green} radius={[5,5,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.sub, marginBottom: 12 }}>Despesas por Empresa</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top:4, right:8, bottom:4, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-sub)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-sub)' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Despesas" fill={T.red} radius={[5,5,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.sub, marginBottom: 12 }}>Lucro Líquido por Empresa</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top:4, right:8, bottom:4, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-sub)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-sub)' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Lucro" radius={[5,5,0,0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.lucroPos ? T.blue : T.red} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.sub, marginBottom: 12 }}>Margem de Lucro (%)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top:4, right:8, bottom:4, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-sub)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-sub)' }} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Margem%" radius={[5,5,0,0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.margemOk ? T.green : entry.margemNeg ? T.red : '#d97706'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Evolução mensal */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.sub }}>Evolução Mensal Comparativa</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {CHART_TIPO_OPTS.map(o => (
                  <button key={o.id} onClick={() => setChartTipo(o.id)} style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: chartTipo === o.id ? 700 : 400,
                    border: chartTipo === o.id ? 'none' : '1.5px solid var(--border)',
                    background: chartTipo === o.id ? T.primary : 'var(--card)',
                    color: chartTipo === o.id ? '#fff' : 'var(--text-sub)', cursor: 'pointer', fontFamily: 'inherit',
                  }}>{o.label}</button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={evolData} margin={{ top:4, right:16, bottom:4, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--text-sub)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-sub)' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                {metricas.map((emp, i) => (
                  <Line
                    key={emp.id}
                    type="monotone"
                    dataKey={emp.nome.split(' ')[0]}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 3.5, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ── RESUMO INTELIGENTE ── */}
      {sect(
        'Resumo Inteligente',
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {resumo.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: '13px 16px', borderRadius: 10,
              background: 'var(--bg)', border: `1px solid ${item.cor}22`,
            }}>
              <div style={{ width: 4, minHeight: 20, borderRadius: 4, background: item.cor, flexShrink: 0, alignSelf: 'stretch' }} />
              <span style={{ fontSize: 14, color: T.text, lineHeight: 1.55 }}>{item.texto}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
