import { useMemo } from 'react'
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts'
import { T, fmt, fmtS, fmtPct } from '../../theme'
import { Card, EmptyState, Badge } from '../../components/ui'
import { PT, PageHeader, MetricCard } from '../pfui'
import { tipoContaLabel, investTypeLabel, statusDividaInfo } from '../../personalData'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function PersonalPatrimonio({ accounts, investments, debts, snapshots = [] }) {
  const totalContas = useMemo(() => accounts.reduce((s, a) => s + (a.saldoAtual || 0), 0), [accounts])
  const totalInvest = useMemo(() => investments.reduce((s, i) => s + (i.current || 0), 0), [investments])
  const totalDividas = useMemo(() => debts.filter(d => d.status !== 'quitada').reduce((s, d) => s + (d.remaining || 0), 0), [debts])
  const ativos = totalContas + totalInvest
  const patrimonio = ativos - totalDividas
  const positivo = patrimonio >= 0
  const relacao = ativos > 0 ? (totalDividas / ativos) * 100 : (totalDividas > 0 ? 100 : 0)

  const evo = useMemo(() => snapshots.map(s => {
    const [y, mo] = (s.date || '').split('-')
    return { mes: `${MESES[+mo - 1]}/${(y || '').slice(2)}`, patrimonio: s.netWorth }
  }), [snapshots])

  const distrib = useMemo(() => [
    { nome: 'Contas', valor: totalContas, cor: T.primary },
    { nome: 'Investimentos', valor: totalInvest, cor: T.blue },
  ].filter(d => d.valor > 0), [totalContas, totalInvest])

  const temDados = accounts.length > 0 || investments.length > 0 || debts.length > 0

  const MiniList = ({ title, rows, empty }) => (
    <Card style={{ padding: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: T.text }}>{title}</div>
      {rows.length === 0 ? <EmptyState icon="—" title={empty} /> : rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.borderLight}`, fontSize: 13 }}>
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nome} {r.sub && <span style={{ color: T.muted, fontSize: 12 }}>· {r.sub}</span>}</span>
          <span style={{ fontWeight: 700, color: r.cor || T.text, flexShrink: 0 }}>{fmt(r.valor)}</span>
        </div>
      ))}
    </Card>
  )

  return (
    <div>
      <PageHeader title="Patrimônio" subtitle="Sua visão patrimonial consolidada."
        right={<Badge label={positivo ? '● Patrimônio positivo' : '● Patrimônio negativo'} color={positivo ? PT.green : PT.red} bg={(positivo ? PT.green : PT.red) + '18'} />} />

      {!temDados ? (
        <Card style={{ padding: 0 }}>
          <EmptyState icon="💎" title="Sem dados patrimoniais ainda"
            sub="Cadastre contas, investimentos ou dívidas para ver seu patrimônio consolidado." />
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 16 }}>
            <MetricCard icon="🏦" label="Total em contas" value={fmt(totalContas)} sub={`${accounts.length} conta(s)`} />
            <MetricCard icon="💹" label="Total investido" value={fmt(totalInvest)} valueColor={T.blue} sub={`${investments.length} ativo(s)`} />
            <MetricCard icon="📊" label="Total de dívidas" value={fmt(totalDividas)} valueColor={PT.red} sub={`${debts.filter(d => d.status !== 'quitada').length} em aberto`} />
            <MetricCard icon="💎" label="Patrimônio líquido" value={fmt(patrimonio)} valueColor={positivo ? PT.green : PT.red} sub="Contas + investimentos − dívidas" />
          </div>

          {/* Evolução + Distribuição */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 16 }}>
            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: T.text }}>Evolução patrimonial</div>
              {evo.length < 2 ? (
                <div style={{ background: T.bg, borderRadius: 8, padding: '12px 14px', fontSize: 13, color: T.muted }}>
                  O histórico começou a ser registrado agora. Volte nos próximos meses para acompanhar a curva.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={evo} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <XAxis dataKey="mes" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} />
                    <Tooltip formatter={v => fmt(v)} contentStyle={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="patrimonio" name="Patrimônio" stroke={T.primary} strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: T.text }}>Distribuição dos ativos</div>
              {distrib.length === 0 ? <EmptyState icon="🧩" title="Sem ativos cadastrados" /> : (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <PieChart width={150} height={150}>
                    <Pie data={distrib} cx={72} cy={72} innerRadius={42} outerRadius={68} dataKey="valor" nameKey="nome">
                      {distrib.map((d, i) => <Cell key={i} fill={d.cor} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} contentStyle={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    {distrib.map((d, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: d.cor }} />{d.nome}</span>
                        <span style={{ fontWeight: 700 }}>{fmtS(d.valor)}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.borderLight}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                        <span style={{ color: T.sub }}>Dívida × patrimônio</span>
                        <span style={{ fontWeight: 700, color: relacao >= 100 ? T.red : relacao >= 50 ? T.orange : T.green }}>{fmtPct(relacao)}</span>
                      </div>
                      <div style={{ background: T.borderLight, borderRadius: 5, height: 8, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, relacao)}%`, background: relacao >= 100 ? T.red : relacao >= 50 ? T.orange : T.green }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Listas resumidas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <MiniList title="Contas" empty="Nenhuma conta"
              rows={accounts.map(a => ({ nome: a.nome, sub: a.banco || tipoContaLabel(a.tipo), valor: a.saldoAtual, cor: a.saldoAtual >= 0 ? T.green : T.red }))} />
            <MiniList title="Investimentos" empty="Nenhum investimento"
              rows={investments.map(i => ({ nome: i.name, sub: investTypeLabel(i.type), valor: i.current, cor: T.blue }))} />
            <MiniList title="Dívidas" empty="Nenhuma dívida"
              rows={debts.filter(d => d.status !== 'quitada').map(d => ({ nome: d.creditor, sub: statusDividaInfo(d.status).label, valor: d.remaining, cor: T.red }))} />
          </div>
        </>
      )}
    </div>
  )
}
