import { useMemo } from 'react'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts'
import { T, fmt, fmtS, fmtPct, fd } from '../../theme'
import { EmptyState } from '../../components/ui'
import { PT, PageHeader, MetricCard, SectionCard, PfBtn } from '../pfui'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MESES_LONG = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const somaMes = (txs, mes, tipo) => txs.filter(t => t.tipo === tipo && (t.data || '').startsWith(mes)).reduce((s, t) => s + (t.valor || 0), 0)

export default function PersonalDashboard({ usuario, profile, accounts, transactions, cards = [], investments = [], debts = [], goals = [], catsDespesa = [], snapshots = [], setPage }) {
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

  const totalInvest = useMemo(() => investments.reduce((s, i) => s + (i.current || 0), 0), [investments])
  const totalDividas = useMemo(() => debts.filter(d => d.status !== 'quitada').reduce((s, d) => s + (d.remaining || 0), 0), [debts])
  const faturaCartao = useMemo(() => transactions.filter(t => t.tipo === 'despesa' && t.cartaoId && (t.data || '').startsWith(mesAtual)).reduce((s, t) => s + (t.valor || 0), 0), [transactions, mesAtual])
  const patrimonio = saldoContas + totalInvest - totalDividas

  const delta = (cur, prev) => prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0)

  const serie6 = useMemo(() => {
    const arr = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      arr.push({ mes: MESES[d.getMonth()], receitas: somaMes(transactions, mes, 'receita'), despesas: somaMes(transactions, mes, 'despesa'), saldo: somaMes(transactions, mes, 'receita') - somaMes(transactions, mes, 'despesa') })
    }
    return arr
  }, [transactions]) // eslint-disable-line react-hooks/exhaustive-deps

  const catDesp = useMemo(() => {
    const map = {}
    transactions.filter(t => t.tipo === 'despesa' && (t.data || '').startsWith(mesAtual))
      .forEach(t => { map[t.categoria] = (map[t.categoria] || 0) + (t.valor || 0) })
    return Object.entries(map).map(([id, v]) => ({
      nome: catsDespesa.find(c => c.id === id)?.nome || id,
      cor: catsDespesa.find(c => c.id === id)?.cor || T.muted, valor: v,
    })).sort((a, b) => b.valor - a.valor)
  }, [transactions, mesAtual, catsDespesa])

  const evoPat = useMemo(() => snapshots.map(s => {
    const [y, mo] = (s.date || '').split('-')
    return { mes: `${MESES[+mo - 1]}/${(y || '').slice(2)}`, patrimonio: s.netWorth }
  }), [snapshots])
  const maiorPat = snapshots.length ? Math.max(...snapshots.map(s => s.netWorth)) : patrimonio
  const menorPat = snapshots.length ? Math.min(...snapshots.map(s => s.netWorth)) : patrimonio
  const patPrev = snapshots.length >= 2 ? snapshots[snapshots.length - 2].netWorth : null
  const varPat = patPrev != null ? patrimonio - patPrev : 0
  const varPatPct = patPrev ? (varPat / Math.abs(patPrev)) * 100 : 0

  const hojeStr = hoje.toISOString().slice(0, 10)
  const alertas = []
  accounts.filter(a => (a.saldoAtual || 0) < 0).forEach(a => alertas.push({ tipo: 'danger', icon: '🏦', msg: `Conta "${a.nome}" com saldo negativo (${fmt(a.saldoAtual)}).` }))
  debts.filter(d => d.status !== 'quitada' && (d.status === 'atrasada' || (d.dueDate && d.dueDate < hojeStr)))
    .forEach(d => alertas.push({ tipo: 'danger', icon: '⚠️', msg: `Dívida com ${d.creditor} atrasada${d.dueDate ? ` (venceu ${fd(d.dueDate)})` : ''}.` }))
  debts.filter(d => d.status !== 'quitada' && d.dueDate && d.dueDate >= hojeStr && (new Date(d.dueDate) - hoje) / 86400000 <= 7)
    .forEach(d => alertas.push({ tipo: 'warn', icon: '📅', msg: `Dívida com ${d.creditor} vence em ${fd(d.dueDate)}.` }))
  cards.filter(c => c.isActive && c.dueDay).forEach(c => {
    let diff = c.dueDay - hoje.getDate(); if (diff < 0) diff += 30
    if (diff <= 5) alertas.push({ tipo: 'warn', icon: '💳', msg: `Fatura do cartão "${c.name}" vence dia ${c.dueDay}.` })
  })
  if (recMes > 0 && despMes > recMes) alertas.push({ tipo: 'warn', icon: '📉', msg: `Despesas do mês (${fmtS(despMes)}) acima das receitas (${fmtS(recMes)}).` })
  goals.filter(g => g.status === 'ativa' && g.target > 0).forEach(g => {
    const p = g.current / g.target * 100
    if (p >= 80 && p < 100) alertas.push({ tipo: 'info', icon: '🎯', msg: `Meta "${g.name}" está a ${Math.round(100 - p)}% de ser concluída.` })
  })
  if (patrimonio < 0) alertas.push({ tipo: 'danger', icon: '💎', msg: `Seu patrimônio líquido está negativo (${fmtS(patrimonio)}).` })
  const alertaBg = { danger: T.redL, warn: T.orangeL, info: T.blueL }
  const alertaCor = { danger: T.red, warn: PT.orange, info: T.blue }

  const maiorCatDesp = catDesp[0] || null
  const temPrev = recPrev > 0 || despPrev > 0
  const curSnap = snapshots[snapshots.length - 1] || null
  const prevSnap = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null
  const investMesDelta = prevSnap && curSnap ? (curSnap.investments - prevSnap.investments) : null
  const dividaMesReducao = prevSnap && curSnap ? (prevSnap.debts - curSnap.debts) : null

  const temDados = transactions.length > 0 || accounts.length > 0
  const primeiroNome = (profile?.nome || usuario?.nome || '').split(' ')[0]
  const tooltipStyle = { background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12, boxShadow: T.shadowMd }

  const monthChip = (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--card)', border: `1px solid var(--border)`, borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, color: T.text, boxShadow: T.shadow }}>
      📅 {MESES_LONG[hoje.getMonth()]} / {hoje.getFullYear()}
    </div>
  )

  return (
    <div>
      <PageHeader title={`Olá${primeiroNome ? `, ${primeiroNome}` : ''}! 👋`} subtitle="Aqui está o resumo da sua vida financeira." right={monthChip} />

      {alertas.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, marginBottom: 18 }}>
          {alertas.slice(0, 6).map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: alertaBg[a.tipo], border: `1px solid ${alertaCor[a.tipo]}33`, borderRadius: 12, padding: '11px 14px' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
              <span style={{ fontSize: 13, color: T.text, lineHeight: 1.4 }}>{a.msg}</span>
            </div>
          ))}
        </div>
      )}

      {!temDados ? (
        <div className="pf-card" style={{ padding: 0 }}>
          <EmptyState icon="✨" title="Bem-vindo ao seu Norvo Pessoal" sub="Comece cadastrando uma conta e seus primeiros lançamentos."
            action={<PfBtn onClick={() => setPage && setPage('contas')} icon="+">Cadastrar conta</PfBtn>} />
        </div>
      ) : (
        <>
          {/* KPIs principais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14, marginBottom: 14 }}>
            <MetricCard icon="📈" label="Receitas do mês" value={fmt(recMes)} delta={delta(recMes, recPrev)} deltaLabel="vs mês anterior" />
            <MetricCard icon="📉" label="Despesas do mês" value={fmt(despMes)} delta={delta(despMes, despPrev)} deltaLabel="vs mês anterior" />
            <MetricCard icon="🐷" label="Economia do mês" value={fmt(economia)} valueColor={economia >= 0 ? PT.green : PT.red} sub={economia >= 0 ? 'Você fechou no positivo' : 'Gastos acima da renda'} />
            <MetricCard icon="🏦" label="Saldo em contas" value={fmt(saldoContas)} sub={`${accounts.length} conta(s)`} />
            <MetricCard icon="💹" label="Investimentos" value={fmt(totalInvest)} sub="Patrimônio atual" />
          </div>

          {/* Destaques: cartão (gradiente) + dívidas + patrimônio */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 18 }}>
            <MetricCard gradient icon="💳" label="Cartão (fatura)" value={fmt(faturaCartao)} sub="Fatura do mês" />
            <MetricCard icon="📊" label="Dívidas" value={fmt(totalDividas)} valueColor={PT.red} sub="Saldo devedor" />
            <MetricCard icon="💎" label="Patrimônio líquido" value={fmt(patrimonio)} valueColor={patrimonio >= 0 ? PT.green : PT.red} sub="Contas + investimentos − dívidas" />
          </div>

          {/* Resumo do mês */}
          <SectionCard title={`Resumo do mês — ${MESES_LONG[hoje.getMonth()]}/${hoje.getFullYear()}`} style={{ marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: T.sub }}>Receitas</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: PT.green }}>{fmt(recMes)}</div>
                {temPrev && <div style={{ fontSize: 11, color: delta(recMes, recPrev) >= 0 ? PT.green : PT.red }}>{delta(recMes, recPrev) >= 0 ? '↑' : '↓'} {fmtPct(Math.abs(delta(recMes, recPrev)))} vs mês ant.</div>}
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.sub }}>Despesas</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: PT.red }}>{fmt(despMes)}</div>
                {temPrev && <div style={{ fontSize: 11, color: delta(despMes, despPrev) <= 0 ? PT.green : PT.red }}>{delta(despMes, despPrev) >= 0 ? '↑' : '↓'} {fmtPct(Math.abs(delta(despMes, despPrev)))} vs mês ant.</div>}
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.sub }}>Saldo do mês</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: economia >= 0 ? PT.green : PT.red }}>{fmt(economia)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.sub }}>Maior gasto</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: T.text }}>{maiorCatDesp ? maiorCatDesp.nome : '—'}</div>
                {maiorCatDesp && <div style={{ fontSize: 12, color: T.muted }}>{fmtS(maiorCatDesp.valor)}</div>}
              </div>
              {investMesDelta != null && (
                <div>
                  <div style={{ fontSize: 12, color: T.sub }}>Investimentos (mês)</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: investMesDelta >= 0 ? PT.green : PT.red }}>{investMesDelta >= 0 ? '+' : '−'}{fmtS(Math.abs(investMesDelta))}</div>
                </div>
              )}
              {dividaMesReducao != null && dividaMesReducao !== 0 && (
                <div>
                  <div style={{ fontSize: 12, color: T.sub }}>Dívidas (mês)</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: dividaMesReducao >= 0 ? PT.green : PT.red }}>{dividaMesReducao >= 0 ? '−' : '+'}{fmtS(Math.abs(dividaMesReducao))}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{dividaMesReducao >= 0 ? 'reduziu' : 'aumentou'}</div>
                </div>
              )}
            </div>
            {!temPrev && <div style={{ marginTop: 12, background: T.bg, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: T.muted }}>Sem dados do mês anterior para comparar — os comparativos aparecem assim que houver histórico.</div>}
          </SectionCard>

          {/* Gráficos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            <SectionCard title="Receitas × Despesas (6 meses)">
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={serie6} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="mes" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} />
                  <Tooltip formatter={v => fmt(v)} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="receitas" name="Receitas" fill={PT.green} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="despesas" name="Despesas" fill={PT.red} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Line type="monotone" dataKey="saldo" name="Saldo" stroke={PT.orange} strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard title={`Gastos por categoria — ${MESES[hoje.getMonth()]}`}>
              {catDesp.length === 0 ? (
                <EmptyState icon="🧾" title="Sem despesas neste mês" />
              ) : (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <PieChart width={160} height={160}>
                    <Pie data={catDesp} cx={75} cy={75} innerRadius={46} outerRadius={72} dataKey="valor" nameKey="nome" startAngle={90} endAngle={-270} paddingAngle={2}>
                      {catDesp.map((c, i) => <Cell key={i} fill={c.cor} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} contentStyle={tooltipStyle} />
                  </PieChart>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    {catDesp.slice(0, 6).map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 12 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: c.cor, flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</span>
                        </span>
                        <span style={{ fontWeight: 700, color: T.text, flexShrink: 0 }}>{fmtS(c.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          {/* Evolução Patrimonial */}
          <SectionCard title="Evolução Patrimonial" right={<span style={{ fontSize: 12, color: T.muted }}>Patrimônio = contas + investimentos − dívidas</span>} style={{ marginTop: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div><div style={{ fontSize: 12, color: T.sub }}>Atual</div><div style={{ fontWeight: 800, fontSize: 20, color: patrimonio >= 0 ? PT.green : PT.red }}>{fmt(patrimonio)}</div></div>
              <div><div style={{ fontSize: 12, color: T.sub }}>Maior registrado</div><div style={{ fontWeight: 800, fontSize: 20, color: T.text }}>{fmt(maiorPat)}</div></div>
              <div><div style={{ fontSize: 12, color: T.sub }}>Menor registrado</div><div style={{ fontWeight: 800, fontSize: 20, color: T.text }}>{fmt(menorPat)}</div></div>
              <div>
                <div style={{ fontSize: 12, color: T.sub }}>Variação (mês ant.)</div>
                <div style={{ fontWeight: 800, fontSize: 20, color: varPat >= 0 ? PT.green : PT.red }}>{patPrev == null ? '—' : `${varPat >= 0 ? '↑' : '↓'} ${fmt(Math.abs(varPat))}`}</div>
                {patPrev != null && <div style={{ fontSize: 12, color: varPat >= 0 ? PT.green : PT.red }}>{fmtPct(varPatPct)}</div>}
              </div>
            </div>
            {evoPat.length < 2 ? (
              <div style={{ background: T.bg, borderRadius: 10, padding: '12px 14px', fontSize: 13, color: T.muted }}>
                O histórico do patrimônio começou a ser registrado agora. Volte nos próximos meses para acompanhar a curva de evolução.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={evoPat} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="mes" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} />
                  <Tooltip formatter={v => fmt(v)} contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="patrimonio" name="Patrimônio" stroke={PT.orange} strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          {/* CTA — Foco no que importa */}
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, marginTop: 16, padding: '22px 26px', background: PT.orangeGrad, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', boxShadow: '0 12px 30px rgba(255,106,0,0.30)' }}>
            <div style={{ position: 'absolute', right: -10, bottom: -30, fontSize: 130, opacity: 0.14, lineHeight: 1, pointerEvents: 'none' }}>🎯</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>🎯</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 19 }}>Foco no que importa</div>
                <div style={{ fontSize: 14, opacity: 0.92 }}>Acompanhe suas metas e continue no caminho certo para alcançar seus objetivos.</div>
              </div>
            </div>
            <button onClick={() => setPage && setPage('metas')} style={{ background: '#fff', color: PT.orange, border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0, zIndex: 1 }}>Ver metas ↗</button>
          </div>
        </>
      )}
    </div>
  )
}
