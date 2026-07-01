import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'
import { T, fmt, fmtS, fd } from '../../theme'
import { Card, Btn, EmptyState } from '../../components/ui'
import { PageHeader } from '../pfui'
import { tipoContaLabel, investTypeLabel, statusDividaInfo, statusMetaInfo } from '../../personalData'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const catInfo = (cats, id) => (cats || []).find(c => c.id === id)

function porCategoria(txs, tipo, cats) {
  const map = {}
  txs.filter(t => t.tipo === tipo).forEach(t => { map[t.categoria] = (map[t.categoria] || 0) + (t.valor || 0) })
  return Object.entries(map).map(([id, v]) => ({ nome: catInfo(cats, id)?.nome || id, cor: catInfo(cats, id)?.cor || T.muted, valor: v })).sort((a, b) => b.valor - a.valor)
}

export default function PersonalRelatorios({ transactions, accounts, investments, debts, goals, catsReceita = [], catsDespesa = [] }) {
  const mesAtual = new Date().toISOString().slice(0, 7)
  const [de, setDe] = useState(mesAtual)
  const [ate, setAte] = useState(mesAtual)

  const noPeriodo = useMemo(() => {
    const ini = de <= ate ? de : ate
    const fim = de <= ate ? ate : de
    return transactions.filter(t => { const comp = (t.data || '').slice(0, 7); return comp >= ini && comp <= fim })
  }, [transactions, de, ate])

  const rec = useMemo(() => noPeriodo.filter(t => t.tipo === 'receita').reduce((s, t) => s + (t.valor || 0), 0), [noPeriodo])
  const desp = useMemo(() => noPeriodo.filter(t => t.tipo === 'despesa').reduce((s, t) => s + (t.valor || 0), 0), [noPeriodo])
  const saldo = rec - desp

  const recCat = useMemo(() => porCategoria(noPeriodo, 'receita', catsReceita), [noPeriodo, catsReceita])
  const despCat = useMemo(() => porCategoria(noPeriodo, 'despesa', catsDespesa), [noPeriodo, catsDespesa])
  const topDesp = useMemo(() => [...noPeriodo].filter(t => t.tipo === 'despesa').sort((a, b) => b.valor - a.valor).slice(0, 5), [noPeriodo])

  // Evolução mensal dentro do range (por competência)
  const evolucao = useMemo(() => {
    const map = {}
    noPeriodo.forEach(t => {
      const comp = (t.data || '').slice(0, 7); if (!comp) return
      if (!map[comp]) map[comp] = { receitas: 0, despesas: 0 }
      map[comp][t.tipo === 'receita' ? 'receitas' : 'despesas'] += t.valor || 0
    })
    return Object.entries(map).sort().map(([comp, v]) => { const [y, mo] = comp.split('-'); return { mes: `${MESES[+mo - 1]}/${y.slice(2)}`, ...v, saldo: v.receitas - v.despesas } })
  }, [noPeriodo])

  const totalInvest = useMemo(() => investments.reduce((s, i) => s + (i.current || 0), 0), [investments])
  const totalDividas = useMemo(() => debts.filter(d => d.status !== 'quitada').reduce((s, d) => s + (d.remaining || 0), 0), [debts])
  const metasAtivas = useMemo(() => goals.filter(g => g.status === 'ativa'), [goals])
  const contasBanco = useMemo(() => accounts.map(a => ({ nome: a.nome, banco: a.banco, tipo: a.tipo, saldo: a.saldoAtual })).sort((a, b) => b.saldo - a.saldo), [accounts])

  const Section = ({ title, children }) => (
    <Card style={{ padding: 20, marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: T.text }}>{title}</div>
      {children}
    </Card>
  )
  const CatList = ({ data, cor }) => data.length === 0 ? <EmptyState icon="—" title="Sem dados no período" /> : (
    <div>
      {data.map((c, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${T.borderLight}`, fontSize: 13 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: c.cor, flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</span></span>
          <span style={{ fontWeight: 700, color: cor, flexShrink: 0 }}>{fmt(c.valor)}</span>
        </div>
      ))}
    </div>
  )

  const contaNome = (id) => accounts.find(a => a.id === id)?.nome || ''
  const periodoLabel = () => {
    const f = (m) => { const [y, mo] = m.split('-'); return `${MESES[+mo - 1]}/${y}` }
    const ini = de <= ate ? de : ate, fim = de <= ate ? ate : de
    return ini === fim ? f(ini) : `${f(ini)} a ${f(fim)}`
  }

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['RELATÓRIO FINANCEIRO — PESSOA FÍSICA'],
      ['Período', periodoLabel()],
      ['Gerado em', new Date().toLocaleString('pt-BR')],
      [],
      ['Indicador', 'Valor'],
      ['Receitas', rec], ['Despesas', desp], ['Saldo do período', saldo],
      ['Investimentos (atual)', totalInvest], ['Dívidas (saldo devedor)', totalDividas],
      ['Metas ativas', metasAtivas.length],
    ]), 'Resumo')
    const jsonSheet = (rows, empty) => XLSX.utils.json_to_sheet(rows.length ? rows : [empty])
    XLSX.utils.book_append_sheet(wb, jsonSheet(
      noPeriodo.filter(t => t.tipo === 'receita').map(t => ({ Data: t.data, Categoria: catInfo(catsReceita, t.categoria)?.nome || t.categoria, Descrição: t.desc, Conta: contaNome(t.accountId), Status: t.status, Valor: t.valor })),
      { Data: '', Categoria: '', Descrição: 'Sem receitas no período', Conta: '', Status: '', Valor: 0 }), 'Receitas')
    XLSX.utils.book_append_sheet(wb, jsonSheet(
      noPeriodo.filter(t => t.tipo === 'despesa').map(t => ({ Data: t.data, Categoria: catInfo(catsDespesa, t.categoria)?.nome || t.categoria, Descrição: t.desc, Conta: contaNome(t.accountId), Forma: t.forma, Status: t.status, Valor: t.valor })),
      { Data: '', Categoria: '', Descrição: 'Sem despesas no período', Conta: '', Forma: '', Status: '', Valor: 0 }), 'Despesas')
    XLSX.utils.book_append_sheet(wb, jsonSheet(
      investments.map(i => ({ Nome: i.name, Tipo: investTypeLabel(i.type), Instituição: i.institution, Aplicado: i.invested, Atual: i.current, 'Rentab. (%)': i.profitability ?? '', Aplicação: i.date })),
      { Nome: 'Sem investimentos', Tipo: '', Instituição: '', Aplicado: 0, Atual: 0, 'Rentab. (%)': '', Aplicação: '' }), 'Investimentos')
    XLSX.utils.book_append_sheet(wb, jsonSheet(
      debts.map(d => ({ Credor: d.creditor, Descrição: d.description, Total: d.total, 'Saldo devedor': d.remaining, Parcelas: d.installmentsTotal ? `${d.installmentsPaid}/${d.installmentsTotal}` : '', Status: statusDividaInfo(d.status).label })),
      { Credor: 'Sem dívidas', Descrição: '', Total: 0, 'Saldo devedor': 0, Parcelas: '', Status: '' }), 'Dívidas')
    XLSX.utils.book_append_sheet(wb, jsonSheet(
      goals.map(g => ({ Meta: g.name, Categoria: g.category, Alvo: g.target, Atual: g.current, 'Progresso (%)': g.target > 0 ? Math.round(g.current / g.target * 100) : 0, Prazo: g.deadline, Status: statusMetaInfo(g.status).label })),
      { Meta: 'Sem metas', Categoria: '', Alvo: 0, Atual: 0, 'Progresso (%)': 0, Prazo: '', Status: '' }), 'Metas')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Tipo', 'Categoria', 'Valor'],
      ...recCat.map(c => ['Receita', c.nome, c.valor]),
      ...despCat.map(c => ['Despesa', c.nome, c.valor]),
    ]), 'Categorias')
    XLSX.writeFile(wb, `relatorio_pessoal_${de}_${ate}.xlsx`)
  }

  const exportPDF = () => {
    const row = (l, cats) => `<tr><td>${fd(l.data)}</td><td>${catInfo(cats, l.categoria)?.nome || l.categoria || ''}</td><td>${l.desc || ''}</td><td style="text-align:right">${fmt(l.valor)}</td></tr>`
    const catRows = (arr) => arr.map(c => `<tr><td>${c.nome}</td><td style="text-align:right">${fmt(c.valor)}</td></tr>`).join('') || '<tr><td colspan="2" style="color:#999">Sem dados</td></tr>'
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório Financeiro Pessoa Física</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#111827;font-size:13px}
.hdr{background:#0D2545;color:#fff;padding:20px 32px}.logo{font-size:22px;font-weight:900}.logo span{color:#F47B20}
.body{padding:24px 32px}.st{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin:20px 0 12px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}.kpi{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px}
.kl{font-size:10px;color:#6b7280}.kv{font-size:17px;font-weight:800}.g{color:#16a34a}.r{color:#dc2626}.b{color:#2563eb}
table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f3f4f6;padding:6px 9px;text-align:left;color:#6b7280;font-size:11px}
td{padding:6px 9px;border-bottom:1px solid #f3f4f6}.ftr{padding:14px 32px;text-align:center;font-size:10px;color:#9ca3af}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.hdr{background:#0D2545!important}}</style></head><body>
<div class="hdr"><div class="logo">Norvo <span>Pessoal</span></div><div style="font-size:13px;margin-top:4px;opacity:.85">Relatório Financeiro Pessoa Física</div></div>
<div class="body">
<div style="display:flex;justify-content:space-between;color:#6b7280;font-size:12px"><span>Período: <strong style="color:#111">${periodoLabel()}</strong></span><span>Gerado em ${new Date().toLocaleString('pt-BR')}</span></div>
<div class="st">Resumo do período</div>
<div class="g3">
<div class="kpi"><div class="kl">Receitas</div><div class="kv g">${fmt(rec)}</div></div>
<div class="kpi"><div class="kl">Despesas</div><div class="kv r">${fmt(desp)}</div></div>
<div class="kpi"><div class="kl">Saldo</div><div class="kv ${saldo >= 0 ? 'g' : 'r'}">${fmt(saldo)}</div></div>
<div class="kpi"><div class="kl">Investimentos</div><div class="kv b">${fmt(totalInvest)}</div></div>
<div class="kpi"><div class="kl">Dívidas</div><div class="kv r">${fmt(totalDividas)}</div></div>
<div class="kpi"><div class="kl">Metas em andamento</div><div class="kv">${metasAtivas.length}</div></div>
</div>
<div class="st">Receitas por categoria</div><table><tbody>${catRows(recCat)}</tbody></table>
<div class="st">Despesas por categoria</div><table><tbody>${catRows(despCat)}</tbody></table>
<div class="st">Top 5 despesas</div><table><thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th style="text-align:right">Valor</th></tr></thead><tbody>${topDesp.map(t => row(t, catsDespesa)).join('') || '<tr><td colspan="4" style="color:#999">Sem despesas</td></tr>'}</tbody></table>
<div class="st">Metas em andamento</div><table><tbody>${metasAtivas.map(g => `<tr><td>${g.name}</td><td style="text-align:right">${fmt(g.current)} / ${fmt(g.target)} (${g.target > 0 ? Math.round(g.current / g.target * 100) : 0}%)</td></tr>`).join('') || '<tr><td colspan="2" style="color:#999">Nenhuma meta ativa</td></tr>'}</tbody></table>
</div>
<div class="ftr">Gerado pelo Norvo Pessoal · Documento pessoal</div>
</body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html); w.document.close()
    setTimeout(() => w.print(), 500)
  }

  const inputStyle = { background: 'var(--card)', border: `1.5px solid var(--border)`, borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'inherit' }

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Sua visão financeira consolidada por período."
        right={<div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div><label style={{ display: 'block', fontSize: 11, color: T.sub, fontWeight: 600, marginBottom: 4 }}>De</label><input type="month" value={de} onChange={e => setDe(e.target.value)} style={inputStyle} /></div>
          <div><label style={{ display: 'block', fontSize: 11, color: T.sub, fontWeight: 600, marginBottom: 4 }}>Até</label><input type="month" value={ate} onChange={e => setAte(e.target.value)} style={inputStyle} /></div>
          <Btn variant="ghost" icon="📄" onClick={exportPDF}>PDF</Btn>
          <Btn variant="ghost" icon="📊" onClick={exportExcel}>Excel</Btn>
        </div>} />

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
        <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Receitas</div><div style={{ fontWeight: 800, fontSize: 21, color: T.green, marginTop: 4 }}>{fmt(rec)}</div></Card>
        <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Despesas</div><div style={{ fontWeight: 800, fontSize: 21, color: T.red, marginTop: 4 }}>{fmt(desp)}</div></Card>
        <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Saldo do período</div><div style={{ fontWeight: 800, fontSize: 21, color: saldo >= 0 ? T.green : T.red, marginTop: 4 }}>{fmt(saldo)}</div></Card>
        <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Investimentos</div><div style={{ fontWeight: 800, fontSize: 21, color: T.blue, marginTop: 4 }}>{fmt(totalInvest)}</div></Card>
        <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Dívidas</div><div style={{ fontWeight: 800, fontSize: 21, color: T.orange, marginTop: 4 }}>{fmt(totalDividas)}</div></Card>
      </div>

      <Section title="Evolução mensal">
        {evolucao.length === 0 ? <EmptyState icon="📊" title="Sem lançamentos no período" /> : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={evolucao} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <XAxis dataKey="mes" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} />
              <Tooltip formatter={v => fmt(v)} contentStyle={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="receitas" name="Receitas" fill={T.green} radius={[3, 3, 0, 0]} maxBarSize={26} />
              <Bar dataKey="despesas" name="Despesas" fill={T.red} radius={[3, 3, 0, 0]} maxBarSize={26} />
              <Line type="monotone" dataKey="saldo" name="Saldo" stroke={T.primary} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Despesas por categoria</div>
          {despCat.length === 0 ? <EmptyState icon="🧾" title="Sem despesas no período" /> : (
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <PieChart width={150} height={150}><Pie data={despCat} cx={72} cy={72} innerRadius={42} outerRadius={68} dataKey="valor" nameKey="nome">{despCat.map((c, i) => <Cell key={i} fill={c.cor} />)}</Pie><Tooltip formatter={v => fmt(v)} contentStyle={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} /></PieChart>
              <div style={{ flex: 1, minWidth: 140 }}><CatList data={despCat.slice(0, 6)} cor={T.red} /></div>
            </div>
          )}
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Receitas por categoria</div>
          <CatList data={recCat} cor={T.green} />
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Section title="Top 5 despesas">
          {topDesp.length === 0 ? <EmptyState icon="—" title="Sem despesas no período" /> : topDesp.map((t, i) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.borderLight}`, fontSize: 13 }}>
              <span style={{ minWidth: 0 }}><strong>{i + 1}.</strong> {t.desc || catInfo(catsDespesa, t.categoria)?.nome || t.categoria} <span style={{ color: T.muted, fontSize: 12 }}>· {fd(t.data)}</span></span>
              <span style={{ fontWeight: 700, color: T.red, flexShrink: 0 }}>{fmt(t.valor)}</span>
            </div>
          ))}
        </Section>
        <Section title="Contas por banco">
          {contasBanco.length === 0 ? <EmptyState icon="🏦" title="Nenhuma conta cadastrada" /> : contasBanco.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.borderLight}`, fontSize: 13 }}>
              <span>{c.nome} <span style={{ color: T.muted, fontSize: 12 }}>· {c.banco || tipoContaLabel(c.tipo)}</span></span>
              <span style={{ fontWeight: 700, color: c.saldo >= 0 ? T.green : T.red }}>{fmt(c.saldo)}</span>
            </div>
          ))}
        </Section>
      </div>

      <Section title={`Metas em andamento (${metasAtivas.length})`}>
        {metasAtivas.length === 0 ? <EmptyState icon="🎯" title="Nenhuma meta ativa" /> : metasAtivas.map(g => {
          const pct = g.target > 0 ? Math.min(100, Math.round((g.current || 0) / g.target * 100)) : 0
          return (
            <div key={g.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span style={{ fontWeight: 600 }}>{g.name}</span><span style={{ color: T.muted }}>{fmtS(g.current)} / {fmtS(g.target)} ({pct}%)</span></div>
              <div style={{ background: T.borderLight, borderRadius: 5, height: 8, overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? T.green : T.primary }} /></div>
            </div>
          )
        })}
      </Section>
    </div>
  )
}
