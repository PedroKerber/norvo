import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { T, fmtS, fd } from '../theme'
import { Card, Btn, Badge, StatusBadge, Table, Confirm, Toast } from '../components/ui'
import AdvancedFilters, { defaultFilter, filterLancamentos, loadSavedFilter } from '../components/AdvancedFilters'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const TODAY = new Date().toISOString().slice(0, 10)

function buildChart(lancs, inicio, fim, view) {
  const s = new Date(inicio + 'T00:00:00')
  const e = new Date(fim + 'T00:00:00')
  const pts = []
  let acum = 0

  const ds = d => d.toISOString().slice(0, 10)
  const sum = (arr, tipo, status) => arr.filter(l => l.tipo === tipo && (!status || l.status === status)).reduce((a, l) => a + l.valor, 0)

  if (view === 'diario') {
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const day = ds(d)
      const row = lancs.filter(l => l.data === day)
      const ent = sum(row, 'receita', 'Recebida')
      const sai = sum(row, 'despesa', 'Paga')
      const ret = sum(row, 'retirada')
      acum += ent - sai - ret
      pts.push({ dia: day.slice(5).replace('-', '/'), entradas: ent, saidas: sai, retiradas: ret, saldo: acum })
    }
    if (pts.length > 60) {
      const step = Math.ceil(pts.length / 60)
      return pts.filter((_, i) => i % step === 0)
    }
    return pts
  }

  if (view === 'semanal') {
    let d = new Date(s)
    while (d <= e) {
      const we = new Date(d); we.setDate(d.getDate() + 6)
      if (we > e) we.setTime(e.getTime())
      const d0 = ds(d), d1 = ds(we)
      const row = lancs.filter(l => l.data >= d0 && l.data <= d1)
      const ent = sum(row, 'receita', 'Recebida')
      const sai = sum(row, 'despesa', 'Paga')
      const ret = sum(row, 'retirada')
      acum += ent - sai - ret
      pts.push({ dia: d0.slice(5).replace('-', '/'), entradas: ent, saidas: sai, retiradas: ret, saldo: acum })
      d.setDate(d.getDate() + 7)
    }
    return pts
  }

  if (view === 'mensal') {
    let d = new Date(s.getFullYear(), s.getMonth(), 1)
    while (d <= e) {
      const ym = d.toISOString().slice(0, 7)
      const row = lancs.filter(l => l.data?.startsWith(ym))
      const ent = sum(row, 'receita', 'Recebida')
      const sai = sum(row, 'despesa', 'Paga')
      const ret = sum(row, 'retirada')
      acum += ent - sai - ret
      pts.push({ dia: MESES[d.getMonth()] + '/' + String(d.getFullYear()).slice(2), entradas: ent, saidas: sai, retiradas: ret, saldo: acum })
      d.setMonth(d.getMonth() + 1)
    }
    return pts
  }

  if (view === 'trimestral') {
    let d = new Date(s.getFullYear(), Math.floor(s.getMonth() / 3) * 3, 1)
    while (d <= e) {
      const d0 = ds(d)
      const de = new Date(d.getFullYear(), d.getMonth() + 3, 0)
      const d1 = ds(de)
      const row = lancs.filter(l => l.data >= d0 && l.data <= d1)
      const ent = sum(row, 'receita', 'Recebida')
      const sai = sum(row, 'despesa', 'Paga')
      const ret = sum(row, 'retirada')
      acum += ent - sai - ret
      pts.push({ dia: `T${Math.floor(d.getMonth() / 3) + 1}/${String(d.getFullYear()).slice(2)}`, entradas: ent, saidas: sai, retiradas: ret, saldo: acum })
      d.setMonth(d.getMonth() + 3)
    }
    return pts
  }

  // anual
  let d = new Date(s.getFullYear(), 0, 1)
  while (d <= e) {
    const yr = d.getFullYear()
    const d0 = `${yr}-01-01`, d1 = `${yr}-12-31`
    const row = lancs.filter(l => l.data >= d0 && l.data <= d1)
    const ent = sum(row, 'receita', 'Recebida')
    const sai = sum(row, 'despesa', 'Paga')
    const ret = sum(row, 'retirada')
    acum += ent - sai - ret
    pts.push({ dia: String(yr), entradas: ent, saidas: sai, retiradas: ret, saldo: acum })
    d.setFullYear(yr + 1)
  }
  return pts
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const cores = { entradas: '#16a34a', saidas: '#dc2626', retiradas: '#ea580c', saldo: '#7c3aed' }
  const nomes = { entradas: 'Entradas', saidas: 'Saídas Operacionais', retiradas: 'Retiradas Sócios', saldo: 'Saldo Acumulado' }
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12, minWidth: 220, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text)', fontSize: 13 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: cores[p.dataKey] || p.color }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cores[p.dataKey] || p.color }} />
            {nomes[p.dataKey] || p.name}
          </div>
          <span style={{ fontWeight: 700, color: cores[p.dataKey] || p.color }}>{fmtS(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

const VIEWS = [['diario','Diário'],['semanal','Semanal'],['mensal','Mensal'],['trimestral','Trimestral'],['anual','Anual']]

export default function FluxoCaixa({ data, empresa, onDelete, setPage }) {
  const [filter, setFilter] = useState(() => loadSavedFilter('x8_filter_fluxo') || defaultFilter())
  const [view, setView]     = useState('mensal')
  const [confirm, setConfirm] = useState(null)
  const [toast, setToast]     = useState(null)
  const [search, setSearch]   = useState('')

  const allLancs = useMemo(() => data.lancamentos || [], [data.lancamentos])
  const lancs    = useMemo(() => filterLancamentos(allLancs, filter), [allLancs, filter])

  // KPIs do período filtrado
  const totalEnt  = useMemo(() => lancs.filter(l => l.tipo === 'receita' && l.status === 'Recebida').reduce((s, l) => s + l.valor, 0), [lancs])
  const totalSaid = useMemo(() => lancs.filter(l => l.tipo === 'despesa' && l.status === 'Paga').reduce((s, l) => s + l.valor, 0), [lancs])
  const totalRet  = useMemo(() => lancs.filter(l => l.tipo === 'retirada').reduce((s, l) => s + l.valor, 0), [lancs])
  const saldoPer  = totalEnt - totalSaid - totalRet

  // Saldo Inicial = tudo realizado antes do início do período
  const saldoInicial = useMemo(() => allLancs
    .filter(l => l.data && l.data < filter.inicio)
    .reduce((s, l) => {
      if (l.tipo === 'receita'  && l.status === 'Recebida') return s + l.valor
      if (l.tipo === 'despesa'  && l.status === 'Paga')     return s - l.valor
      if (l.tipo === 'retirada')                             return s - l.valor
      return s
    }, 0), [allLancs, filter.inicio])

  // Saldo Acumulado = saldo inicial + saldo do período
  const saldoAcum = saldoInicial + saldoPer

  const chartData = useMemo(() => buildChart(lancs, filter.inicio, filter.fim, view), [lancs, filter, view])

  // Tabela de movimentações
  const movimentos = useMemo(() => {
    let l = [...lancs].sort((a, b) => (b.data || '').localeCompare(a.data || ''))
    if (search) l = l.filter(x => [x.desc, x.catNome, x.fornecedor, x.cliente].filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase())))
    return l
  }, [lancs, search])

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()
    const wsChart = XLSX.utils.json_to_sheet(chartData.map(r => ({
      'Período': r.dia,
      'Entradas (R$)': r.entradas,
      'Saídas Operacionais (R$)': r.saidas,
      'Retirada dos Sócios (R$)': r.retiradas,
      'Saldo Acumulado (R$)': r.saldo,
    })))
    const wsResumo = XLSX.utils.aoa_to_sheet([
      ['Resumo do Período'],
      ['Saldo Inicial', saldoInicial],
      ['Entradas realizadas', totalEnt],
      ['Saídas Operacionais', totalSaid],
      ['Retirada dos Sócios', totalRet],
      ['Saldo do Período', saldoPer],
      ['Saldo Acumulado', saldoAcum],
    ])
    const wsMov = XLSX.utils.json_to_sheet(movimentos.map(l => ({
      'Data': l.data || '',
      'Tipo': l.tipo === 'receita' ? 'Receita' : l.tipo === 'retirada' ? 'Retirada de Sócio' : 'Despesa',
      'Descrição': l.desc || '',
      'Categoria': l.catNome || '',
      'Valor (R$)': l.tipo === 'receita' ? l.valor : -l.valor,
      'Status': l.status || '',
    })))
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')
    XLSX.utils.book_append_sheet(wb, wsChart, 'Fluxo por período')
    XLSX.utils.book_append_sheet(wb, wsMov, 'Movimentações')
    XLSX.writeFile(wb, `fluxo_caixa_${empresa?.nome || 'empresa'}_${filter.inicio}_${filter.fim}.xlsx`)
  }

  const exportPDF = () => {
    const formatPDF = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const html = `<html><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;font-size:11px;margin:28px;color:#111}
      h1{font-size:18px;margin:0 0 2px}h2{font-size:13px;margin:18px 0 8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
      .kpis{display:flex;gap:20px;padding:14px 0;border-top:2px solid #16a34a;border-bottom:1px solid #e5e7eb;margin-bottom:16px;flex-wrap:wrap}
      .kpi .kl{font-size:9px;color:#888;margin-bottom:3px;text-transform:uppercase;letter-spacing:.3px}
      .kpi .kv{font-size:14px;font-weight:700}
      .resumo{border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:16px;max-width:320px}
      .r-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:12px}
      .r-row:last-child{border-bottom:none;font-weight:700;font-size:13px;padding-top:10px}
      table{width:100%;border-collapse:collapse}
      th{background:#f3f4f6;text-align:left;padding:7px 10px;font-size:10px;border-bottom:2px solid #e5e7eb;font-weight:700;text-transform:uppercase}
      td{padding:7px 10px;border-bottom:1px solid #f3f4f6;font-size:11px}
      .pos{color:#16a34a;font-weight:700}.neg{color:#dc2626;font-weight:700}.ret{color:#ea580c;font-weight:700}
      tr:nth-child(even) td{background:#fafafa}
    </style></head><body>
      <h1>Fluxo de Caixa — ${empresa?.nome || ''}</h1>
      <div style="color:#666;font-size:12px;margin-bottom:14px">Período: ${filter.inicio} a ${filter.fim} · Gerado em ${TODAY}</div>
      <div class="kpis">
        <div class="kpi"><div class="kl">Entradas Realizadas</div><div class="kv pos">${formatPDF(totalEnt)}</div></div>
        <div class="kpi"><div class="kl">Saídas Operacionais</div><div class="kv neg">${formatPDF(totalSaid)}</div></div>
        <div class="kpi"><div class="kl">Retirada dos Sócios</div><div class="kv ret">${formatPDF(totalRet)}</div></div>
        <div class="kpi"><div class="kl">Saldo do Período</div><div class="kv ${saldoPer >= 0 ? 'pos' : 'neg'}">${formatPDF(saldoPer)}</div></div>
        <div class="kpi"><div class="kl">Saldo Acumulado</div><div class="kv ${saldoAcum >= 0 ? 'pos' : 'neg'}">${formatPDF(saldoAcum)}</div></div>
      </div>
      <div class="resumo">
        <div style="font-weight:700;font-size:12px;margin-bottom:8px">Resumo Financeiro</div>
        <div class="r-row"><span>Saldo Inicial</span><span>${formatPDF(saldoInicial)}</span></div>
        <div class="r-row"><span class="pos">(+) Entradas</span><span class="pos">${formatPDF(totalEnt)}</span></div>
        <div class="r-row"><span class="neg">(-) Saídas Operacionais</span><span class="neg">${formatPDF(totalSaid)}</span></div>
        <div class="r-row"><span class="ret">(-) Retirada dos Sócios</span><span class="ret">${formatPDF(totalRet)}</span></div>
        <div class="r-row"><span>= Saldo Acumulado</span><span class="${saldoAcum >= 0 ? 'pos' : 'neg'}">${formatPDF(saldoAcum)}</span></div>
      </div>
      <h2>Movimentações</h2>
      <table>
        <tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th style="text-align:right">Valor</th><th>Status</th></tr>
        ${movimentos.map(l => {
          const cls = l.tipo === 'receita' ? 'pos' : l.tipo === 'retirada' ? 'ret' : 'neg'
          const sinal = l.tipo === 'receita' ? '+' : '-'
          return `<tr><td>${l.data||''}</td><td>${l.tipo==='receita'?'Receita':l.tipo==='retirada'?'Retirada':'Despesa'}</td><td>${l.desc||''}</td><td>${l.catNome||''}</td><td class="${cls}" style="text-align:right">${sinal} ${formatPDF(l.valor)}</td><td>${l.status||''}</td></tr>`
        }).join('')}
      </table>
    </body></html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); win.print() }
  }

  const tipoColor = tipo => tipo === 'receita' ? T.green : tipo === 'retirada' ? '#ea580c' : T.red
  const tipoBg    = tipo => tipo === 'receita' ? T.greenL : tipo === 'retirada' ? '#fff7ed' : T.redL

  const columns = [
    {
      key: 'data', label: 'Data',
      render: v => <span style={{ fontSize: 13, color: T.sub }}>{fd(v)}</span>
    },
    {
      key: 'tipo', label: 'Tipo',
      render: v => (
        <div style={{ width: 28, height: 28, borderRadius: 6, background: tipoBg(v), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: tipoColor(v), fontWeight: 700, fontSize: 13 }}>{v === 'receita' ? '↑' : v === 'retirada' ? '←' : '↓'}</span>
        </div>
      )
    },
    { key: 'desc', label: 'Descrição', render: v => <span style={{ fontWeight: 500, fontSize: 13 }}>{v}</span> },
    {
      key: 'catNome', label: 'Categoria',
      render: (v, row) => <Badge label={v || '—'} color={tipoColor(row.tipo)} />
    },
    {
      key: 'valor', label: 'Valor',
      render: (v, row) => (
        <span style={{ fontWeight: 700, fontSize: 14, color: tipoColor(row.tipo) }}>
          {row.tipo === 'receita' ? '+' : '-'}{fmtS(v)}
        </span>
      )
    },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    {
      key: 'id', label: 'Ações',
      render: (_, row) => (
        <button onClick={e => { e.stopPropagation(); setConfirm(row) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.red, fontSize: 14 }}>🗑</button>
      )
    },
  ]

  const yFmt = v => {
    if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`
    return v
  }

  const KPI = ({ label, value, color, bg, sub, onClick }) => (
    <div onClick={onClick} style={{
      background: 'var(--card)', borderRadius: 14, padding: '16px 18px',
      border: '1px solid var(--border)', borderLeft: `4px solid ${color}`,
      cursor: onClick ? 'pointer' : 'default', transition: 'transform .15s',
    }}
    onMouseEnter={e => { if (onClick) e.currentTarget.style.transform = 'translateY(-2px)' }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ background: bg, borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
          {onClick ? '←' : label[0]}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '.04em', textTransform: 'uppercase', lineHeight: 1.3 }}>{label}</div>
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{fmtS(value)}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{sub}{onClick ? ' ↗' : ''}</div>}
    </div>
  )

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: 'var(--text)' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {confirm && <Confirm msg={`Excluir "${confirm.desc}"?`}
        onYes={() => { onDelete && onDelete(confirm.id); setConfirm(null); setToast({ msg: 'Lançamento excluído!', type: 'success' }) }}
        onNo={() => setConfirm(null)} />}

      {/* ── HEADER ── */}
      <div className="page-hd">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Fluxo de Caixa</h1>
          <div style={{ color: 'var(--text-sub)', fontSize: 14 }}>{empresa?.nome} · {filter.inicio} a {filter.fim}</div>
        </div>
        <div className="page-actions">
          <Btn variant="ghost" icon="📊" onClick={exportExcel}>Excel</Btn>
          <Btn variant="ghost" icon="📄" onClick={exportPDF}>PDF</Btn>
        </div>
      </div>

      <AdvancedFilters tipo="all" filter={filter} onApply={setFilter} storageKey="x8_filter_fluxo" />

      {/* ── 5 KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 22 }}>
        <KPI label="Entradas Realizadas"   value={totalEnt}   color="#16a34a" bg="#f0fdf4" sub="Receitas recebidas" />
        <KPI label="Saídas Operacionais"   value={totalSaid}  color="#dc2626" bg="#fef2f2" sub="Despesas pagas" />
        <KPI label="Retirada dos Sócios"   value={totalRet}   color="#ea580c" bg="#fff7ed" sub="Pró-labore e lucros"
          onClick={() => setPage && setPage('retirada_socios')} />
        <KPI label="Saldo do Período"      value={saldoPer}   color={saldoPer >= 0 ? '#2563eb' : '#dc2626'} bg={saldoPer >= 0 ? '#eff6ff' : '#fef2f2'} sub="Entradas − Saídas − Retiradas" />
        <KPI label="Saldo Acumulado"       value={saldoAcum}  color={saldoAcum >= 0 ? '#7c3aed' : '#dc2626'} bg={saldoAcum >= 0 ? '#ede9fe' : '#fef2f2'} sub="Total disponível em caixa" />
      </div>

      {/* ── GRÁFICO + RESUMO ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, marginBottom: 22 }}>

        {/* Gráfico */}
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Movimentação Financeira</div>
              <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                {[['Entradas','#16a34a'],['Saídas','#dc2626'],['Retiradas','#ea580c'],['Saldo Acum.','#7c3aed']].map(([l, c]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-sub)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {VIEWS.map(([v, l]) => (
                <button key={v} onClick={() => setView(v)} style={{
                  background: view === v ? T.primary : 'var(--bg)',
                  color: view === v ? '#fff' : 'var(--text-sub)',
                  border: `1px solid ${view === v ? T.primary : 'var(--border)'}`,
                  borderRadius: 6, padding: '5px 10px', fontSize: 11,
                  fontWeight: view === v ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit',
                }}>{l}</button>
              ))}
            </div>
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="dia" tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={yFmt} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="entradas"  stroke="#16a34a" strokeWidth={2} dot={false} name="Entradas" />
                <Line type="monotone" dataKey="saidas"    stroke="#dc2626" strokeWidth={2} dot={false} name="Saídas" />
                <Line type="monotone" dataKey="retiradas" stroke="#ea580c" strokeWidth={2} dot={false} strokeDasharray="4 3" name="Retiradas" />
                <Line type="monotone" dataKey="saldo"     stroke="#7c3aed" strokeWidth={2.5} dot={false} name="Saldo Acumulado" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 14 }}>
              Nenhuma movimentação no período selecionado
            </div>
          )}
        </Card>

        {/* Resumo Financeiro */}
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 18 }}>Resumo Financeiro</div>
          {[
            { label: 'Saldo Inicial', value: saldoInicial, color: saldoInicial >= 0 ? T.text : T.red, prefix: '' },
            { label: '(+) Entradas', value: totalEnt, color: '#16a34a', prefix: '+' },
            { label: '(-) Saídas Operac.', value: totalSaid, color: '#dc2626', prefix: '-' },
            { label: '(-) Retirada Sócios', value: totalRet, color: '#ea580c', prefix: '-' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.3 }}>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: r.color, textAlign: 'right' }}>{r.prefix} {fmtS(r.value)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>= Saldo Acumulado</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: saldoAcum >= 0 ? '#7c3aed' : '#dc2626', textAlign: 'right' }}>{fmtS(saldoAcum)}</span>
          </div>

          {/* Projeções rápidas */}
          <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 12, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '.04em' }}>A Receber / A Pagar</div>
            {[
              { label: 'Receitas pendentes', value: lancs.filter(l => l.tipo === 'receita' && l.status !== 'Recebida').reduce((s, l) => s + l.valor, 0), color: '#16a34a' },
              { label: 'Despesas pendentes', value: lancs.filter(l => l.tipo === 'despesa' && l.status !== 'Paga').reduce((s, l) => s + l.valor, 0), color: '#dc2626' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: 'var(--text-sub)' }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: r.color }}>{fmtS(r.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── TABELA DE MOVIMENTAÇÕES ── */}
      <Card>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Movimentações — {movimentos.length} lançamentos</div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', width: 200 }}
          />
        </div>
        <Table columns={columns} data={movimentos}
          emptyState={<div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 14 }}>Nenhuma movimentação no período</div>} />
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.sub }}>
          <span>{movimentos.length} lançamentos</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <span style={{ color: '#16a34a', fontWeight: 700 }}>Entradas: {fmtS(totalEnt)}</span>
            <span style={{ color: '#dc2626', fontWeight: 700 }}>Saídas: {fmtS(totalSaid)}</span>
            <span style={{ color: '#ea580c', fontWeight: 700 }}>Retiradas: {fmtS(totalRet)}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
