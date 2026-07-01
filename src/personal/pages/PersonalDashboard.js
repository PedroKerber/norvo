import { useMemo } from 'react'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts'
import { T, fmt, fmtS } from '../../theme'
import { Card, KpiCard, EmptyState } from '../../components/ui'
import { CATS_DESPESA_PF } from '../../personalData'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const somaMes = (txs, mes, tipo) => txs.filter(t => t.tipo === tipo && (t.data || '').startsWith(mes)).reduce((s, t) => s + (t.valor || 0), 0)

export default function PersonalDashboard({ usuario, profile, accounts, transactions, investments = [], debts = [] }) {
  const hoje = new Date()
  const mesAtual = hoje.toISOString().slice(0, 7)
  const prevDate = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  const mesPrev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  const recMes  = useMemo(() => somaMes(transactions, mesAtual, 'receita'), [transactions, mesAtual])
  const despMes = useMemo(() => somaMes(transactions, mesAtual, 'despesa'), [transactions, mesAtual])
  const recPrev  = useMemo(() => somaMes(transactions, mesPrev, 'receita'), [transactions, mesPrev])
  const despPrev = useMemo(() => somaMes(transactions, mesPrev, 'despesa'), [transactions, mesPrev])
  const economia = recMes - despMes
  const saldoContas = useMemo(() => accounts.reduce((s, a) => s + (a.saldoAtual || 0), 0), [accounts])

  // Investimentos / Dívidas / Cartão (F2) — dados reais do Supabase
  const totalInvest = useMemo(() => investments.reduce((s, i) => s + (i.current || 0), 0), [investments])
  const totalDividas = useMemo(() => debts.filter(d => d.status !== 'quitada').reduce((s, d) => s + (d.remaining || 0), 0), [debts])
  const faturaCartao = useMemo(() => transactions.filter(t => t.tipo === 'despesa' && t.cartaoId && (t.data || '').startsWith(mesAtual)).reduce((s, t) => s + (t.valor || 0), 0), [transactions, mesAtual])
  const patrimonio = saldoContas + totalInvest - totalDividas

  const delta = (cur, prev) => prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0)

  // Série dos últimos 6 meses (Receitas x Despesas + saldo mensal)
  const serie6 = useMemo(() => {
    const arr = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const rec = somaMes(transactions, mes, 'receita')
      const desp = somaMes(transactions, mes, 'despesa')
      arr.push({ mes: MESES[d.getMonth()], receitas: rec, despesas: desp, saldo: rec - desp })
    }
    return arr
  }, [transactions]) // eslint-disable-line react-hooks/exhaustive-deps

  // Gastos por categoria no mês atual
  const catDesp = useMemo(() => {
    const map = {}
    transactions.filter(t => t.tipo === 'despesa' && (t.data || '').startsWith(mesAtual))
      .forEach(t => { map[t.categoria] = (map[t.categoria] || 0) + (t.valor || 0) })
    return Object.entries(map).map(([id, v]) => ({
      nome: CATS_DESPESA_PF.find(c => c.id === id)?.nome || id,
      cor: CATS_DESPESA_PF.find(c => c.id === id)?.cor || T.muted, valor: v,
    })).sort((a, b) => b.valor - a.valor)
  }, [transactions, mesAtual])

  const temDados = transactions.length > 0 || accounts.length > 0
  const primeiroNome = (profile?.nome || usuario?.nome || '').split(' ')[0]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontWeight: 800, fontSize: 26, margin: 0, color: T.text }}>Olá{primeiroNome ? `, ${primeiroNome}` : ''} 👋</h1>
        <div style={{ color: T.sub, fontSize: 14, marginTop: 2 }}>Sua visão financeira pessoal — {MESES[hoje.getMonth()]}/{hoje.getFullYear()}.</div>
      </div>

      {!temDados ? (
        <Card style={{ padding: 0 }}>
          <EmptyState icon="✨" title="Bem-vindo ao seu Norvo Pessoal"
            sub="Comece cadastrando uma conta e seus primeiros lançamentos." />
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
            <KpiCard icon="📈" iconBg={T.greenL} label="Receitas do mês" value={fmt(recMes)} delta={delta(recMes, recPrev)} deltaLabel="vs mês anterior" />
            <KpiCard icon="📉" iconBg={T.redL} label="Despesas do mês" value={fmt(despMes)} delta={delta(despMes, despPrev)} deltaLabel="vs mês anterior" />
            <KpiCard icon="🐷" iconBg={T.blueL} label="Economia do mês" value={fmt(economia)} sub={economia >= 0 ? 'Você fechou no positivo' : 'Gastos acima da renda'} />
            <KpiCard icon="🏦" iconBg={T.primaryLight} label="Saldo em contas" value={fmt(saldoContas)} sub={`${accounts.length} conta(s)`} />
            <KpiCard icon="💹" iconBg={T.purpleL} label="Investimentos" value={fmt(totalInvest)} sub="Patrimônio atual" />
            <KpiCard icon="💳" iconBg={T.orangeL} label="Cartão (fatura)" value={fmt(faturaCartao)} sub="Fatura do mês" />
            <KpiCard icon="📊" iconBg={T.redL} label="Dívidas" value={fmt(totalDividas)} sub="Saldo devedor" />
            <KpiCard icon="💎" iconBg={T.cyanL} label="Patrimônio líquido" value={fmt(patrimonio)} sub="Contas + investimentos − dívidas" />
          </div>

          {/* Gráficos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: T.text }}>Receitas × Despesas (6 meses)</div>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={serie6} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="mes" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} />
                  <Tooltip formatter={v => fmt(v)} contentStyle={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="receitas" name="Receitas" fill={T.green} radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="despesas" name="Despesas" fill={T.red} radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Line type="monotone" dataKey="saldo" name="Saldo" stroke={T.primary} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>

            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: T.text }}>Gastos por categoria — {MESES[hoje.getMonth()]}</div>
              {catDesp.length === 0 ? (
                <EmptyState icon="🧾" title="Sem despesas neste mês" />
              ) : (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <PieChart width={160} height={160}>
                    <Pie data={catDesp} cx={75} cy={75} innerRadius={45} outerRadius={72} dataKey="valor" nameKey="nome" startAngle={90} endAngle={-270}>
                      {catDesp.map((c, i) => <Cell key={i} fill={c.cor} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} contentStyle={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    {catDesp.slice(0, 6).map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7, fontSize: 12 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: c.cor, flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</span>
                        </span>
                        <span style={{ fontWeight: 600, color: T.text, flexShrink: 0 }}>{fmtS(c.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
