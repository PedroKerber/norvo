import { useMemo, useState, useCallback, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { T, fmt, fmtS, fmtPct } from '../theme'
import { genFluxoCaixaData } from '../data'
import { Card, Btn, Toast } from '../components/ui'
import CompetenciaSelector, { COMPETENCIA_DEFAULT, filterByCompetencia } from '../components/CompetenciaSelector'
import { isMesFechado, setMesFechado, getHistoricoFechamento, addHistoricoFechamento } from '../supabase'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const fmtComp = (m) => { const p = (m || '').split('-'); const i = +p[1] - 1; return MESES[i] ? `${MESES[i]}/${p[0]}` : (m || '') }
const COLORS_R = ['#16a34a','#2563eb','#7c3aed','#ea580c','#9ca3af','#0891b2']
const COLORS_D = ['#2563eb','#dc2626','#7c3aed','#16a34a','#ea580c','#0891b2']

function pct(v) { return `${(+v).toFixed(1).replace('.',',')}%` }
function fmtL(v) { return `R$ ${(+v).toLocaleString('pt-BR',{minimumFractionDigits:2})}` }

function buildPDF({ empresa, mesLabel, tRec, tDesp, lucro, margem, saldoInicial, saldoFinal, catRec, catDesp, top5Rec, top5Desp, lancs }) {
  const now = new Date()
  const row = (l) => `<tr><td>${l.data}</td><td><span class="badge ${l.tipo==='receita'?'bg':'br'}">${l.tipo}</span></td><td>${l.desc||''}</td><td>${l.catNome||''}</td><td>${l.status||''}</td><td style="font-weight:700;color:${l.tipo==='receita'?'#16a34a':'#dc2626'}">${fmtL(l.valor)}</td></tr>`
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Fechamento ${mesLabel} — ${empresa?.nome||''}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#111827;font-size:13px}
.hdr{background:#0D2545;color:#fff;padding:20px 32px;display:flex;justify-content:space-between;align-items:center}
.logo{font-size:22px;font-weight:900}.logo span{color:#F47B20}
.co{text-align:right}.co h2{font-size:15px;font-weight:700}.co p{font-size:11px;opacity:.7;margin-top:2px}
.body{padding:24px 32px}
.st{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin:20px 0 12px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px}
.kpi{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px}
.kl{font-size:10px;color:#6b7280;margin-bottom:3px}.kv{font-size:18px;font-weight:800}
.g{color:#16a34a}.r{color:#dc2626}.b{color:#2563eb}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:#f3f4f6;padding:7px 10px;text-align:left;font-weight:600;color:#6b7280;font-size:11px}
td{padding:7px 10px;border-bottom:1px solid #f3f4f6}
.badge{display:inline-block;padding:1px 7px;border-radius:3px;font-size:10px;font-weight:700}
.bg{background:#dcfce7;color:#16a34a}.br{background:#fee2e2;color:#dc2626}
.ftr{background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 32px;text-align:center;font-size:10px;color:#9ca3af;margin-top:24px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.hdr{background:#0D2545!important}}
</style></head><body>
<div class="hdr"><div class="logo">Norvo</div>
<div class="co"><h2>${empresa?.nome||''}</h2><p>CNPJ: ${empresa?.cnpj||''}</p><p>Fechamento de ${mesLabel}</p></div></div>
<div class="body">
<div class="st">Indicadores do Período</div>
<div class="g3">
<div class="kpi"><div class="kl">Receita Total</div><div class="kv g">${fmtL(tRec)}</div></div>
<div class="kpi"><div class="kl">Despesas Totais</div><div class="kv r">${fmtL(tDesp)}</div></div>
<div class="kpi"><div class="kl">Lucro Líquido</div><div class="kv ${lucro>=0?'g':'r'}">${fmtL(lucro)}</div></div>
<div class="kpi"><div class="kl">Margem Líquida</div><div class="kv b">${pct(margem)}</div></div>
<div class="kpi"><div class="kl">Saldo Inicial</div><div class="kv">${fmtL(saldoInicial)}</div></div>
<div class="kpi"><div class="kl">Saldo Final</div><div class="kv b">${fmtL(saldoFinal)}</div></div>
</div>
<div class="st">Receitas por Categoria</div>
<table><thead><tr><th>Categoria</th><th>Valor</th><th>Participação</th></tr></thead><tbody>
${catRec.map(c=>`<tr><td>${c.n}</td><td class="g" style="font-weight:700">${fmtL(c.v)}</td><td>${c.pct}%</td></tr>`).join('')||'<tr><td colspan="3" style="color:#9ca3af">Sem dados</td></tr>'}
</tbody></table>
<div class="st">Despesas por Categoria</div>
<table><thead><tr><th>Categoria</th><th>Valor</th><th>Participação</th></tr></thead><tbody>
${catDesp.map(c=>`<tr><td>${c.n}</td><td class="r" style="font-weight:700">${fmtL(c.v)}</td><td>${c.pct}%</td></tr>`).join('')||'<tr><td colspan="3" style="color:#9ca3af">Sem dados</td></tr>'}
</tbody></table>
<div class="st">Top 5 Receitas</div>
<table><thead><tr><th>#</th><th>Descrição</th><th>Categoria</th><th>Valor</th></tr></thead><tbody>
${top5Rec.map((l,i)=>`<tr><td>${i+1}</td><td>${l.desc||''}</td><td>${l.catNome||''}</td><td class="g" style="font-weight:700">${fmtL(l.valor)}</td></tr>`).join('')||'<tr><td colspan="4" style="color:#9ca3af">Sem dados</td></tr>'}
</tbody></table>
<div class="st">Top 5 Despesas</div>
<table><thead><tr><th>#</th><th>Descrição</th><th>Categoria</th><th>Valor</th></tr></thead><tbody>
${top5Desp.map((l,i)=>`<tr><td>${i+1}</td><td>${l.desc||''}</td><td>${l.catNome||''}</td><td class="r" style="font-weight:700">${fmtL(l.valor)}</td></tr>`).join('')||'<tr><td colspan="4" style="color:#9ca3af">Sem dados</td></tr>'}
</tbody></table>
<div class="st">Todos os Lançamentos</div>
<table><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Status</th><th>Valor</th></tr></thead><tbody>
${lancs.map(row).join('')||'<tr><td colspan="6" style="color:#9ca3af">Sem lançamentos</td></tr>'}
</tbody></table>
</div>
<div class="ftr">
<p>Gerado pelo Norvo em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}</p>
<p style="margin-top:4px">Documento confidencial — uso interno da ${empresa?.nome||''}</p>
</div></body></html>`
}

function Modal({ onClose, title, children, width = 620 }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: T.white, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        zIndex: 901, width: `min(${width}px, calc(100vw - 32px))`,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: T.text }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 22, lineHeight: 1, display: 'flex', padding: '0 2px' }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>{children}</div>
      </div>
    </>
  )
}

function EmptyState({ label }) {
  return <div style={{ textAlign: 'center', color: T.muted, padding: '36px 0', fontSize: 13 }}>{label}</div>
}

function CatTable({ data, colors, tipo, filteredLancs }) {
  if (data.length === 0) return <EmptyState label={`Sem ${tipo} no período selecionado.`} />
  const isRec = tipo === 'receitas'
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: `2px solid ${T.border}` }}>
          {['Categoria','Valor','%','Lançamentos'].map(h => (
            <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: T.sub, fontWeight: 600, fontSize: 12 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((c, i) => (
          <tr key={c.n} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
            <td style={{ padding: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors[i % colors.length] }} />
                {c.n}
              </div>
            </td>
            <td style={{ padding: '10px', fontWeight: 700, color: isRec ? T.green : T.red }}>{fmt(c.v)}</td>
            <td style={{ padding: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, background: T.borderLight, borderRadius: 4, height: 6, overflow: 'hidden', minWidth: 50 }}>
                  <div style={{ height: '100%', background: colors[i % colors.length], width: `${c.pct}%` }} />
                </div>
                <span style={{ color: T.sub, minWidth: 30 }}>{c.pct}%</span>
              </div>
            </td>
            <td style={{ padding: '10px', color: T.muted }}>
              {filteredLancs.filter(l => l.tipo === (isRec ? 'receita' : 'despesa') && l.catNome === c.n).length}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TopTable({ items, cor, bg }) {
  if (items.length === 0) return <EmptyState label="Sem lançamentos no período." />
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
          {['#','Descrição','Categoria','Data','Status','Valor'].map(h => (
            <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: T.sub, fontSize: 11 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((l, i) => (
          <tr key={l.id} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
            <td style={{ padding: '9px 8px', width: 28 }}>
              <div style={{ background: i < 5 ? bg : T.borderLight, color: i < 5 ? '#fff' : T.muted, borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{i + 1}</div>
            </td>
            <td style={{ padding: '9px 8px', fontWeight: 500 }}>{l.desc}</td>
            <td style={{ padding: '9px 8px', color: T.sub, fontSize: 12 }}>{l.catNome}</td>
            <td style={{ padding: '9px 8px', color: T.muted, fontSize: 12 }}>{l.data}</td>
            <td style={{ padding: '9px 8px', fontSize: 12 }}>{l.status}</td>
            <td style={{ padding: '9px 8px', fontWeight: 700, color: cor }}>{fmt(l.valor)}</td>
          </tr>
        ))}
        <tr style={{ borderTop: `2px solid ${T.border}` }}>
          <td colSpan={5} style={{ padding: '9px 8px', fontWeight: 700, fontSize: 12, color: T.sub }}>Total</td>
          <td style={{ padding: '9px 8px', fontWeight: 800, color: cor }}>{fmt(items.reduce((s, l) => s + l.valor, 0))}</td>
        </tr>
      </tbody>
    </table>
  )
}

export default function MesFechado({ empresa, data, onFechar, onReabrir, usuario }) {
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [comp, setComp] = useState({ ...COMPETENCIA_DEFAULT, mesAno: '2026-05' })
  const mesAno = comp.mesAno
  const dateRange = comp.dateRange
  const activePreset = comp.activePreset
  const [fTipo, setFTipo] = useState('')
  const [fCat, setFCat] = useState('')
  const [fStatus, setFStatus] = useState('')

  const [historico, setHistorico] = useState([])
  const [fechado, setFechado] = useState(false)

  const lancs = useMemo(() => data.lancamentos || [], [data.lancamentos])

  // Carrega o estado de fechamento (por competência) e o histórico do Supabase (Fase 1)
  useEffect(() => {
    if (!empresa?.id) return
    isMesFechado(empresa.id, mesAno).then(setFechado).catch(() => setFechado(false))
    getHistoricoFechamento(empresa.id).then(setHistorico).catch(() => setHistorico([]))
  }, [empresa, mesAno])

  const [anoN, mesN] = mesAno.split('-').map(Number)
  const mesLabel = `${MESES[mesN - 1]}/${anoN}`

  const prevDate = new Date(anoN, mesN - 2, 1)
  const prevMesAno = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const prevMesLabel = `${MESES[prevDate.getMonth()]}/${prevDate.getFullYear()}`

  const filteredLancs = useMemo(() => {
    let l = filterByCompetencia(lancs, comp)
    if (fTipo) l = l.filter(x => x.tipo === fTipo)
    if (fCat) l = l.filter(x => x.catNome === fCat)
    if (fStatus) l = l.filter(x => x.status === fStatus)
    return l
  }, [lancs, comp, fTipo, fCat, fStatus])

  const lancsAnt = useMemo(() => lancs.filter(x => x.data?.startsWith(prevMesAno)), [lancs, prevMesAno])

  const tRec  = useMemo(() => filteredLancs.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0), [filteredLancs])
  const tDesp = useMemo(() => filteredLancs.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0), [filteredLancs])
  const lucro = tRec - tDesp
  const margem = tRec > 0 ? (lucro / tRec) * 100 : 0
  const saldoInicial = 0
  const saldoFinal = saldoInicial + tRec - tDesp

  const tRecAnt  = useMemo(() => lancsAnt.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0), [lancsAnt])
  const tDespAnt = useMemo(() => lancsAnt.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0), [lancsAnt])
  const lucroAnt = tRecAnt - tDespAnt
  const margemAnt = tRecAnt > 0 ? (lucroAnt / tRecAnt) * 100 : 0
  const saldoFinalAnt = saldoInicial + tRecAnt - tDespAnt

  const varPct = (cur, prev) => {
    if (prev === 0 && cur === 0) return { val: '—', pos: null }
    if (prev === 0) return { val: '∞', pos: true }
    const p = ((cur - prev) / Math.abs(prev)) * 100
    return { val: `${p >= 0 ? '+' : ''}${p.toFixed(1).replace('.', ',')}%`, pos: p >= 0 }
  }

  const catRecData = useMemo(() => {
    const map = {}
    filteredLancs.filter(l => l.tipo === 'receita').forEach(l => { map[l.catNome] = (map[l.catNome] || 0) + l.valor })
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1
    return Object.entries(map).map(([n, v]) => ({ n, v, pct: Math.round(v / total * 100) })).sort((a, b) => b.v - a.v)
  }, [filteredLancs])

  const catDespData = useMemo(() => {
    const map = {}
    filteredLancs.filter(l => l.tipo === 'despesa').forEach(l => { map[l.catNome] = (map[l.catNome] || 0) + l.valor })
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1
    return Object.entries(map).map(([n, v]) => ({ n, v, pct: Math.round(v / total * 100) })).sort((a, b) => b.v - a.v)
  }, [filteredLancs])

  const top5Rec  = useMemo(() => [...filteredLancs].filter(l => l.tipo === 'receita').sort((a, b) => b.valor - a.valor), [filteredLancs])
  const top5Desp = useMemo(() => [...filteredLancs].filter(l => l.tipo === 'despesa').sort((a, b) => b.valor - a.valor), [filteredLancs])
  const fluxoData = useMemo(() => genFluxoCaixaData(filteredLancs), [filteredLancs])

  const saude = Math.min(100, Math.round(40 + (margem > 0 ? Math.min(30, (margem / 50) * 30) : 0) + (lucro > 0 ? 20 : 0) + (tRec > tDesp ? 10 : 0)))

  const compMes = [
    { label: 'Receita', ant: tRecAnt, cur: tRec },
    { label: 'Despesas', ant: tDespAnt, cur: tDesp },
    { label: 'Lucro', ant: lucroAnt, cur: lucro },
    { label: 'Margem Líquida', ant: margemAnt, cur: margem, isPct: true },
    { label: 'Saldo Final', ant: saldoFinalAnt, cur: saldoFinal },
  ]

  const allCats = useMemo(() => [...new Set(lancs.map(l => l.catNome).filter(Boolean))].sort(), [lancs])

  const addHistorico = useCallback((tipo, motivoStr) => {
    const entry = { tipo, motivo: motivoStr, usuario: usuario?.nome || 'Sistema', data: new Date().toISOString(), mes: mesAno }
    setHistorico(prev => [entry, ...prev].slice(0, 100))
    if (empresa?.id) addHistoricoFechamento(empresa.id, mesAno, tipo, motivoStr, usuario?.id, usuario?.nome).catch(() => {})
  }, [empresa, mesAno, usuario])

  const handleFechar = async () => {
    if (empresa?.id) { try { await setMesFechado(empresa.id, mesAno, true, usuario?.id) } catch {} }
    setFechado(true)
    onFechar?.()
    addHistorico('fechamento', 'Período fechado')
    setModal(null)
    setToast({ msg: 'Período fechado com sucesso!', type: 'success' })
  }

  const handleReabrir = async () => {
    if (!motivo.trim()) { setToast({ msg: 'Informe o motivo da reabertura.', type: 'error' }); return }
    if (empresa?.id) { try { await setMesFechado(empresa.id, mesAno, false, usuario?.id) } catch {} }
    setFechado(false)
    onReabrir?.()
    addHistorico('reabertura', motivo)
    setMotivo('')
    setModal(null)
    setToast({ msg: 'Período reaberto com sucesso!', type: 'success' })
  }

  const exportExcel = () => {
    try {
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['FECHAMENTO MENSAL — Norvo'],
        [''],
        ['Empresa', empresa?.nome || ''], ['CNPJ', empresa?.cnpj || ''],
        ['Competência', mesLabel], ['Status', fechado ? 'Fechamento Concluído' : 'Em Andamento'],
        ['Gerado em', new Date().toLocaleDateString('pt-BR')],
        [''],
        ['RESULTADO DO PERÍODO'],
        ['Indicador', 'Valor'],
        ['Receita Total', tRec], ['Despesas Totais', tDesp],
        ['Lucro Líquido', lucro], ['Margem Líquida (%)', +margem.toFixed(2)],
        ['Saldo Inicial', saldoInicial], ['Saldo Final', saldoFinal],
      ]), 'Resumo')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        filteredLancs.filter(l => l.tipo === 'receita').map(l => ({
          Descrição: l.desc, Valor: l.valor, Data: l.data, Categoria: l.catNome,
          Status: l.status, Vencimento: l.vencimento || '', Cliente: l.cliente || '',
          'Centro de Custo': l.centroCusto || '', Conta: l.conta || '',
        }))
      ), 'Receitas')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        filteredLancs.filter(l => l.tipo === 'despesa').map(l => ({
          Descrição: l.desc, Valor: l.valor, Data: l.data, Categoria: l.catNome,
          Status: l.status, Vencimento: l.vencimento || '', Fornecedor: l.fornecedor || '',
          'Centro de Custo': l.centroCusto || '', Conta: l.conta || '',
        }))
      ), 'Despesas')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Categoria', 'Tipo', 'Valor Total', 'Participação (%)', 'Qtd Lançamentos'],
        ...catRecData.map(c => [c.n, 'Receita', c.v, c.pct, filteredLancs.filter(l => l.tipo === 'receita' && l.catNome === c.n).length]),
        ...catDespData.map(c => [c.n, 'Despesa', c.v, c.pct, filteredLancs.filter(l => l.tipo === 'despesa' && l.catNome === c.n).length]),
      ]), 'Categorias')
      const varR = tRecAnt > 0 ? ((tRec - tRecAnt) / tRecAnt * 100).toFixed(1) + '%' : '—'
      const varD = tDespAnt > 0 ? ((tDesp - tDespAnt) / tDespAnt * 100).toFixed(1) + '%' : '—'
      const varLu = lucroAnt !== 0 ? ((lucro - lucroAnt) / Math.abs(lucroAnt) * 100).toFixed(1) + '%' : '—'
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Indicador', 'Período Atual', 'Período Anterior', 'Variação'],
        ['Receita Total', tRec, tRecAnt, varR],
        ['Despesas Totais', tDesp, tDespAnt, varD],
        ['Lucro Líquido', lucro, lucroAnt, varLu],
        ['Margem Líquida (%)', +margem.toFixed(2), +margemAnt.toFixed(2), '—'],
        ['Saldo Inicial', saldoInicial, saldoInicial, '—'],
        ['Saldo Final', saldoFinal, saldoFinalAnt, '—'],
        ['Saúde Financeira', saude + '/100', '', ''],
      ]), 'Indicadores')
      XLSX.writeFile(wb, `fechamento_mensal_${empresa?.id || 'emp'}_${mesAno}.xlsx`)
      addHistorico('exportacao_excel', `Excel exportado — ${mesLabel}`)
      setToast({ msg: 'Excel exportado com sucesso!', type: 'success' })
    } catch { setToast({ msg: 'Erro ao exportar Excel.', type: 'error' }) }
  }

  const exportPDF = () => {
    try {
      const html = buildPDF({ empresa, mesLabel, tRec, tDesp, lucro, margem, saldoInicial, saldoFinal, catRec: catRecData, catDesp: catDespData, top5Rec: top5Rec.slice(0, 5), top5Desp: top5Desp.slice(0, 5), lancs: filteredLancs })
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const w = window.open(url, '_blank')
      if (w) { setTimeout(() => { w.print(); URL.revokeObjectURL(url) }, 800); addHistorico('exportacao_pdf', `PDF exportado — ${mesLabel}`) }
      else { setToast({ msg: 'Permita popups para exportar PDF.', type: 'error' }); URL.revokeObjectURL(url) }
    } catch { setToast({ msg: 'Erro ao gerar PDF.', type: 'error' }) }
  }

  const shareWA = () => {
    const txt = `*Fechamento Mensal — ${empresa?.nome}*\n📅 *${mesLabel}*\n\n📈 Receita: ${fmtS(tRec)}\n📉 Despesas: ${fmtS(tDesp)}\n💰 Lucro: ${fmtS(lucro)}\n📊 Margem: ${pct(margem)}\n🏦 Saldo Final: ${fmtS(saldoFinal)}\n\n_Gerado pelo Norvo_`
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank')
    addHistorico('compartilhamento_wa', 'Compartilhado via WhatsApp')
  }

  const shareEmail = () => {
    const subject = `Fechamento Mensal — ${empresa?.nome} — ${mesLabel}`
    const body = `Fechamento Mensal — ${empresa?.nome}\n\nCompetência: ${mesLabel}\nReceita Total: ${fmtS(tRec)}\nDespesas Totais: ${fmtS(tDesp)}\nLucro Líquido: ${fmtS(lucro)}\nMargem Líquida: ${pct(margem)}\nSaldo Inicial: ${fmtS(saldoInicial)}\nSaldo Final: ${fmtS(saldoFinal)}\n\nGerado pelo Norvo`
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
    addHistorico('compartilhamento_email', 'Compartilhado via e-mail')
  }

  const renderHistoricoList = () => historico.length === 0
    ? <EmptyState label="Nenhum evento de auditoria registrado." />
    : historico.map((h, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: `1px solid ${T.borderLight}`, alignItems: 'flex-start' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: h.tipo === 'fechamento' ? T.primaryLight : h.tipo === 'reabertura' ? 'rgba(234,88,12,0.12)' : T.blueL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
            {h.tipo === 'fechamento' ? '🔒' : h.tipo === 'reabertura' ? '🔓' : h.tipo === 'exportacao_pdf' ? '📄' : h.tipo === 'exportacao_excel' ? '📊' : h.tipo === 'compartilhamento_wa' ? '💬' : h.tipo === 'compartilhamento_email' ? '✉' : '📝'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              {h.tipo === 'fechamento' ? 'Período fechado' : h.tipo === 'reabertura' ? 'Período reaberto' : h.tipo === 'exportacao_pdf' ? 'PDF exportado' : h.tipo === 'exportacao_excel' ? 'Excel exportado' : h.tipo === 'compartilhamento_wa' ? 'Compartilhado via WhatsApp' : h.tipo === 'compartilhamento_email' ? 'Compartilhado via e-mail' : h.tipo} — {fmtComp(h.mes)}
            </div>
            <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
              Por: <strong>{h.usuario}</strong> · {new Date(h.data).toLocaleDateString('pt-BR')} às {new Date(h.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            {h.motivo && h.motivo !== 'Período fechado' && (
              <div style={{ fontSize: 12, color: T.muted, marginTop: 4, background: T.bg, borderRadius: 6, padding: '4px 8px', display: 'inline-block' }}>"{h.motivo}"</div>
            )}
          </div>
        </div>
      ))

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: T.text }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* ── MODAL: Fechar mês ── */}
      {modal === 'fechar' && (
        <Modal onClose={() => setModal(null)} title="Confirmar Fechamento do Período">
          <div style={{ background: T.primaryLight, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.primary, marginBottom: 10 }}>Resumo de {mesLabel}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['Receitas', fmtS(tRec), T.green], ['Despesas', fmtS(tDesp), T.red], ['Lucro', fmtS(lucro), lucro >= 0 ? T.green : T.red], ['Lançamentos', filteredLancs.length + ' registros', T.text]].map(([l, v, c]) => (
                <div key={l}><div style={{ fontSize: 11, color: T.sub }}>{l}</div><div style={{ fontWeight: 700, fontSize: 15, color: c }}>{v}</div></div>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 13, color: T.sub, marginBottom: 20 }}>Após o fechamento, os lançamentos deste mês ficarão bloqueados para edição. Um relatório consolidado será gerado automaticamente.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={handleFechar}>Confirmar fechamento</Btn>
          </div>
        </Modal>
      )}

      {/* ── MODAL: Reabrir mês ── */}
      {modal === 'reabrir' && (
        <Modal onClose={() => setModal(null)} title="Reabrir Período">
          <div style={{ background: 'rgba(234,88,12,0.08)', border: '1px solid #ea580c', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#ea580c' }}>⚠ Atenção</div>
            <p style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>Reabrir o mês permite edição dos lançamentos. Isso será registrado no histórico de auditoria.</p>
          </div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Motivo da reabertura *</label>
          <textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Descreva o motivo..."
            style={{ width: '100%', height: 90, padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text, background: 'var(--input-bg)', resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={handleReabrir}>Confirmar reabertura</Btn>
          </div>
        </Modal>
      )}

      {/* ── MODAL: Indicadores ── */}
      {modal === 'indicadores' && (
        <Modal onClose={() => setModal(null)} title={`Indicadores Detalhados — ${mesLabel}`} width={680}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { l: 'Receita Total', v: fmtS(tRec), c: T.green, sub: `${filteredLancs.filter(l => l.tipo === 'receita').length} lançamentos` },
              { l: 'Despesas Totais', v: fmtS(tDesp), c: T.red, sub: `${filteredLancs.filter(l => l.tipo === 'despesa').length} lançamentos` },
              { l: 'Lucro Líquido', v: fmtS(lucro), c: lucro >= 0 ? T.green : T.red, sub: lucro >= 0 ? 'Resultado positivo ✓' : 'Resultado negativo ✗' },
              { l: 'Margem Líquida', v: pct(margem), c: T.purple, sub: margem >= 30 ? 'Margem saudável ✓' : 'Abaixo do ideal' },
              { l: 'Saldo Inicial', v: fmtS(saldoInicial), c: T.blue, sub: 'Saldo de abertura' },
              { l: 'Saldo Final', v: fmtS(saldoFinal), c: T.blue, sub: saldoFinal >= saldoInicial ? 'Saldo cresceu ✓' : 'Saldo reduziu' },
              { l: 'Fluxo de Caixa', v: fmtS(tRec - tDesp), c: (tRec - tDesp) >= 0 ? T.green : T.red, sub: (tRec - tDesp) >= 0 ? 'Fluxo positivo ✓' : 'Fluxo negativo' },
              { l: 'Reserva Financeira', v: fmtS(saldoFinal * 0.15), c: '#ea580c', sub: '15% do saldo final' },
            ].map(({ l, v, c, sub }) => (
              <div key={l} style={{ background: T.bg, borderRadius: 10, padding: '14px 16px', border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 11, color: T.sub, marginBottom: 4 }}>{l}</div>
                <div style={{ fontWeight: 800, fontSize: 20, color: c, marginBottom: 4 }}>{v}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{sub}</div>
              </div>
            ))}
          </div>
          <div style={{ background: T.bg, borderRadius: 10, padding: '16px', border: `1px solid ${T.border}` }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Saúde Financeira — {saude}/100</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, background: T.borderLight, borderRadius: 8, height: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: saude >= 70 ? T.primary : saude >= 40 ? '#ea580c' : T.red, width: `${saude}%`, borderRadius: 8, transition: 'width 0.5s' }} />
              </div>
              <span style={{ fontWeight: 700, color: saude >= 70 ? T.green : saude >= 40 ? '#ea580c' : T.red }}>
                {saude >= 90 ? 'Excelente' : saude >= 70 ? 'Ótimo' : saude >= 50 ? 'Bom' : saude >= 30 ? 'Regular' : 'Atenção'}
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: Histórico ── */}
      {modal === 'historico' && (
        <Modal onClose={() => setModal(null)} title="Histórico Comparativo" width={760}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: T.sub }}>{prevMesLabel} × {mesLabel}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                {['Indicador', prevMesLabel, mesLabel, 'Variação'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: T.sub, fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compMes.map(row => {
                const v = varPct(row.cur, row.ant)
                return (
                  <tr key={row.label} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                    <td style={{ padding: '11px 10px', fontWeight: 500 }}>{row.label}</td>
                    <td style={{ padding: '11px 10px', color: T.sub }}>{row.isPct ? fmtPct(row.ant) : fmt(row.ant)}</td>
                    <td style={{ padding: '11px 10px', fontWeight: 600 }}>{row.isPct ? fmtPct(row.cur) : fmt(row.cur)}</td>
                    <td style={{ padding: '11px 10px' }}>
                      {v.pos === null ? <span style={{ color: T.muted }}>—</span>
                        : <span style={{ color: v.pos ? T.green : T.red, fontWeight: 700 }}>{v.pos ? '↑' : '↓'} {v.val}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {tRecAnt === 0 && tDespAnt === 0 && (
            <div style={{ background: T.bg, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: T.muted, marginBottom: 20 }}>
              Sem dados para {prevMesLabel}. Adicione lançamentos nesse mês para comparação automática.
            </div>
          )}
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Histórico de fechamentos</div>
          {renderHistoricoList()}
        </Modal>
      )}

      {/* ── MODAL: Categorias Receita ── */}
      {modal === 'cat_rec' && (
        <Modal onClose={() => setModal(null)} title={`Receitas por Categoria — ${mesLabel}`}>
          <CatTable data={catRecData} colors={COLORS_R} tipo="receitas" filteredLancs={filteredLancs} />
        </Modal>
      )}

      {/* ── MODAL: Categorias Despesa ── */}
      {modal === 'cat_desp' && (
        <Modal onClose={() => setModal(null)} title={`Despesas por Categoria — ${mesLabel}`}>
          <CatTable data={catDespData} colors={COLORS_D} tipo="despesas" filteredLancs={filteredLancs} />
        </Modal>
      )}

      {/* ── MODAL: Top Receitas ── */}
      {modal === 'top_rec' && (
        <Modal onClose={() => setModal(null)} title={`Top Receitas — ${mesLabel}`} width={760}>
          <TopTable items={top5Rec} cor={T.green} bg={T.primary} />
        </Modal>
      )}

      {/* ── MODAL: Top Despesas ── */}
      {modal === 'top_desp' && (
        <Modal onClose={() => setModal(null)} title={`Top Despesas — ${mesLabel}`} width={760}>
          <TopTable items={top5Desp} cor={T.red} bg={T.red} />
        </Modal>
      )}

      {/* ── MODAL: Auditoria ── */}
      {modal === 'auditoria' && (
        <Modal onClose={() => setModal(null)} title="Auditoria do Fechamento" width={680}>
          <div style={{ marginBottom: 16, padding: '12px 16px', background: T.bg, borderRadius: 8, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[['Empresa', empresa?.nome], ['Competência', mesLabel], ['Status', fechado ? 'Fechamento Concluído' : historico.some(h => h.tipo === 'reabertura') ? 'Reaberto' : 'Em Andamento'], ['Lançamentos', filteredLancs.length]].map(([l, v]) => (
              <div key={l}><div style={{ fontSize: 11, color: T.muted }}>{l}</div><div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div></div>
            ))}
          </div>
          {renderHistoricoList()}
        </Modal>
      )}

      {/* ══════════════════════════════════════════ HEADER ══════════════════════════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontWeight: 800, fontSize: 26, margin: 0 }}>Fechamento Mensal</h1>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: fechado ? T.primaryLight : (historico.some(h => h.tipo === 'reabertura') ? 'rgba(220,38,38,0.10)' : 'rgba(202,138,4,0.10)'),
              color: fechado ? T.green : (historico.some(h => h.tipo === 'reabertura') ? T.red : '#ca8a04'),
            }}>
              {fechado ? '🟢 Fechamento Concluído' : historico.some(h => h.tipo === 'reabertura') ? '🔴 Reaberto' : '🟡 Em Andamento'}
            </span>
          </div>
          <div style={{ color: T.sub, fontSize: 14 }}>Consolidação financeira, auditoria e relatórios do período.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <CompetenciaSelector {...comp} onChange={setComp} />
          <Btn variant="ghost" icon="↑" onClick={exportPDF}>PDF</Btn>
          <Btn variant="ghost" icon="📊" onClick={exportExcel}>Excel</Btn>
          <button onClick={shareWA} style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>WhatsApp</button>
          <button onClick={shareEmail} style={{ background: T.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>E-mail</button>
          {!fechado
            ? <Btn onClick={() => setModal('fechar')}>Fechar período</Btn>
            : <Btn variant="ghost" onClick={() => setModal('reabrir')}>Reabrir período</Btn>
          }
        </div>
      </div>

      {/* ── Filtros ── */}
      <div style={{ background: T.white, borderRadius: 10, padding: '10px 14px', border: `1px solid ${T.border}`, marginBottom: 18, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>Filtros:</span>

        <select value={fTipo} onChange={e => setFTipo(e.target.value)} style={{ padding: '6px 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 12, color: T.text, background: 'var(--input-bg)', cursor: 'pointer' }}>
          <option value="">Todos os tipos</option>
          <option value="receita">Receita</option>
          <option value="despesa">Despesa</option>
        </select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ padding: '6px 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 12, color: T.text, background: 'var(--input-bg)', cursor: 'pointer' }}>
          <option value="">Todos os status</option>
          {['Recebida','A receber','Pago','A Pagar','Pendente','Atrasado'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={fCat} onChange={e => setFCat(e.target.value)} style={{ padding: '6px 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 12, color: T.text, background: 'var(--input-bg)', cursor: 'pointer' }}>
          <option value="">Todas as categorias</option>
          {allCats.map(c => <option key={c}>{c}</option>)}
        </select>

        {(mesAno !== '2026-05' || fTipo || fCat || fStatus || dateRange || activePreset) && (
          <button onClick={() => { setComp({ ...COMPETENCIA_DEFAULT, mesAno: '2026-05' }); setFTipo(''); setFCat(''); setFStatus('') }}
            style={{ background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            Limpar filtros
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: T.muted }}>{filteredLancs.length} lançamentos no período</span>
      </div>

      {/* ── KPIs ── */}
      <div className="g-6">
        {[
          { label: 'Receita Total', value: fmt(tRec), cor: T.green, icon: '↑', bg: T.primaryLight },
          { label: 'Despesas Totais', value: fmt(tDesp), cor: T.red, icon: '↓', bg: T.redL },
          { label: 'Lucro Líquido', value: fmt(lucro), cor: lucro >= 0 ? T.green : T.red, icon: '$', bg: T.blueL },
          { label: 'Margem Líquida', value: pct(margem), cor: T.purple, icon: '%', bg: T.purpleL },
          { label: 'Saldo Inicial', value: fmt(saldoInicial), cor: '#ea580c', icon: '🏦', bg: T.orangeL },
          { label: 'Saldo Final', value: fmt(saldoFinal), cor: T.blue, icon: '🏦', bg: T.blueL },
        ].map(item => (
          <Card key={item.label} style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ background: item.bg, borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{item.icon}</div>
              <span style={{ fontSize: 11, color: T.sub }}>{item.label}</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: 17, color: item.cor }}>{item.value}</div>
          </Card>
        ))}
      </div>

      {/* ── Saúde + Comparativo ── */}
      <div className="g-2">
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Saúde Financeira</div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke={T.borderLight} strokeWidth="10" />
                <circle cx="60" cy="60" r="50" fill="none" stroke={saude >= 70 ? T.primary : saude >= 40 ? '#ea580c' : T.red} strokeWidth="10"
                  strokeDasharray={`${saude * 3.14} 314`} strokeLinecap="round" transform="rotate(-90 60 60)" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: 28, color: T.text }}>{saude}</div>
                <div style={{ fontSize: 12, color: T.muted }}>/100</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: T.primary, marginBottom: 12 }}>
                {saude >= 90 ? 'Excelente' : saude >= 70 ? 'Ótimo' : saude >= 50 ? 'Bom' : 'Atenção'}
              </div>
              {[['Fluxo de caixa positivo', tRec > tDesp], ['Despesas conciliadas', tDesp > 0], ['Receita positiva', tRec > 0], ['Saldo cresceu no mês', saldoFinal >= saldoInicial]].map(([txt, ok]) => (
                <div key={txt} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 13 }}>
                  <span style={{ color: ok ? T.green : T.red }}>{ok ? '✓' : '✗'}</span>
                  <span style={{ color: ok ? T.text : T.muted }}>{txt}</span>
                </div>
              ))}
              <button onClick={() => setModal('indicadores')} style={{ background: 'none', border: `1px solid ${T.primary}`, color: T.primary, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, marginTop: 8, fontFamily: 'inherit' }}>
                Ver detalhes dos indicadores →
              </button>
            </div>
          </div>
        </Card>

        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Comparativo com mês anterior</div>
            <button onClick={() => setModal('historico')} style={{ background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>Ver histórico →</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {['Indicador', prevMesLabel, mesLabel, 'Var.'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: T.sub, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compMes.map(row => {
                const v = varPct(row.cur, row.ant)
                return (
                  <tr key={row.label} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                    <td style={{ padding: '9px 8px', fontWeight: 500, fontSize: 12 }}>{row.label}</td>
                    <td style={{ padding: '9px 8px', color: T.sub, fontSize: 12 }}>{row.isPct ? fmtPct(row.ant) : fmt(row.ant)}</td>
                    <td style={{ padding: '9px 8px', fontWeight: 600, fontSize: 12 }}>{row.isPct ? fmtPct(row.cur) : fmt(row.cur)}</td>
                    <td style={{ padding: '9px 8px' }}>
                      {v.pos === null ? <span style={{ color: T.muted, fontSize: 12 }}>—</span>
                        : <span style={{ color: v.pos ? T.green : T.red, fontWeight: 600, fontSize: 12 }}>{v.pos ? '↑' : '↓'} {v.val}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {/* ── Categorias (gráficos) ── */}
      <div className="g-2">
        {[
          { title: 'Receitas por categoria', data: catRecData, colors: COLORS_R, total: tRec, tipo: 'cat_rec', cor: T.green },
          { title: 'Despesas por categoria', data: catDespData, colors: COLORS_D, total: tDesp, tipo: 'cat_desp', cor: T.red },
        ].map(({ title, data, colors, total, tipo, cor }) => (
          <Card key={title} style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
              <button onClick={() => setModal(tipo)} style={{ background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>Ver detalhes ›</button>
            </div>
            {data.length === 0
              ? <EmptyState label="Sem dados no período selecionado." />
              : (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <PieChart width={140} height={140}>
                      <Pie data={data} cx={70} cy={70} innerRadius={40} outerRadius={65} dataKey="v" startAngle={90} endAngle={-270}>
                        {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                      </Pie>
                    </PieChart>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <div style={{ fontSize: 10, color: T.muted }}>Total</div>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>{fmtS(total)}</div>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {data.slice(0, 5).map((d, i) => (
                      <div key={d.n} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i % colors.length], flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.n}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <span style={{ color: T.muted }}>{d.pct}%</span>
                          <span style={{ fontWeight: 600, color: cor, minWidth: 64, textAlign: 'right' }}>{fmt(d.v)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </Card>
        ))}
      </div>

      {/* ── Top 5 ── */}
      <div className="g-2">
        {[
          { title: 'Top 5 Receitas', items: top5Rec.slice(0, 5), cor: T.green, bg: T.primary, type: 'top_rec' },
          { title: 'Top 5 Despesas', items: top5Desp.slice(0, 5), cor: T.red, bg: T.red, type: 'top_desp' },
        ].map(({ title, items, cor, bg, type }) => (
          <Card key={title} style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
              <button onClick={() => setModal(type)} style={{ background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>Ver todas ›</button>
            </div>
            {items.length === 0
              ? <EmptyState label="Sem lançamentos no período." />
              : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {['#','Descrição','Categoria','Valor'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: T.sub, fontSize: 11 }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((l, i) => (
                      <tr key={l.id} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                        <td style={{ padding: '9px 8px' }}>
                          <div style={{ background: bg, color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{i + 1}</div>
                        </td>
                        <td style={{ padding: '9px 8px', fontWeight: 500 }}>{l.desc}</td>
                        <td style={{ padding: '9px 8px', color: T.sub, fontSize: 12 }}>{l.catNome}</td>
                        <td style={{ padding: '9px 8px', fontWeight: 700, color: cor }}>{fmt(l.valor)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: `2px solid ${T.border}` }}>
                      <td colSpan={3} style={{ padding: '9px 8px', fontWeight: 700, fontSize: 12, color: T.sub }}>Total do Top 5</td>
                      <td style={{ padding: '9px 8px', fontWeight: 800, color: cor }}>{fmt(items.reduce((s, l) => s + l.valor, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              )}
          </Card>
        ))}
      </div>

      {/* ── Fluxo + Painel de Ações ── */}
      <div className="g-side">
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Fluxo de Caixa — {mesLabel}</div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
            {[['Entradas', T.green], ['Saídas', T.red], ['Saldo', T.primary]].map(([l, c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: T.sub }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={fluxoData.filter((_, i) => i % 3 === 0)} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="dia" tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.muted, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} />
              <Tooltip formatter={v => fmt(v)} contentStyle={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="entradas" fill={T.green} opacity={0.8} radius={[2,2,0,0]} maxBarSize={10} />
              <Bar dataKey="saidas" fill={T.red} opacity={0.8} radius={[2,2,0,0]} maxBarSize={10} />
              <Line type="monotone" dataKey="saldo" stroke={T.primary} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Ações do período</div>
          {[
            { label: fechado ? 'Reabrir período' : 'Fechar período', icon: fechado ? '🔓' : '🔒', action: () => setModal(fechado ? 'reabrir' : 'fechar'), cor: fechado ? '#ea580c' : T.primary, bg: fechado ? 'rgba(234,88,12,0.10)' : T.primaryLight },
            { label: 'Abrir relatório PDF', icon: '📄', action: exportPDF, cor: T.blue, bg: T.blueL },
            { label: 'Exportar Excel', icon: '📊', action: exportExcel, cor: T.green, bg: T.primaryLight },
            { label: 'Compartilhar WhatsApp', icon: '💬', action: shareWA, cor: '#25D366', bg: 'rgba(37,211,102,0.10)' },
            { label: 'Compartilhar E-mail', icon: '✉', action: shareEmail, cor: T.blue, bg: T.blueL },
            { label: 'Ver histórico', icon: '📅', action: () => setModal('historico'), cor: T.purple, bg: T.purpleL },
            { label: 'Auditoria', icon: '🔍', action: () => setModal('auditoria'), cor: T.sub, bg: T.borderLight },
          ].map(({ label, icon, action, cor, bg }) => (
            <button key={label} onClick={action}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', background: bg, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: cor, marginBottom: 6, textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.94)'}
              onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
              <span>{icon}</span> {label}
            </button>
          ))}
        </Card>
      </div>
    </div>
  )
}
