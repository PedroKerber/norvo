import { useState, useMemo } from 'react'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'
import { T, fmt, fmtS, fd } from '../../theme'
import { Card, EmptyState } from '../../components/ui'
import { CATS_RECEITA_PF, CATS_DESPESA_PF, tipoContaLabel } from '../../personalData'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const catInfo = (tipo, id) => (tipo === 'receita' ? CATS_RECEITA_PF : CATS_DESPESA_PF).find(c => c.id === id)

function porCategoria(txs, tipo) {
  const map = {}
  txs.filter(t => t.tipo === tipo).forEach(t => { map[t.categoria] = (map[t.categoria] || 0) + (t.valor || 0) })
  return Object.entries(map).map(([id, v]) => ({ nome: catInfo(tipo, id)?.nome || id, cor: catInfo(tipo, id)?.cor || T.muted, valor: v })).sort((a, b) => b.valor - a.valor)
}

export default function PersonalRelatorios({ transactions, accounts, investments, debts, goals }) {
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

  const recCat = useMemo(() => porCategoria(noPeriodo, 'receita'), [noPeriodo])
  const despCat = useMemo(() => porCategoria(noPeriodo, 'despesa'), [noPeriodo])
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

  const inputStyle = { background: 'var(--card)', border: `1.5px solid var(--border)`, borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'inherit' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: 0, color: T.text }}>Relatórios</h1>
          <div style={{ color: T.sub, fontSize: 14, marginTop: 2 }}>Sua visão financeira consolidada por período.</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div><label style={{ display: 'block', fontSize: 11, color: T.sub, fontWeight: 600, marginBottom: 4 }}>De</label><input type="month" value={de} onChange={e => setDe(e.target.value)} style={inputStyle} /></div>
          <div><label style={{ display: 'block', fontSize: 11, color: T.sub, fontWeight: 600, marginBottom: 4 }}>Até</label><input type="month" value={ate} onChange={e => setAte(e.target.value)} style={inputStyle} /></div>
        </div>
      </div>

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
              <span style={{ minWidth: 0 }}><strong>{i + 1}.</strong> {t.desc || catInfo('despesa', t.categoria)?.nome || t.categoria} <span style={{ color: T.muted, fontSize: 12 }}>· {fd(t.data)}</span></span>
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
