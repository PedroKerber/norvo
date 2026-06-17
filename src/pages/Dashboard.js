import { useMemo, useState } from 'react'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Bar, Line } from 'recharts'
import { T, fmt, fmtS, fmtPct } from '../theme'
import { genFluxoCaixaData } from '../data'
import { Card, KpiCard, Badge } from '../components/ui'
import AdvancedFilters, { defaultFilter, filterLancamentos, loadSavedFilter } from '../components/AdvancedFilters'

const COLORS_PIE = ['#2563eb', '#dc2626', '#7c3aed', '#16a34a', '#ea580c', '#0891b2']

export default function Dashboard({ empresa, data, setPage, onNova }) {
  const [filter, setFilter] = useState(() => loadSavedFilter('x8_filter_dashboard') || defaultFilter())

  const lancs = useMemo(() => data.lancamentos || [], [data.lancamentos])
  const filteredLancs = useMemo(() => filterLancamentos(lancs, filter), [lancs, filter])

  const tRec = useMemo(() => filteredLancs.filter(l => l.tipo === 'receita' && l.status === 'Recebida').reduce((s, l) => s + l.valor, 0), [filteredLancs])
  const tRecPrev = useMemo(() => filteredLancs.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0), [filteredLancs])
  const tDesp = useMemo(() => filteredLancs.filter(l => l.tipo === 'despesa' && l.status === 'Paga').reduce((s, l) => s + l.valor, 0), [filteredLancs])
  const lucro = tRec - tDesp
  const margem = tRec > 0 ? (lucro / tRec) * 100 : 0
  const saldoCaixa = tRec - tDesp

  const fluxoData = useMemo(() => genFluxoCaixaData(filteredLancs), [filteredLancs])
  const fluxoResumo = fluxoData.reduce((acc, d) => ({ e: acc.e + d.entradas, s: acc.s + d.saidas }), { e: 0, s: 0 })

  const despCats = useMemo(() => {
    const map = {}
    filteredLancs.filter(l => l.tipo === 'despesa').forEach(l => {
      map[l.catNome] = (map[l.catNome] || 0) + l.valor
    })
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1
    return Object.entries(map).map(([n, v]) => ({ n, v, pct: Math.round(v / total * 100) })).sort((a, b) => b.v - a.v).slice(0, 6)
  }, [filteredLancs])

  const receitasAReceber = filteredLancs.filter(l => l.tipo === 'receita' && l.status === 'A receber').reduce((s, l) => s + l.valor, 0)
  const receitasAtrasadas = filteredLancs.filter(l => l.tipo === 'receita' && l.status === 'Atrasada').reduce((s, l) => s + l.valor, 0)
  const despesasAPagar = filteredLancs.filter(l => l.tipo === 'despesa' && l.status === 'A Pagar').reduce((s, l) => s + l.valor, 0)
  const despesasAtrasadas = filteredLancs.filter(l => l.tipo === 'despesa' && l.status === 'Atrasada').reduce((s, l) => s + l.valor, 0)

  const recentes = [...filteredLancs].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 6)

  const metas = data.metas || []

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: T.text }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="page-hd" style={{ marginBottom: 16 }}>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Dashboard</h1>
          <div style={{ color: T.sub, fontSize: 14 }}>Visão geral da saúde financeira da sua empresa.</div>
        </div>
        <AdvancedFilters tipo="all" filter={filter} onApply={setFilter} storageKey="x8_filter_dashboard" />
      </div>

      {/* KPI Cards */}
      <div className="g-kpi">
        <KpiCard icon="↑" iconBg={T.greenL} label="Receitas (mês)" value={fmtS(tRec)} />
        <KpiCard icon="↓" iconBg={T.redL} label="Despesas (mês)" value={fmtS(tDesp)} />
        <KpiCard icon="$" iconBg={T.blueL} label="Lucro Líquido (mês)" value={fmtS(lucro)} />
        <KpiCard icon="%" iconBg={T.purpleL} label="Margem Líquida" value={fmtPct(margem)} />
        <KpiCard icon="🏦" iconBg={T.yellowL} label="Saldo em Caixa" value={fmtS(saldoCaixa)} />
      </div>

      {/* Row 2 */}
      <div className="g-flow">
        {/* Fluxo de Caixa */}
        <Card style={{ padding: 18, gridColumn: 'span 1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Fluxo de Caixa ℹ️</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                {[['Entradas', T.green], ['Saídas', T.red], ['Saldo acumulado', T.text]].map(([l, c]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: T.sub }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 10px', fontSize: 12, color: T.sub }}>{filter.inicio} → {filter.fim}</div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={fluxoData.filter((_, i) => i % 3 === 0)} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="dia" tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.muted, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} />
              <Tooltip contentStyle={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} formatter={v => fmt(v)} />
              <Bar dataKey="entradas" fill={T.green} opacity={0.8} radius={[2, 2, 0, 0]} maxBarSize={12} />
              <Bar dataKey="saidas" fill={T.red} opacity={0.8} radius={[2, 2, 0, 0]} maxBarSize={12} />
              <Line type="monotone" dataKey="saldo" stroke={T.text} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12 }}>
            <div><div style={{ color: T.muted }}>Total de entradas</div><div style={{ color: T.green, fontWeight: 700 }}>{fmt(fluxoResumo.e)}</div></div>
            <div><div style={{ color: T.muted }}>Total de saídas</div><div style={{ color: T.red, fontWeight: 700 }}>{fmt(fluxoResumo.s)}</div></div>
            <div><div style={{ color: T.muted }}>Saldo do período</div><div style={{ color: T.text, fontWeight: 700 }}>{fmt(fluxoResumo.e - fluxoResumo.s)}</div></div>
          </div>
          <button onClick={() => setPage('fluxo')} style={{ marginTop: 12, background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 13, color: T.sub, width: '100%', fontFamily: 'inherit' }}>Ver fluxo de caixa completo</button>
        </Card>

        {/* Despesas por categoria */}
        <Card style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Despesas por categoria</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <PieChart width={130} height={130}>
              <Pie data={despCats} cx={65} cy={65} innerRadius={38} outerRadius={60} dataKey="pct" startAngle={90} endAngle={-270}>
                {despCats.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
              </Pie>
            </PieChart>
            <div style={{ flex: 1 }}>
              {despCats.map((d, i) => (
                <div key={d.n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS_PIE[i % COLORS_PIE.length], flexShrink: 0 }} />
                    <span style={{ color: T.text }}>{d.n}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: T.muted }}>{d.pct}%</span>
                    <span style={{ fontWeight: 600, color: T.text }}>{fmtS(d.v)}</span>
                  </div>
                </div>
              ))}
              {despCats.length === 0 && <div style={{ color: T.muted, fontSize: 13 }}>Nenhuma despesa</div>}
            </div>
          </div>
          <button style={{ marginTop: 12, background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>Ver todas as categorias ›</button>
        </Card>

        {/* Scanner */}
        <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
            Scanner Inteligente X8
            <Badge label="IA" color={T.blue} bg={T.blueL} />
          </div>
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: T.bg, border: `2px dashed ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto' }}>📷</div>
          </div>
          <div style={{ color: T.sub, fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
            Tire uma foto da nota fiscal e nossa IA extrai os dados automaticamente para você.
          </div>
          <button onClick={() => setPage('scanner')} style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600, width: '100%', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            📷 Escanear nota
          </button>
          <div style={{ color: T.muted, fontSize: 12, marginTop: 8 }}>🔒 Rápido, seguro e inteligente</div>
        </Card>
      </div>

      {/* Row 3 - Contas */}
      <div className="g-3">
        {/* Receitas */}
        <Card style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Receitas</div>
            <button onClick={() => setPage('receitas')} style={{ background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>Ver todas</button>
          </div>
          {[
            { label: 'Recebidas', value: tRec, sub: `Previsto: ${fmt(tRecPrev)}`, pct: tRecPrev > 0 ? Math.round(tRec / tRecPrev * 100) : 0, cor: T.green },
            { label: 'A receber', value: receitasAReceber, sub: 'Vencem nos próximos 30 dias', pct: receitasAReceber > 0 && tRecPrev > 0 ? Math.round(receitasAReceber / tRecPrev * 100) : 0, cor: T.blue },
            { label: 'Atrasadas', value: receitasAtrasadas, sub: receitasAtrasadas > 0 ? 'Verificar vencimentos' : 'Nenhuma em atraso', cor: T.orange },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ background: item.cor + '18', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                  {item.label === 'Atrasadas' ? '⚠️' : item.label === 'A receber' ? '📅' : '📥'}
                </div>
                <div>
                  <div style={{ fontSize: 12, color: T.sub }}>{item.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: item.cor }}>{fmt(item.value)}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{item.sub}</div>
                </div>
              </div>
              {item.pct > 0 && (
                <div style={{ width: 36, height: 36, position: 'relative' }}>
                  <svg width="36" height="36" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke={T.borderLight} strokeWidth="3" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke={item.cor} strokeWidth="3"
                      strokeDasharray={`${Math.min(item.pct, 100) * 0.88} 88`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                  </svg>
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: item.cor }}>{Math.min(item.pct, 100)}%</span>
                </div>
              )}
            </div>
          ))}
        </Card>

        {/* Despesas */}
        <Card style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Despesas</div>
            <button onClick={() => setPage('despesas')} style={{ background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>Ver todas</button>
          </div>
          {[
            { label: 'Pagas', value: tDesp, sub: `Total: ${filteredLancs.filter(l => l.tipo === 'despesa' && l.status === 'Paga').length} despesas`, pct: 100, cor: T.green },
            { label: 'A pagar', value: despesasAPagar, sub: 'Vencem nos próximos 30 dias', pct: despesasAPagar > 0 && tDesp + despesasAPagar > 0 ? Math.round(despesasAPagar / (tDesp + despesasAPagar) * 100) : 0, cor: T.yellow },
            { label: 'Atrasadas', value: despesasAtrasadas, sub: despesasAtrasadas > 0 ? 'Verificar vencimentos' : 'Nenhuma em atraso', cor: T.orange },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ background: item.cor + '18', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                  {item.label === 'Atrasadas' ? '⚠️' : item.label === 'A pagar' ? '📅' : '📤'}
                </div>
                <div>
                  <div style={{ fontSize: 12, color: T.sub }}>{item.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: item.cor }}>{fmt(item.value)}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{item.sub}</div>
                </div>
              </div>
              {item.pct > 0 && (
                <div style={{ width: 36, height: 36, position: 'relative' }}>
                  <svg width="36" height="36" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke={T.borderLight} strokeWidth="3" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke={item.cor} strokeWidth="3"
                      strokeDasharray={`${Math.min(item.pct, 100) * 0.88} 88`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                  </svg>
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: item.cor }}>{Math.min(item.pct, 100)}%</span>
                </div>
              )}
            </div>
          ))}
        </Card>

        {/* Últimas movimentações */}
        <Card style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Últimas movimentações</div>
            <button onClick={() => setPage('transacoes')} style={{ background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>Ver todas</button>
          </div>
          {recentes.map(l => {
            const isR = l.tipo === 'receita'
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ background: isR ? T.greenL : T.redL, borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: isR ? T.green : T.red, fontWeight: 700, fontSize: 12 }}>{isR ? '↑' : '↓'}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.desc}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{isR ? 'Receita' : 'Despesa'} · {l.catNome}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: isR ? T.green : T.red, flexShrink: 0 }}>
                  {isR ? '+' : '-'}{fmtS(l.valor)}
                </div>
              </div>
            )
          })}
        </Card>
      </div>

      {/* Row 4 - Insights + Metas */}
      <div className="g-2">
        {/* Insights IA */}
        <Card style={{ padding: 18 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Insights da IA</div>
            <Badge label="IA" color={T.blue} bg={T.blueL} />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ background: T.bg, borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🤖</div>
            <div style={{ flex: 1 }}>
              {[
                `Receitas cresceram ${18.2}% em relação ao mês anterior.`,
                `Sua margem líquida (${fmtPct(margem)}) está acima da média dos últimos 6 meses (${fmtPct(margem - 4.8)}).`,
                `A categoria Marketing representa a maior parte das despesas totais.`,
                `Se mantiver o ritmo atual, a meta de receita será atingida em junho.`,
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13, color: T.sub }}>
                  <span style={{ color: T.green, flexShrink: 0 }}>✓</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <button style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: T.sub, width: '100%', fontFamily: 'inherit' }}>Ver mais insights</button>
        </Card>

        {/* Metas */}
        <Card style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Metas financeiras</div>
            <button onClick={() => setPage('metas')} style={{ background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>Ver todas</button>
          </div>
          {metas.map(m => {
            const pct = Math.min(100, Math.round(m.acumulado / m.objetivo * 100))
            const valores = {
              receita: { label: 'Meta de Receita', value: fmt(m.acumulado), meta: fmt(m.objetivo) },
              lucro: { label: 'Meta de Lucro Líquido', value: fmt(m.acumulado), meta: fmt(m.objetivo) },
              margem: { label: 'Meta de Margem Líquida', value: fmtPct(m.acumulado), meta: fmtPct(m.objetivo) },
            }
            const info = valores[m.tipo] || valores.receita
            return (
              <div key={m.id} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: T.sub }}>{info.label}</span>
                  <span style={{ fontSize: 12, color: T.muted }}>{info.meta}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{info.value}</div>
                <div style={{ background: T.borderLight, borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 3 }}>
                  <div style={{ background: pct >= 100 ? T.green : T.primary, height: '100%', width: pct + '%', borderRadius: 4, transition: 'width .5s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 100 ? T.green : T.primary }}>{pct}%</span>
                </div>
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}
