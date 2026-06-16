import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { T, fmtS } from '../theme'
import { Card, Btn, KpiCard } from '../components/ui'
import { CATS_DESPESA } from '../data'

const PERIODOS = ['Este Mês', 'Mês Anterior', 'Últimos 3 Meses', 'Últimos 6 Meses', 'Este Ano', 'Personalizado']
const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const exportCSV = (lancamentos, empNome) => {
  const headers = ['Tipo','Descrição','Valor','Data','Categoria','Status','Vencimento','Forma','Conta','Cliente','Fornecedor','Centro de Custo']
  const rows = lancamentos.map(l => [l.tipo, l.desc, l.valor, l.data, l.catNome, l.status, l.vencimento, l.forma, l.conta, l.cliente, l.fornecedor, l.centroCusto])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v || ''}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `relatorio_${empNome}_${new Date().toISOString().slice(0,10)}.csv`; a.click()
  URL.revokeObjectURL(url)
}

const exportExcel = (lancamentos, empNome) => {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(lancamentos.map(l => ({
    Tipo: l.tipo, Descrição: l.desc, Valor: l.valor, Data: l.data,
    Categoria: l.catNome, Status: l.status, Forma: l.forma,
    Conta: l.conta, Cliente: l.cliente, Fornecedor: l.fornecedor,
  })))
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório')
  XLSX.writeFile(wb, `relatorio_${empNome}_${new Date().toISOString().slice(0,10)}.xlsx`)
}

const RELATORIOS = [
  { id: 'fluxo', icon: '💰', title: 'Fluxo de Caixa', desc: 'Resumo completo das entradas e saídas de dinheiro.', page: 'fluxo' },
  { id: 'dre', icon: '📋', title: 'Demonstrativo de Resultado (DRE)', desc: 'Receita, custos e despesas para análise de resultado.', page: null },
  { id: 'pagar', icon: '📤', title: 'Contas a Pagar', desc: 'Lista de contas vencidas, pagas e pendentes.', page: 'contas_pagar' },
  { id: 'receber', icon: '📥', title: 'Contas a Receber', desc: 'Lista de recebimentos previstos e recebidos.', page: 'contas_receber' },
  { id: 'cat', icon: '🏷', title: 'Relatório por Categoria', desc: 'Desempenho financeiro detalhado por categoria.', page: null },
  { id: 'cc', icon: '⚙', title: 'Relatório por Centro de Custo', desc: 'Análise financeira por centro de custo.', page: 'centro_custo' },
]

export default function Relatorios({ empresa, data, setPage }) {
  const lancamentos = data.lancamentos || []
  const [periodo, setPeriodo] = useState('Este Mês')
  const [catFiltro, setCatFiltro] = useState('Todas')
  const [tipo, setTipo] = useState('Todos os tipos')

  const totalReceitas = useMemo(() => lancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0), [lancamentos])
  const totalDespesas = useMemo(() => lancamentos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0), [lancamentos])
  const lucro = totalReceitas - totalDespesas

  const monthlyData = useMemo(() => {
    const map = {}
    lancamentos.forEach(l => {
      if (!l.data) return
      const m = l.data.slice(0, 7)
      if (!map[m]) map[m] = { Receitas: 0, Despesas: 0 }
      if (l.tipo === 'receita') map[m].Receitas += l.valor
      else map[m].Despesas += l.valor
    })
    return Object.entries(map).sort().slice(-6).map(([m, v]) => {
      const [y, mo] = m.split('-')
      return { mes: MESES_PT[parseInt(mo) - 1] + '/' + y.slice(2), ...v }
    })
  }, [lancamentos])

  const pieData = useMemo(() => {
    const map = {}
    lancamentos.filter(l => l.tipo === 'despesa').forEach(l => {
      const k = l.catNome || 'Outros'
      map[k] = (map[k] || 0) + l.valor
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }))
  }, [lancamentos])

  const PIE_COLORS = [T.blue, T.purple, T.orange, T.red, T.green, T.cyan]

  const sel = { background: T.primaryLight, color: T.primary, borderColor: T.primary }
  const unsel = { background: 'transparent', color: T.sub, borderColor: T.border }

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: T.text }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Relatórios</h1>
          <div style={{ color: T.sub, fontSize: 14 }}>Relatórios completos com filtros avançados, exportação em Excel e CSV.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="outline" onClick={() => exportExcel(lancamentos, empresa.nome)} icon="📊">Exportar Excel</Btn>
          <Btn variant="outline" onClick={() => exportCSV(lancamentos, empresa.nome)} icon="⬇">Exportar CSV</Btn>
        </div>
      </div>

      {/* Filtros */}
      <Card style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Filtros avançados</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, alignItems: 'end' }}>
          {[
            { label: 'Período', value: periodo, opts: PERIODOS, set: setPeriodo },
            { label: 'Categoria', value: catFiltro, opts: ['Todas', ...CATS_DESPESA.map(c => c.nome)], set: setCatFiltro },
            { label: 'Tipo', value: tipo, opts: ['Todos os tipos', 'Receitas', 'Despesas'], set: setTipo },
          ].map(f => (
            <div key={f.label}>
              <label style={{ display: 'block', fontSize: 12, color: T.sub, marginBottom: 4, fontWeight: 600 }}>{f.label}</label>
              <select value={f.value} onChange={e => f.set(e.target.value)}
                style={{ width: '100%', background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', color: T.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
                {f.opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <Btn style={{ alignSelf: 'flex-end' }}>Gerar Relatório</Btn>
        </div>
      </Card>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <KpiCard icon="💵" iconBg={T.greenL} label="Receitas" value={fmtS(totalReceitas)} delta={0} />
        <KpiCard icon="💸" iconBg={T.redL} label="Despesas" value={fmtS(totalDespesas)} delta={0} />
        <KpiCard icon="📈" iconBg={T.blueL} label="Lucro" value={fmtS(lucro)} delta={0} />
        <KpiCard icon="🏦" iconBg={T.yellowL} label="Fluxo de Caixa" value={fmtS(lucro)} delta={0} />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 18, marginBottom: 20 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Receitas x Despesas</div>
            <select style={{ fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 8px', background: T.white, color: T.text, fontFamily: 'inherit' }}>
              <option>Mensal</option>
            </select>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barCategoryGap="30%">
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => fmtS(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${T.border}` }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Receitas" fill={T.green} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill={T.red} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 14 }}>
              Nenhum lançamento para exibir
            </div>
          )}
        </Card>

        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Despesas por Categoria</div>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => fmtS(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${T.border}` }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {pieData.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ color: T.sub }}>{d.name}</span>
                    </div>
                    <span style={{ fontWeight: 600 }}>{totalDespesas > 0 ? Math.round(d.value / totalDespesas * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 14 }}>
              Nenhuma despesa registrada
            </div>
          )}
        </Card>
      </div>

      {/* Relatórios disponíveis */}
      <Card style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Relatórios disponíveis</div>
        <div style={{ color: T.sub, fontSize: 13, marginBottom: 18 }}>Acesse relatórios detalhados por tipo</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {RELATORIOS.map(r => (
            <div key={r.id} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{r.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{r.title}</div>
              <div style={{ color: T.sub, fontSize: 12, marginBottom: 14 }}>{r.desc}</div>
              <button
                onClick={() => r.page && setPage(r.page)}
                style={{ color: T.primary, fontWeight: 600, fontSize: 13, background: 'none', border: 'none', cursor: r.page ? 'pointer' : 'default', padding: 0, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                Visualizar →
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* IA */}
      <Card style={{ padding: 24, background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 40 }}>🤖</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Relatório Inteligente por IA</span>
                <span style={{ background: T.primary, color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 6px' }}>BETA</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Análise automática do seu desempenho financeiro com insights personalizados.</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, maxWidth: 320 }}>
            {[
              { icon: '📈', text: 'Suas despesas aumentaram 18% este mês em comparação ao mês anterior.' },
              { icon: '🏷', text: 'O principal crescimento ocorreu na categoria Marketing (+35%).' },
              { icon: '💡', text: 'O lucro líquido caiu 7% em relação ao mês anterior.' },
            ].map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
                <span>{tip.icon}</span><span>{tip.text}</span>
              </div>
            ))}
          </div>
          <Btn style={{ background: T.primary, color: '#fff', whiteSpace: 'nowrap' }} icon="✨">Gerar Análise Inteligente</Btn>
        </div>
      </Card>
    </div>
  )
}
