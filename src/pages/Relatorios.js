import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { LineChart, BarChart, PieChart, Line, Bar, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { T, fmtS, fmtPct, fd } from '../theme'
import { Card, Badge, StatusBadge } from '../components/ui'
import { CATS_DESPESA, CATS_RECEITA, CATS_RETIRADA, CONTAS, getVariavelIds } from '../data'

const TODAY       = new Date().toISOString().slice(0, 10)
const MESES       = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const FORMAS      = ['PIX','Boleto','Cartão de Crédito','Cartão de Débito','TED','DOC','Cheque','Dinheiro']
const STATUS_OPTS = ['Recebida','A receber','Paga','A Pagar','Atrasada','Cancelada']
const CENTROS     = ['Administrativo','Comercial','Marketing','Financeiro','TI','RH','Operacional']
const BASE_CATS   = [...CATS_DESPESA, ...CATS_RECEITA, ...CATS_RETIRADA]
const CAT_COLORS  = ['#16a34a','#2563eb','#7c3aed','#ea580c','#0891b2','#9ca3af','#dc2626','#ca8a04','#059669','#4f46e5']
const QUICK_PRESETS = ['Hoje','Esta Semana','Este Mês','Mês Passado','Últimos 30 Dias','Este Ano','Personalizado']
const TABS = [
  ['visao','Visão Geral'],['rankings','Rankings'],
  ['categorias','Por Categoria'],['retiradas','Retirada Sócios'],['lancamentos','Lançamentos'],
]

function isoLastDay(y, m) { return new Date(y, m + 1, 0).toISOString().slice(0, 10) }
function addDays(ds, n) { const d = new Date(ds); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
function thisMonthRange() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth()
  return { inicio: `${y}-${String(m+1).padStart(2,'0')}-01`, fim: isoLastDay(y, m) }
}
function presetRange(label) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth()
  if (label === 'Hoje')             return { inicio: TODAY, fim: TODAY }
  if (label === 'Esta Semana') {
    const dow = now.getDay() || 7
    const mon = new Date(now); mon.setDate(now.getDate() - dow + 1)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return { inicio: mon.toISOString().slice(0,10), fim: sun.toISOString().slice(0,10) }
  }
  if (label === 'Este Mês')         return thisMonthRange()
  if (label === 'Mês Passado') {
    const pm = m === 0 ? 11 : m - 1, py = m === 0 ? y - 1 : y
    return { inicio: `${py}-${String(pm+1).padStart(2,'0')}-01`, fim: isoLastDay(py, pm) }
  }
  if (label === 'Últimos 30 Dias')  return { inicio: addDays(TODAY, -29), fim: TODAY }
  if (label === 'Este Ano')         return { inicio: `${y}-01-01`, fim: `${y}-12-31` }
  return null
}
function calcDelta(cur, prev) {
  if (!prev || prev === 0) return null
  return ((cur - prev) / Math.abs(prev)) * 100
}
function buildEvolutionChart(lancs, inicio, fim) {
  const s = new Date(inicio), e = new Date(fim)
  const days = Math.round((e - s) / 86400000) + 1
  const pts = []
  const sum = (arr, tipo, status) => arr.filter(l => l.tipo === tipo && (!status || l.status === status)).reduce((a,l) => a+l.valor, 0)
  if (days <= 31) {
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10)
      const row = lancs.filter(l => l.data === ds)
      const rec = sum(row,'receita'), dep = sum(row,'despesa'), ret = sum(row,'retirada')
      if (d.getDate() === 1 || d.getDate() % 5 === 0 || +d === +e)
        pts.push({ label: ds.slice(5).replace('-','/'), Receitas: rec, Despesas: dep, Retiradas: ret, Resultado: rec - dep - ret })
    }
  } else if (days <= 90) {
    let d = new Date(s)
    while (d <= e) {
      const we = new Date(d); we.setDate(d.getDate() + 6); if (we > e) we.setTime(e.getTime())
      const d0 = d.toISOString().slice(0,10), d1 = we.toISOString().slice(0,10)
      const row = lancs.filter(l => l.data >= d0 && l.data <= d1)
      const rec = sum(row,'receita'), dep = sum(row,'despesa'), ret = sum(row,'retirada')
      pts.push({ label: d0.slice(5).replace('-','/'), Receitas: rec, Despesas: dep, Retiradas: ret, Resultado: rec - dep - ret })
      d.setDate(d.getDate() + 7)
    }
  } else {
    let d = new Date(s.getFullYear(), s.getMonth(), 1)
    while (d <= e) {
      const ym = d.toISOString().slice(0,7)
      const row = lancs.filter(l => l.data?.startsWith(ym))
      const rec = sum(row,'receita'), dep = sum(row,'despesa'), ret = sum(row,'retirada')
      pts.push({ label: MESES[d.getMonth()] + '/' + String(d.getFullYear()).slice(2), Receitas: rec, Despesas: dep, Retiradas: ret, Resultado: rec - dep - ret })
      d.setMonth(d.getMonth() + 1)
    }
  }
  return pts
}
function getSocioRet(l) {
  const cat = CATS_RETIRADA.find(c => c.id === l.cat)
  if (cat?.socio) return cat.socio
  const forn = (l.fornecedor || '').toLowerCase()
  if (forn.includes('pedro')) return 'pedro'
  if (forn.includes('leo') || forn.includes('léo')) return 'leo'
  return null
}
function getTipoRet(l) { return CATS_RETIRADA.find(c => c.id === l.cat)?.tipoRet || null }
const TIPO_LABELS = { prolabore: 'Pró-labore', distribuicao: 'Distribuição', adiantamento: 'Adiantamento', extraordinaria: 'Extraordinária' }
const SOCIO_COLOR = { pedro: '#7c3aed', leo: '#2563eb' }

const DEFAULT_FILTER = { ...thisMonthRange(), cat: '', tipo: '', status: '', cliente: '', fornecedor: '', conta: '', forma: '', centro: '', socio: '', tipoRet: '' }
const iSty = { display: 'block', width: '100%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
const sSty = { ...iSty, cursor: 'pointer' }
function chip(active) {
  return { padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', border: active ? 'none' : '1.5px solid var(--border)', background: active ? T.primary : 'var(--card)', color: active ? '#fff' : 'var(--text-sub)' }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Relatorios({ empresa, data, setPage, extraCats = [] }) {
  const allLancs = useMemo(() => data.lancamentos || [], [data.lancamentos])

  // Filter edit state
  const [editInicio, setEditInicio] = useState(DEFAULT_FILTER.inicio)
  const [editFim, setEditFim]       = useState(DEFAULT_FILTER.fim)
  const [editCat, setEditCat]       = useState('')
  const [editTipo, setEditTipo]     = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editCliente, setEditCliente] = useState('')
  const [editForn, setEditForn]     = useState('')
  const [editConta, setEditConta]   = useState('')
  const [editForma, setEditForma]   = useState('')
  const [editCentro, setEditCentro] = useState('')
  const [editSocio, setEditSocio]   = useState('')
  const [editTipoRet, setEditTipoRet] = useState('')
  const [preset, setPreset]         = useState('Este Mês')
  const [showAvancado, setShowAvancado] = useState(false)
  const [applied, setApplied]       = useState(DEFAULT_FILTER)

  // UI state
  const [tab, setTab]       = useState('visao')
  const [search, setSearch] = useState('')
  const [pageNum, setPageNum] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [sortKey, setSortKey] = useState('data')
  const [sortDir, setSortDir] = useState('desc')

  const applyPreset = (label) => {
    setPreset(label)
    if (label === 'Personalizado') return
    const range = presetRange(label)
    if (!range) return
    setEditInicio(range.inicio); setEditFim(range.fim)
    setApplied(prev => ({ ...prev, inicio: range.inicio, fim: range.fim }))
    setPageNum(1)
  }
  const applyFilters = () => {
    setApplied({ inicio: editInicio, fim: editFim, cat: editCat, tipo: editTipo, status: editStatus, cliente: editCliente, fornecedor: editForn, conta: editConta, forma: editForma, centro: editCentro, socio: editSocio, tipoRet: editTipoRet })
    setPageNum(1)
  }
  const clearFilters = () => {
    const r = thisMonthRange()
    setEditInicio(r.inicio); setEditFim(r.fim); setEditCat(''); setEditTipo(''); setPreset('Este Mês')
    setEditStatus(''); setEditCliente(''); setEditForn(''); setEditConta(''); setEditForma(''); setEditCentro(''); setEditSocio(''); setEditTipoRet('')
    setApplied(DEFAULT_FILTER); setPageNum(1)
  }

  // Filtered lancamentos
  const filteredLancs = useMemo(() => allLancs.filter(l => {
    const d = l.data || ''
    if (d < applied.inicio || d > applied.fim) return false
    if (applied.cat    && l.cat !== applied.cat)             return false
    if (applied.tipo   && l.tipo !== applied.tipo)           return false
    if (applied.status && l.status !== applied.status)       return false
    if (applied.cliente    && !(l.cliente    || '').toLowerCase().includes(applied.cliente.toLowerCase()))    return false
    if (applied.fornecedor && !(l.fornecedor || '').toLowerCase().includes(applied.fornecedor.toLowerCase())) return false
    if (applied.conta  && l.contaBancaria   !== applied.conta)  return false
    if (applied.forma  && l.formaPagamento  !== applied.forma)  return false
    if (applied.centro && l.centroCusto     !== applied.centro) return false
    if (applied.socio  && getSocioRet(l) !== applied.socio)     return false
    if (applied.tipoRet && getTipoRet(l) !== applied.tipoRet)   return false
    return true
  }), [allLancs, applied])

  // Previous period
  const { prevInicio, prevFim } = useMemo(() => {
    const s = new Date(applied.inicio), e = new Date(applied.fim)
    const days = Math.round((e - s) / 86400000) + 1
    const pf = new Date(s); pf.setDate(pf.getDate() - 1)
    const pi = new Date(pf); pi.setDate(pi.getDate() - (days - 1))
    return { prevInicio: pi.toISOString().slice(0, 10), prevFim: pf.toISOString().slice(0, 10) }
  }, [applied.inicio, applied.fim])
  const prevLancs = useMemo(() => allLancs.filter(l => { const d = l.data||''; return d >= prevInicio && d <= prevFim }), [allLancs, prevInicio, prevFim])

  // DRE — current period
  const tRec      = useMemo(() => filteredLancs.filter(l => l.tipo === 'receita').reduce((s,l) => s+l.valor, 0), [filteredLancs])
  const tDesp     = useMemo(() => filteredLancs.filter(l => l.tipo === 'despesa').reduce((s,l) => s+l.valor, 0), [filteredLancs])
  const variavelIds = useMemo(() => getVariavelIds(extraCats), [extraCats])
  const tDespVar  = useMemo(() => filteredLancs.filter(l => l.tipo === 'despesa' && variavelIds.has(l.cat)).reduce((s,l) => s+l.valor, 0), [filteredLancs, variavelIds])
  const tDespFixed = useMemo(() => filteredLancs.filter(l => l.tipo === 'despesa' && !variavelIds.has(l.cat)).reduce((s,l) => s+l.valor, 0), [filteredLancs, variavelIds])
  const tRetirada = useMemo(() => filteredLancs.filter(l => l.tipo === 'retirada').reduce((s,l) => s+l.valor, 0), [filteredLancs])
  const lucroBruto  = tRec - tDespVar
  const resultOper  = tRec - tDesp
  const saldoFinal  = resultOper - tRetirada
  const margem      = tRec > 0 ? (resultOper / tRec * 100) : 0

  // DRE — previous period
  const pRec      = useMemo(() => prevLancs.filter(l => l.tipo === 'receita').reduce((s,l) => s+l.valor, 0), [prevLancs])
  const pDesp     = useMemo(() => prevLancs.filter(l => l.tipo === 'despesa').reduce((s,l) => s+l.valor, 0), [prevLancs])
  const pRetirada = useMemo(() => prevLancs.filter(l => l.tipo === 'retirada').reduce((s,l) => s+l.valor, 0), [prevLancs])
  const pResultOper = pRec - pDesp
  const pSaldoFinal = pResultOper - pRetirada

  // Charts
  const evolutionData = useMemo(() => buildEvolutionChart(filteredLancs, applied.inicio, applied.fim), [filteredLancs, applied])
  const comparData = [
    { label: 'Receitas',    atual: tRec,       anterior: pRec },
    { label: 'Despesas',    atual: tDesp,      anterior: pDesp },
    { label: 'Resultado',   atual: resultOper, anterior: pResultOper },
    { label: 'Retiradas',   atual: tRetirada,  anterior: pRetirada },
    { label: 'Saldo Final', atual: saldoFinal, anterior: pSaldoFinal },
  ]

  // Top 10
  const top10Rec  = useMemo(() => filteredLancs.filter(l => l.tipo === 'receita').sort((a,b) => b.valor-a.valor).slice(0,10).map(l => ({ ...l, pct: tRec>0 ? l.valor/tRec*100 : 0 })), [filteredLancs, tRec])
  const top10Desp = useMemo(() => filteredLancs.filter(l => l.tipo === 'despesa').sort((a,b) => b.valor-a.valor).slice(0,10).map(l => ({ ...l, pct: tDesp>0 ? l.valor/tDesp*100 : 0 })), [filteredLancs, tDesp])

  // By category
  const recByCat = useMemo(() => {
    const map = {}
    filteredLancs.filter(l => l.tipo === 'receita').forEach(l => { const k = l.catNome||'Sem categoria'; if (!map[k]) map[k] = { nome: k, valor: 0, count: 0 }; map[k].valor += l.valor; map[k].count++ })
    return Object.values(map).sort((a,b) => b.valor-a.valor)
  }, [filteredLancs])
  const despByCat = useMemo(() => {
    const map = {}
    filteredLancs.filter(l => l.tipo === 'despesa').forEach(l => { const k = l.catNome||'Sem categoria'; if (!map[k]) map[k] = { nome: k, valor: 0, count: 0 }; map[k].valor += l.valor; map[k].count++ })
    return Object.values(map).sort((a,b) => b.valor-a.valor)
  }, [filteredLancs])

  // Retiradas breakdown
  const lancsRet    = useMemo(() => [...filteredLancs.filter(l => l.tipo === 'retirada')].sort((a,b) => (b.data||'').localeCompare(a.data||'')), [filteredLancs])
  const retPedro    = useMemo(() => lancsRet.filter(l => getSocioRet(l) === 'pedro').reduce((s,l) => s+l.valor, 0), [lancsRet])
  const retLeo      = useMemo(() => lancsRet.filter(l => getSocioRet(l) === 'leo').reduce((s,l) => s+l.valor, 0), [lancsRet])
  const retProlab   = useMemo(() => lancsRet.filter(l => getTipoRet(l) === 'prolabore').reduce((s,l) => s+l.valor, 0), [lancsRet])
  const retDistrib  = useMemo(() => lancsRet.filter(l => getTipoRet(l) === 'distribuicao').reduce((s,l) => s+l.valor, 0), [lancsRet])
  const retAdiant   = useMemo(() => lancsRet.filter(l => getTipoRet(l) === 'adiantamento').reduce((s,l) => s+l.valor, 0), [lancsRet])
  const retExtraord = useMemo(() => lancsRet.filter(l => getTipoRet(l) === 'extraordinaria').reduce((s,l) => s+l.valor, 0), [lancsRet])

  // Table
  const tableData = useMemo(() => {
    let arr = [...filteredLancs]
    if (search) { const q = search.toLowerCase(); arr = arr.filter(l => [l.desc,l.catNome,l.cliente,l.fornecedor,l.status].filter(Boolean).some(v => v.toLowerCase().includes(q))) }
    arr.sort((a,b) => {
      if (sortKey === 'valor') return sortDir === 'desc' ? (b.valor||0)-(a.valor||0) : (a.valor||0)-(b.valor||0)
      const av = String(a[sortKey]||''), bv = String(b[sortKey]||'')
      return sortDir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv)
    })
    return arr
  }, [filteredLancs, search, sortKey, sortDir])
  const totalPages = Math.max(1, Math.ceil(tableData.length / perPage))
  const pagedData  = tableData.slice((pageNum-1)*perPage, pageNum*perPage)
  const toggleSort = (key) => { if (sortKey === key) setSortDir(d => d==='desc'?'asc':'desc'); else { setSortKey(key); setSortDir('desc') }; setPageNum(1) }

  const yFmt  = v => Math.abs(v) >= 1000000 ? `${(v/1000000).toFixed(1)}M` : Math.abs(v) >= 1000 ? `${(v/1000).toFixed(0)}k` : v
  const dStr  = (cur, prev) => { const d = calcDelta(cur, prev); return d == null || !isFinite(d) ? '—' : `${d>=0?'↑':'↓'} ${fmtPct(Math.abs(d))}` }
  const tipSty = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }

  // Exports
  const exportExcel = () => {
    const wb = XLSX.utils.book_new()
    const fmt2 = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Relatório Financeiro', empresa?.nome||''],
      ['Período', `${applied.inicio} a ${applied.fim}`], [''],
      ['Indicador','Atual','Anterior'],
      ['Total em Receitas', fmt2(tRec), fmt2(pRec)],
      ['Total em Despesas', fmt2(tDesp), fmt2(pDesp)],
      ['Lucro Líquido', fmt2(resultOper), fmt2(pResultOper)],
      ['Retirada dos Sócios', fmt2(tRetirada), fmt2(pRetirada)],
      ['Total em Caixa', fmt2(saldoFinal), fmt2(pSaldoFinal)], [''],
      ['DRE'], ['Receitas Totais', fmt2(tRec)],
      ['(-) Despesas Variáveis', fmt2(tDespVar)], ['= Lucro Bruto', fmt2(lucroBruto)],
      ['(-) Despesas Fixas', fmt2(tDespFixed)], ['= Resultado Operacional', fmt2(resultOper)],
      ['(-) Retirada dos Sócios', fmt2(tRetirada)], ['= Saldo Final em Caixa', fmt2(saldoFinal)],
    ]), 'Resumo')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tableData.map(l => ({ Data: l.data, Tipo: l.tipo==='receita'?'Receita':l.tipo==='retirada'?'Retirada':'Despesa', Descrição: l.desc, Categoria: l.catNome, Status: l.status, 'Valor (R$)': l.tipo==='receita'?l.valor:-l.valor, Cliente: l.cliente||'', Fornecedor: l.fornecedor||'' }))), 'Movimentações')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(top10Rec.map((l,i) => ({ '#': i+1, Data: l.data, Descrição: l.desc, Cliente: l.cliente||'', Categoria: l.catNome||'', 'Valor (R$)': l.valor, 'Pct (%)': l.pct.toFixed(2) }))), 'Top 10 Receitas')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(top10Desp.map((l,i) => ({ '#': i+1, Data: l.data, Descrição: l.desc, Fornecedor: l.fornecedor||'', Categoria: l.catNome||'', 'Valor (R$)': l.valor, 'Pct (%)': l.pct.toFixed(2) }))), 'Top 10 Despesas')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recByCat.map((r,i) => ({ '#': i+1, Categoria: r.nome, 'Valor (R$)': r.valor, 'Pct (%)': tRec>0?(r.valor/tRec*100).toFixed(2):0, Lançamentos: r.count }))), 'Rec por Categoria')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(despByCat.map((r,i) => ({ '#': i+1, Categoria: r.nome, 'Valor (R$)': r.valor, 'Pct (%)': tDesp>0?(r.valor/tDesp*100).toFixed(2):0, Lançamentos: r.count }))), 'Desp por Categoria')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lancsRet.map(l => ({ Data: l.data, Sócio: getSocioRet(l)==='pedro'?'Pedro Kerber':getSocioRet(l)==='leo'?'Léo Ricardo':'—', Tipo: TIPO_LABELS[getTipoRet(l)]||'Retirada', Descrição: l.desc, 'Valor (R$)': l.valor, Status: l.status||'' }))), 'Retirada Sócios')
    XLSX.writeFile(wb, `relatorio_${empresa?.nome||'norvo'}_${applied.inicio}_${applied.fim}.xlsx`)
  }

  const exportPDF = () => {
    const fmt2 = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const html = `<html><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;font-size:11px;margin:28px;color:#111}
      h1{font-size:19px;margin:0 0 2px}h2{font-size:12px;margin:18px 0 8px;border-bottom:2px solid #F47B20;padding-bottom:4px;text-transform:uppercase;letter-spacing:.5px}
      .sub{color:#666;font-size:11px;margin:0 0 16px}
      .kpis{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px}
      .kpi{border-radius:8px;padding:10px 14px;flex:1;min-width:110px;border-left:4px solid}
      .kpi .kl{font-size:9px;color:#888;margin-bottom:3px;text-transform:uppercase}
      .kpi .kv{font-size:14px;font-weight:800}
      .dre{border:1px solid #e5e7eb;border-radius:8px;padding:12px;max-width:340px;margin-bottom:18px}
      .dr{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f3f4f6;font-size:11px}
      .dr.final{border-bottom:none;font-weight:800;font-size:13px;padding-top:8px}
      table{width:100%;border-collapse:collapse;margin-bottom:18px}
      th{background:#f9fafb;text-align:left;padding:6px 10px;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #e5e7eb}
      td{padding:6px 10px;border-bottom:1px solid #f3f4f6;font-size:11px}tr:nth-child(even) td{background:#fafafa}
      .g{color:#16a34a;font-weight:700}.r{color:#dc2626;font-weight:700}.o{color:#ea580c;font-weight:700}.p{color:#7c3aed;font-weight:700}
      .footer{margin-top:24px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:9px;color:#999;text-align:center}
    </style></head><body>
      <h1>Relatório Financeiro — ${empresa?.nome||''}</h1>
      <div class="sub">Período: ${fd(applied.inicio)} a ${fd(applied.fim)} · Gerado em ${TODAY}</div>
      <h2>Indicadores Executivos</h2>
      <div class="kpis">
        <div class="kpi" style="border-color:#16a34a;background:#f0fdf4"><div class="kl">Total em Receitas</div><div class="kv g">${fmt2(tRec)}</div></div>
        <div class="kpi" style="border-color:#dc2626;background:#fef2f2"><div class="kl">Total em Despesas</div><div class="kv r">${fmt2(tDesp)}</div></div>
        <div class="kpi" style="border-color:#2563eb;background:#eff6ff"><div class="kl">Lucro Líquido</div><div class="kv" style="color:${resultOper>=0?'#2563eb':'#dc2626'}">${fmt2(resultOper)}</div></div>
        <div class="kpi" style="border-color:#ea580c;background:#fff7ed"><div class="kl">Retirada dos Sócios</div><div class="kv o">${fmt2(tRetirada)}</div></div>
        <div class="kpi" style="border-color:#7c3aed;background:#ede9fe"><div class="kl">Total em Caixa</div><div class="kv p">${fmt2(saldoFinal)}</div></div>
      </div>
      <h2>DRE — Demonstração do Resultado</h2>
      <div class="dre">
        <div class="dr"><span>Receitas Totais</span><span class="g">${fmt2(tRec)}</span></div>
        <div class="dr"><span class="r">(-) Despesas Variáveis</span><span class="r">${fmt2(tDespVar)}</span></div>
        <div class="dr"><span style="font-weight:700">= Lucro Bruto</span><span style="font-weight:700;color:${lucroBruto>=0?'#16a34a':'#dc2626'}">${fmt2(lucroBruto)}</span></div>
        <div class="dr"><span class="r">(-) Despesas Fixas</span><span class="r">${fmt2(tDespFixed)}</span></div>
        <div class="dr"><span style="font-weight:700">= Resultado Operacional</span><span style="font-weight:700;color:${resultOper>=0?'#16a34a':'#dc2626'}">${fmt2(resultOper)}</span></div>
        <div class="dr"><span class="o">(-) Retirada dos Sócios</span><span class="o">${fmt2(tRetirada)}</span></div>
        <div class="dr final"><span>= Saldo Final em Caixa</span><span style="color:${saldoFinal>=0?'#7c3aed':'#dc2626'}">${fmt2(saldoFinal)}</span></div>
      </div>
      <h2>Comparativo — Período Anterior (${fd(prevInicio)} a ${fd(prevFim)})</h2>
      <table><tr><th>Indicador</th><th>Atual</th><th>Anterior</th><th>Variação</th></tr>
        ${comparData.map(r => { const d = calcDelta(r.atual, r.anterior); const ds = d==null||!isFinite(d)?'—':`<span style="color:${d>=0?'#16a34a':'#dc2626'}">${d>=0?'↑':'↓'} ${Math.abs(d).toFixed(1)}%</span>`; return `<tr><td style="font-weight:600">${r.label}</td><td style="font-weight:700">${fmt2(r.atual)}</td><td style="color:#888">${fmt2(r.anterior)}</td><td>${ds}</td></tr>` }).join('')}
      </table>
      <h2>Top 10 Receitas</h2>
      <table><tr><th>#</th><th>Data</th><th>Descrição</th><th>Categoria</th><th style="text-align:right">Valor</th><th style="text-align:right">%</th></tr>
        ${top10Rec.map((l,i) => `<tr><td>${i+1}</td><td>${l.data||''}</td><td>${l.desc||''}</td><td>${l.catNome||''}</td><td class="g" style="text-align:right">${fmt2(l.valor)}</td><td style="text-align:right;color:#888">${l.pct.toFixed(1)}%</td></tr>`).join('')}
      </table>
      <h2>Top 10 Despesas</h2>
      <table><tr><th>#</th><th>Data</th><th>Descrição</th><th>Categoria</th><th style="text-align:right">Valor</th><th style="text-align:right">%</th></tr>
        ${top10Desp.map((l,i) => `<tr><td>${i+1}</td><td>${l.data||''}</td><td>${l.desc||''}</td><td>${l.catNome||''}</td><td class="r" style="text-align:right">-${fmt2(l.valor)}</td><td style="text-align:right;color:#888">${l.pct.toFixed(1)}%</td></tr>`).join('')}
      </table>
      <h2>Movimentações${tableData.length > 100 ? ` (primeiros 100 de ${tableData.length})` : ''}</h2>
      <table><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Status</th><th style="text-align:right">Valor</th></tr>
        ${tableData.slice(0,100).map(l => `<tr><td>${l.data||''}</td><td>${l.tipo==='receita'?'Receita':l.tipo==='retirada'?'Retirada':'Despesa'}</td><td>${l.desc||''}</td><td>${l.catNome||''}</td><td>${l.status||''}</td><td class="${l.tipo==='receita'?'g':l.tipo==='retirada'?'o':'r'}" style="text-align:right">${l.tipo==='receita'?'+':'-'} ${fmt2(l.valor)}</td></tr>`).join('')}
      </table>
      <div class="footer">Norvo · ${empresa?.nome||''} · Período ${fd(applied.inicio)} a ${fd(applied.fim)} · Gerado em ${TODAY}</div>
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
          <div style={{ color: 'var(--text-sub)', fontSize: 14 }}>{empresa?.nome} · {fd(applied.inicio)} a {fd(applied.fim)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>📊 Excel</button>
          <button onClick={exportPDF}   style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>📄 PDF</button>
        </div>
      </div>

      {/* FILTROS */}
      <Card style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, alignItems: 'end', marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>Data inicial</label>
            <input type="date" value={editInicio} onChange={e => { setEditInicio(e.target.value); setPreset('Personalizado') }} style={iSty} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>Data final</label>
            <input type="date" value={editFim} onChange={e => { setEditFim(e.target.value); setPreset('Personalizado') }} style={iSty} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>Tipo</label>
            <select value={editTipo} onChange={e => setEditTipo(e.target.value)} style={sSty}>
              <option value="">Todos</option>
              <option value="receita">Receitas</option>
              <option value="despesa">Despesas</option>
              <option value="retirada">Retiradas</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>Categoria</label>
            <select value={editCat} onChange={e => setEditCat(e.target.value)} style={sSty}>
              <option value="">Todas</option>
              {(extraCats.some(c => c.override) ? [...extraCats.filter(c => c.tipo !== 'retirada'), ...CATS_RETIRADA] : BASE_CATS).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <button onClick={applyFilters} style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>Aplicar</button>
          <button onClick={clearFilters} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-sub)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Limpar</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {QUICK_PRESETS.map(p => <button key={p} onClick={() => applyPreset(p)} style={chip(preset === p)}>{p}</button>)}
        </div>
        <div>
          <button onClick={() => setShowAvancado(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
            ⚙ Filtros Avançados {showAvancado ? '▲' : '▼'}
          </button>
          {showAvancado && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 12 }}>
              {[
                { label: 'Status',            val: editStatus,  set: setEditStatus,  opts: STATUS_OPTS.map(o => [o,o]) },
                { label: 'Centro de Custo',   val: editCentro,  set: setEditCentro,  opts: CENTROS.map(o => [o,o]) },
                { label: 'Conta Bancária',    val: editConta,   set: setEditConta,   opts: CONTAS.map(c => [c.nome, c.nome]) },
                { label: 'Forma de Pagamento',val: editForma,   set: setEditForma,   opts: FORMAS.map(o => [o,o]) },
                { label: 'Sócio',             val: editSocio,   set: setEditSocio,   opts: [['pedro','Pedro Kerber'],['leo','Léo Ricardo']] },
                { label: 'Tipo de Retirada',  val: editTipoRet, set: setEditTipoRet, opts: [['prolabore','Pró-labore'],['distribuicao','Distribuição'],['adiantamento','Adiantamento'],['extraordinaria','Extraordinária']] },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>{f.label}</label>
                  <select value={f.val} onChange={e => f.set(e.target.value)} style={sSty}>
                    <option value="">Todos</option>
                    {f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
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
            </div>
          )}
        </div>
      </Card>

      {/* 5 KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Total em Receitas',   value: tRec,       color: '#16a34a', bg: '#f0fdf4', d: calcDelta(tRec,pRec),           sub: 'vs. período anterior' },
          { label: 'Total em Despesas',   value: tDesp,      color: '#dc2626', bg: '#fef2f2', d: calcDelta(tDesp,pDesp),         sub: 'vs. período anterior' },
          { label: 'Lucro Líquido',       value: resultOper, color: resultOper>=0?'#2563eb':'#dc2626', bg: resultOper>=0?'#eff6ff':'#fef2f2', d: calcDelta(resultOper,pResultOper), sub: `margem: ${fmtPct(margem)}` },
          { label: 'Retirada dos Sócios', value: tRetirada,  color: '#ea580c', bg: '#fff7ed', d: calcDelta(tRetirada,pRetirada), sub: 'ver detalhes ↗', onClick: () => setTab('retiradas') },
          { label: 'Total em Caixa',      value: saldoFinal, color: saldoFinal>=0?'#7c3aed':'#dc2626', bg: saldoFinal>=0?'#ede9fe':'#fef2f2', d: calcDelta(saldoFinal,pSaldoFinal), sub: 'Resultado − Retiradas' },
        ].map(k => (
          <div key={k.label} onClick={k.onClick} style={{ background: 'var(--card)', borderRadius: 14, padding: '16px 18px', border: '1px solid var(--border)', borderLeft: `4px solid ${k.color}`, cursor: k.onClick?'pointer':'default', transition: 'transform .15s' }}
            onMouseEnter={e => { if (k.onClick) e.currentTarget.style.transform='translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform='none' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: k.color, lineHeight: 1, marginBottom: 6 }}>{fmtS(k.value)}</div>
            {k.d !== null && k.d !== undefined && isFinite(k.d) ? (
              <div style={{ fontSize: 11, color: k.d>=0?'#16a34a':'#dc2626' }}>{k.d>=0?'↑':'↓'} {Math.abs(k.d).toFixed(1)}% {k.sub}</div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--border)' }}>
        {TABS.map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 18px', fontSize: 13, fontWeight: tab===v?700:400, color: tab===v?T.primary:'var(--text-sub)', borderBottom: `2px solid ${tab===v?T.primary:'transparent'}`, marginBottom: -2, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{l}</button>
        ))}
      </div>

      {/* ── TAB: VISÃO GERAL ── */}
      {tab === 'visao' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, marginBottom: 16 }}>

            {/* DRE Resumo */}
            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 18 }}>Resumo Financeiro</div>
              {[
                { label: 'Receitas Totais',         value: tRec,       color: '#16a34a', prefix: '' },
                { label: '(-) Despesas Variáveis',  value: tDespVar,   color: '#dc2626', prefix: '-' },
                { label: '= Lucro Bruto',           value: lucroBruto, color: lucroBruto>=0?'#16a34a':'#dc2626', prefix: '', bold: true },
                { label: '(-) Despesas Fixas',      value: tDespFixed, color: '#dc2626', prefix: '-' },
                { label: '= Resultado Operacional', value: resultOper, color: resultOper>=0?'#2563eb':'#dc2626', prefix: '', bold: true },
                { label: '(-) Retirada dos Sócios', value: tRetirada,  color: '#ea580c', prefix: '-' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.3, fontWeight: r.bold ? 700 : 400 }}>{r.label}</span>
                  <span style={{ fontSize: 13, fontWeight: r.bold ? 800 : 700, color: r.color, textAlign: 'right' }}>{r.prefix} {fmtS(r.value)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>= Saldo Final em Caixa</span>
                <span style={{ fontSize: 17, fontWeight: 900, color: saldoFinal>=0?'#7c3aed':'#dc2626' }}>{fmtS(saldoFinal)}</span>
              </div>
            </Card>

            {/* Evolução Financeira */}
            <Card style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Evolução Financeira</div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                    {[['Receitas','#16a34a'],['Despesas','#dc2626'],['Retiradas','#ea580c'],['Resultado','#2563eb']].map(([l,c]) => (
                      <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-sub)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {evolutionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={evolutionData} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={yFmt} />
                    <Tooltip formatter={v => [fmtS(v), '']} contentStyle={tipSty} />
                    <Line type="monotone" dataKey="Receitas"  stroke="#16a34a" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Despesas"  stroke="#dc2626" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Retiradas" stroke="#ea580c" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
                    <Line type="monotone" dataKey="Resultado" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 14 }}>Nenhum lançamento no período</div>
              )}
            </Card>
          </div>

          {/* Comparativo */}
          <Card>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Comparativo entre Períodos</span>
              <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>vs. {fd(prevInicio)} a {fd(prevFim)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <div style={{ padding: '16px 20px', borderRight: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)' }}>
                      {['Indicador','Atual','Anterior','Variação'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: h==='Atual'||h==='Anterior'||h==='Variação'?'right':'left', fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {comparData.map(r => {
                      const d = calcDelta(r.atual, r.anterior)
                      return (
                        <tr key={r.label} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>{r.label}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, textAlign: 'right', color: r.label==='Despesas'?'#dc2626':r.label==='Retiradas'?'#ea580c':r.atual>=0?'#16a34a':'#dc2626' }}>{fmtS(r.atual)}</td>
                          <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'right', color: 'var(--text-sub)' }}>{fmtS(r.anterior)}</td>
                          <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'right', color: d===null||!isFinite(d)?'var(--text-muted)':d>=0?'#16a34a':'#dc2626', fontWeight: 600 }}>{dStr(r.atual, r.anterior)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '12px 8px' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={comparData} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={yFmt} />
                    <Tooltip formatter={v => [fmtS(v), '']} contentStyle={tipSty} />
                    <Bar dataKey="atual"    name="Atual"    fill="#16a34a" radius={[3,3,0,0]} />
                    <Bar dataKey="anterior" name="Anterior" fill="#9ca3af" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* ── TAB: RANKINGS ── */}
      {tab === 'rankings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { title: 'Top 10 Receitas',  data: top10Rec,  total: tRec,  color: '#16a34a', sig: '+', lblA: 'Cliente' },
            { title: 'Top 10 Despesas', data: top10Desp, total: tDesp, color: '#dc2626', sig: '-', lblA: 'Fornecedor' },
          ].map(({ title, data, total, color, sig, lblA }) => (
            <Card key={title} style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
                <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>Total: <strong style={{ color }}>{fmtS(total)}</strong></span>
              </div>
              {data.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 14 }}>Nenhum lançamento no período</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)' }}>
                        {['#','Data','Descrição', lblA,'Categoria','Valor','%'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: h==='Valor'||h==='%'?'right':'left', fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((l, i) => (
                        <tr key={l.id||i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-sub)', fontWeight: 700 }}>{i+1}</td>
                          <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>{fd(l.data)}</td>
                          <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.desc}</td>
                          <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-sub)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.cliente||l.fornecedor||'—'}</td>
                          <td style={{ padding: '9px 12px' }}>{l.catNome ? <Badge label={l.catNome} color={color} /> : <span style={{ color: T.muted }}>—</span>}</td>
                          <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 800, color, textAlign: 'right', whiteSpace: 'nowrap' }}>{sig}{fmtS(l.valor)}</td>
                          <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-sub)', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                              <div style={{ width: Math.min(40, l.pct * 0.8), height: 4, borderRadius: 2, background: color, opacity: 0.6 }} />
                              {l.pct.toFixed(1)}%
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ── TAB: POR CATEGORIA ── */}
      {tab === 'categorias' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { title: 'Receitas por Categoria',  catData: recByCat,  total: tRec,  color: '#16a34a' },
            { title: 'Despesas por Categoria',  catData: despByCat, total: tDesp, color: '#dc2626' },
          ].map(({ title, catData, total, color }) => (
            <Card key={title} style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>{title}</div>
              {catData.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 14 }}>Nenhum lançamento no período</div>
              ) : (
                <>
                  <div style={{ padding: '0 8px' }}>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={catData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} dataKey="valor" nameKey="nome" paddingAngle={2}>
                          {catData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v => [fmtS(v), '']} contentStyle={tipSty} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ overflowY: 'auto', maxHeight: 260 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg)' }}>
                          {['Categoria','Valor','%','Qtd'].map(h => (
                            <th key={h} style={{ padding: '7px 14px', textAlign: h==='Categoria'?'left':'right', fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {catData.map((r, i) => (
                          <tr key={r.nome} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '9px 14px', fontSize: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: CAT_COLORS[i % CAT_COLORS.length], flexShrink: 0 }} />
                                {r.nome}
                              </div>
                            </td>
                            <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 12, fontWeight: 700, color }}>{fmtS(r.valor)}</td>
                            <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 12, color: 'var(--text-sub)' }}>{total > 0 ? (r.valor/total*100).toFixed(1) : 0}%</td>
                            <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 12, color: 'var(--text-sub)' }}>{r.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ── TAB: RETIRADA DOS SÓCIOS ── */}
      {tab === 'retiradas' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Total Retirado',     value: tRetirada,            color: '#ea580c', bg: '#fff7ed' },
              { label: 'Pedro Kerber',       value: retPedro,             color: '#7c3aed', bg: '#ede9fe' },
              { label: 'Léo Ricardo',        value: retLeo,               color: '#2563eb', bg: '#eff6ff' },
              { label: 'Pró-labore',         value: retProlab,            color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Distribuição',       value: retDistrib,           color: '#0891b2', bg: '#ecfeff' },
              { label: 'Adiant. + Extraord.',value: retAdiant+retExtraord, color: '#9ca3af', bg: 'var(--bg)' },
            ].map(k => (
              <div key={k.label} style={{ background: 'var(--card)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border)', borderLeft: `4px solid ${k.color}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: k.color }}>{fmtS(k.value)}</div>
              </div>
            ))}
          </div>
          <Card>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
              Detalhamento — {lancsRet.length} lançamento{lancsRet.length !== 1 ? 's' : ''}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)' }}>
                    {['Data','Sócio','Tipo','Descrição','Valor','Status'].map(h => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lancsRet.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 14 }}>Nenhuma retirada no período selecionado</td></tr>
                  ) : lancsRet.map((l, i) => {
                    const socio = getSocioRet(l), tipoR = getTipoRet(l)
                    return (
                      <tr key={l.id||i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>{fd(l.data)}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: SOCIO_COLOR[socio]||'#9ca3af', flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{socio==='pedro'?'Pedro Kerber':socio==='leo'?'Léo Ricardo':'—'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }}><Badge label={TIPO_LABELS[tipoR]||'Retirada'} color="#ea580c" /></td>
                        <td style={{ padding: '10px 14px', fontSize: 13, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.desc}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: 14, color: '#ea580c', whiteSpace: 'nowrap' }}>{fmtS(l.valor)}</td>
                        <td style={{ padding: '10px 14px' }}><StatusBadge status={l.status} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ── TAB: LANÇAMENTOS ── */}
      {tab === 'lancamentos' && (
        <Card>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Lançamentos — {tableData.length}</div>
            <input value={search} onChange={e => { setSearch(e.target.value); setPageNum(1) }} placeholder="Buscar..."
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', width: 220 }} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  {[['data','Data'],['tipo','Tipo'],['desc','Descrição'],['catNome','Categoria'],['status','Status'],['valor','Valor']].map(([key,lbl]) => (
                    <th key={key} onClick={() => toggleSort(key)} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', cursor: 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap', userSelect: 'none' }}>
                      {lbl}{sortKey===key?(sortDir==='desc'?' ↓':' ↑'):''}
                    </th>
                  ))}
                  <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pagedData.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 14 }}>Nenhum lançamento no período</td></tr>
                ) : pagedData.map((l, i) => {
                  const isRec = l.tipo === 'receita', isRet = l.tipo === 'retirada'
                  const c = isRec ? '#16a34a' : isRet ? '#ea580c' : '#dc2626'
                  return (
                    <tr key={l.id||i} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>{fd(l.data)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: isRec?'#f0fdf4':isRet?'#fff7ed':'#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: c, fontWeight: 700, fontSize: 11 }}>{isRec?'↑':isRet?'←':'↓'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.desc}</td>
                      <td style={{ padding: '10px 14px' }}>{l.catNome ? <Badge label={l.catNome} color={c} /> : <span style={{ color: T.muted }}>—</span>}</td>
                      <td style={{ padding: '10px 14px' }}><StatusBadge status={l.status} /></td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: 14, color: c, whiteSpace: 'nowrap' }}>{isRec?'+':'-'}{fmtS(l.valor)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => setPage(isRec?'receitas':isRet?'retirada_socios':'despesas')} title="Ir para página"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub)', fontSize: 15, padding: '2px 4px' }}>👁</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--text-sub)', flexWrap: 'wrap', gap: 8 }}>
            <span>Exibindo {tableData.length===0?0:(pageNum-1)*perPage+1}–{Math.min(pageNum*perPage,tableData.length)} de {tableData.length}</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {[['«',()=>setPageNum(1)],['‹',()=>setPageNum(p=>Math.max(1,p-1))]].map(([lbl,fn]) => (
                <button key={lbl} onClick={fn} disabled={pageNum===1} style={{ background:'var(--bg)',border:'1px solid var(--border)',borderRadius:6,padding:'4px 8px',cursor:pageNum===1?'default':'pointer',opacity:pageNum===1?0.4:1,fontFamily:'inherit' }}>{lbl}</button>
              ))}
              {Array.from({ length: Math.min(5, totalPages) }, (_,i) => { const p = Math.max(1,Math.min(totalPages-4,pageNum-2))+i; return p<=totalPages?(<button key={p} onClick={()=>setPageNum(p)} style={{ background:pageNum===p?T.primary:'var(--bg)',color:pageNum===p?'#fff':'var(--text-sub)',border:pageNum===p?'none':'1px solid var(--border)',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontWeight:pageNum===p?700:400,minWidth:32,fontFamily:'inherit' }}>{p}</button>):null })}
              {[['›',()=>setPageNum(p=>Math.min(totalPages,p+1))],['»',()=>setPageNum(totalPages)]].map(([lbl,fn]) => (
                <button key={lbl} onClick={fn} disabled={pageNum===totalPages} style={{ background:'var(--bg)',border:'1px solid var(--border)',borderRadius:6,padding:'4px 8px',cursor:pageNum===totalPages?'default':'pointer',opacity:pageNum===totalPages?0.4:1,fontFamily:'inherit' }}>{lbl}</button>
              ))}
              <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPageNum(1) }}
                style={{ background:'var(--bg)',border:'1px solid var(--border)',borderRadius:6,padding:'4px 8px',fontSize:12,color:'var(--text-sub)',fontFamily:'inherit',marginLeft:8 }}>
                {[10,25,50,100].map(n => <option key={n} value={n}>{n}/pág</option>)}
              </select>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
