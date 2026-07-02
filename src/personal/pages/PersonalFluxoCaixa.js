import { useMemo, useState } from 'react'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { T, fmt, fmtS, fd } from '../../theme'
import { EmptyState, StatusBadge, Badge } from '../../components/ui'
import { PT, PageHeader, MetricCard, SectionCard, PfPeriodFilter, pfCurrentMonthPeriod } from '../pfui'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Avança uma data conforme a frequência da recorrência (espelha a geração do backend).
const addFreq = (d, f) => {
  const nd = new Date(d)
  if (f === 'semanal') nd.setDate(nd.getDate() + 7)
  else if (f === 'anual') nd.setFullYear(nd.getFullYear() + 1)
  else nd.setMonth(nd.getMonth() + 1)
  return nd
}

// Fluxo de caixa pessoal (previsão). Usa exclusivamente dados reais já existentes;
// nenhuma tabela nova. Transferências internas NÃO entram como receita/despesa.
export default function PersonalFluxoCaixa({
  accounts = [], transactions = [], cards = [], debts = [], recurrences = [], transfers = [],
  catsReceita = [], catsDespesa = [], setPage,
}) {
  const [period, setPeriod] = useState(() => pfCurrentMonthPeriod())
  const from = period.from, to = period.to
  const todayStr = new Date().toISOString().slice(0, 10)

  const saldoAtual = useMemo(() => accounts.reduce((s, a) => s + (a.saldoAtual || 0), 0), [accounts])

  const catName = (kind, id) => (kind === 'receita' ? catsReceita : catsDespesa).find(c => c.id === id)?.nome || id || '—'
  const catColor = (kind, id) => (kind === 'receita' ? catsReceita : catsDespesa).find(c => c.id === id)?.cor || T.muted
  const accName = (id) => accounts.find(a => a.id === id)?.nome || '—'
  const cardName = (id) => cards.find(c => c.id === id)?.name || '—'

  // ── Eventos do período (linha do tempo) ────────────────────────────────────
  const events = useMemo(() => {
    const evs = []
    // 1) Lançamentos concretos (receitas + despesas) — inclui parcelas futuras e recorrências já geradas
    transactions.forEach(t => {
      const d = t.data || ''
      if (d < from || d > to) return
      const isRec = t.tipo === 'receita'
      const realized = isRec ? t.status === 'Recebida' : t.status === 'Pago'
      evs.push({
        date: d, kind: isRec ? 'receita' : 'despesa', desc: t.desc || catName(t.tipo, t.categoria),
        categoria: t.categoria, accountId: t.accountId, cartaoId: t.cartaoId,
        status: t.status || (isRec ? 'A receber' : 'A Pagar'),
        value: isRec ? (t.valor || 0) : -(t.valor || 0), realized, source: 'tx',
      })
    })
    // 2) Recorrências ativas — projeta as ocorrências FUTURAS (data > hoje) ainda não geradas
    recurrences.forEach(r => {
      if (r.status !== 'ativo' || !r.startDate) return
      const isRec = r.tipo === 'receita'
      const end = r.endDate ? new Date(r.endDate) : null
      let cur = new Date(r.startDate); let guard = 0
      while (guard < 400) {
        guard++
        const ds = cur.toISOString().slice(0, 10)
        if (ds > to) break
        if (end && cur > end) break
        if (ds > todayStr && ds >= from) {
          evs.push({
            date: ds, kind: isRec ? 'receita' : 'despesa', desc: (r.descricao || catName(r.tipo, r.categoria)),
            categoria: r.categoria, accountId: r.accountId, cartaoId: r.cardId,
            status: isRec ? 'A receber' : 'A Pagar',
            value: isRec ? (r.valor || 0) : -(r.valor || 0), realized: false, source: 'rec',
          })
        }
        cur = addFreq(cur, r.frequency)
      }
    })
    // 3) Transferências internas — informativas, não afetam o saldo total (neutral)
    transfers.forEach(tr => {
      const d = tr.data || ''
      if (d < from || d > to) return
      evs.push({
        date: d, kind: 'transferencia', desc: tr.obs || 'Transferência interna',
        fromId: tr.fromId, toId: tr.toId, status: 'Transferência', value: tr.valor || 0,
        realized: true, neutral: true, source: 'transfer',
      })
    })
    return evs.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  }, [transactions, recurrences, transfers, from, to, todayStr]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Métricas ────────────────────────────────────────────────────────────────
  const aReceber = useMemo(() => events.filter(e => e.kind === 'receita' && !e.realized).reduce((s, e) => s + e.value, 0), [events])
  const aPagar = useMemo(() => events.filter(e => e.kind === 'despesa' && !e.realized).reduce((s, e) => s - e.value, 0), [events])
  const saldoPrevisto = saldoAtual + aReceber - aPagar
  const maiorEntrada = useMemo(() => events.filter(e => e.kind === 'receita' && !e.realized).reduce((m, e) => Math.max(m, e.value), 0), [events])
  const maiorSaida = useMemo(() => events.filter(e => e.kind === 'despesa' && !e.realized).reduce((m, e) => Math.max(m, -e.value), 0), [events])

  // Saldo acumulado previsto por linha + primeiro dia em que fica negativo
  const withRunning = useMemo(() => {
    let run = saldoAtual
    return events.map(e => {
      if (!e.neutral && !e.realized) run += e.value
      return { ...e, running: e.neutral ? null : run }
    })
  }, [events, saldoAtual])

  const negDay = useMemo(() => {
    let run = saldoAtual
    for (const e of events) {
      if (e.neutral || e.realized) continue
      run += e.value
      if (run < 0) return e.date
    }
    return null
  }, [events, saldoAtual])

  // ── Alertas ──────────────────────────────────────────────────────────────────
  const alertas = useMemo(() => {
    const a = []
    if (negDay) a.push({ tipo: 'danger', icon: '⚠️', msg: `Seu saldo previsto pode ficar negativo em ${fd(negDay)}.` })
    const vencidas = events.filter(e => e.kind === 'despesa' && !e.realized && (e.status === 'Atrasado' || e.date < todayStr))
    if (vencidas.length) a.push({ tipo: 'danger', icon: '🧾', msg: `Você tem ${vencidas.length} despesa(s) vencida(s), somando ${fmtS(vencidas.reduce((s, e) => s - e.value, 0))}.` })
    const recAtras = events.filter(e => e.kind === 'receita' && !e.realized && e.date < todayStr)
    if (recAtras.length) a.push({ tipo: 'warn', icon: '⏰', msg: `Você tem ${recAtras.length} receita(s) atrasada(s) a receber.` })
    const hoje = new Date()
    cards.filter(c => c.isActive && c.dueDay).forEach(c => {
      let diff = c.dueDay - hoje.getDate(); if (diff < 0) diff += 30
      if (diff <= 5) a.push({ tipo: 'warn', icon: '💳', msg: `A fatura do cartão "${c.name}" vence dia ${c.dueDay}.` })
    })
    debts.filter(d => d.status !== 'quitada' && d.dueDate && d.dueDate >= todayStr && (new Date(d.dueDate) - hoje) / 86400000 <= 30)
      .forEach(d => a.push({ tipo: 'info', icon: '📉', msg: `Dívida com ${d.creditor} vence em ${fd(d.dueDate)}.` }))
    if (accounts.length === 0) a.push({ tipo: 'info', icon: '🏦', msg: 'Cadastre uma conta para melhorar o cálculo do saldo atual.' })
    if (a.length === 0) a.push({ tipo: 'success', icon: '✅', msg: 'Seu fluxo de caixa está positivo no período. Continue assim!' })
    return a
  }, [events, negDay, cards, debts, accounts, todayStr]) // eslint-disable-line react-hooks/exhaustive-deps
  const alertaBg = { danger: T.redL, warn: T.orangeL, info: T.blueL, success: T.greenL }
  const alertaCor = { danger: T.red, warn: PT.orange, info: T.blue, success: PT.green }

  // ── Dados do gráfico (por dia até 62 dias; senão por mês) ────────────────────
  const chartData = useMemo(() => {
    if (events.length === 0) return []
    const monthly = (new Date(to) - new Date(from)) / 86400000 > 62
    const key = (d) => monthly ? d.slice(0, 7) : d
    const label = (k) => monthly
      ? (() => { const [y, mo] = k.split('-'); return `${MESES[+mo - 1]}/${y.slice(2)}` })()
      : (() => { const [, mo, da] = k.split('-'); return `${da}/${mo}` })()
    const buckets = {}
    events.forEach(e => {
      if (e.neutral) return
      const k = key(e.date)
      buckets[k] = buckets[k] || { entradas: 0, saidas: 0, pend: 0 }
      if (e.value > 0) buckets[k].entradas += e.value; else buckets[k].saidas += -e.value
      if (!e.realized) buckets[k].pend += e.value
    })
    let run = saldoAtual
    return Object.keys(buckets).sort().map(k => { run += buckets[k].pend; return { label: label(k), entradas: buckets[k].entradas, saidas: buckets[k].saidas, saldo: Math.round(run) } })
  }, [events, from, to, saldoAtual])

  const tooltipStyle = { background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12, boxShadow: T.shadowMd }

  const tipoBadge = (e) => {
    if (e.kind === 'transferencia') return <Badge label="Transferência" color={T.blue} bg={T.blueL} />
    return <StatusBadge status={e.status} />
  }

  return (
    <div>
      <PageHeader title="Fluxo de Caixa" subtitle="Suas entradas, saídas e o saldo previsto no período selecionado."
        right={<PfPeriodFilter value={period} onChange={setPeriod} forward onClear={() => setPeriod(pfCurrentMonthPeriod())} />} />

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14, marginBottom: 14 }}>
        <MetricCard icon="🏦" label="Saldo atual em contas" value={fmt(saldoAtual)} valueColor={saldoAtual >= 0 ? undefined : PT.red} sub={`${accounts.length} conta(s)`} />
        <MetricCard icon="📥" label="A receber no período" value={fmt(aReceber)} valueColor={PT.green} sub="Receitas ainda não recebidas" />
        <MetricCard icon="📤" label="A pagar no período" value={fmt(aPagar)} valueColor={PT.red} sub="Despesas ainda não pagas" />
        <MetricCard gradient icon="🔮" label="Saldo previsto" value={fmt(saldoPrevisto)} sub="Saldo atual + a receber − a pagar" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14, marginBottom: 18 }}>
        <MetricCard icon="⬆️" label="Maior entrada futura" value={fmt(maiorEntrada)} valueColor={PT.green} sub="Maior receita a receber" />
        <MetricCard icon="⬇️" label="Maior saída futura" value={fmt(maiorSaida)} valueColor={PT.red} sub="Maior despesa a pagar" />
      </div>

      {/* Alertas */}
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

      {events.length === 0 ? (
        <div className="pf-card" style={{ padding: 0 }}>
          <EmptyState icon="🗓️" title="Nenhuma movimentação encontrada neste período"
            sub="Selecione outro período ou registre um lançamento para acompanhar seu fluxo de caixa."
            action={<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="pf-btn" onClick={() => setPage && setPage('receitas')}>+ Cadastrar receita</button>
              <button className="pf-btn pf-btn-ghost" onClick={() => setPage && setPage('despesas')}>+ Cadastrar despesa</button>
            </div>} />
        </div>
      ) : (
        <>
          {/* Gráfico simples: entradas x saídas x saldo previsto */}
          <SectionCard title="Entradas × Saídas × Saldo previsto" style={{ marginBottom: 14 }}>
            {chartData.length === 0 ? (
              <EmptyState icon="📊" title="Sem movimentações no período" sub="Ajuste o período ou lance receitas e despesas." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} />
                  <Tooltip formatter={v => fmt(v)} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="entradas" name="Entradas" fill={PT.green} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="saidas" name="Saídas" fill={PT.red} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Line type="monotone" dataKey="saldo" name="Saldo previsto" stroke={PT.orange} strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          {/* Linha do tempo financeira */}
          <SectionCard title="Linha do tempo financeira" right={<span style={{ fontSize: 12, color: T.muted }}>{withRunning.length} lançamento(s)</span>}>
            {withRunning.length === 0 ? (
              <EmptyState icon="🗓️" title="Nenhuma movimentação no período" sub="Selecione outro período ou registre seus lançamentos." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {['Data', 'Tipo', 'Descrição', 'Categoria', 'Conta / Cartão', 'Status', 'Valor', 'Saldo previsto'].map(h => (
                        <th key={h} style={{ padding: '9px 10px', textAlign: h === 'Valor' || h === 'Saldo previsto' ? 'right' : 'left', color: T.sub, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {withRunning.map((e, i) => {
                      const isReceita = e.kind === 'receita'
                      const isTransf = e.kind === 'transferencia'
                      const valCor = isTransf ? T.muted : isReceita ? PT.green : PT.red
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                          <td style={{ padding: '9px 10px', whiteSpace: 'nowrap', color: e.date > todayStr ? T.muted : T.text }}>{fd(e.date)}</td>
                          <td style={{ padding: '9px 10px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 15 }}>{isTransf ? '🔄' : isReceita ? '📥' : '📤'}</span>
                          </td>
                          <td style={{ padding: '9px 10px' }}>
                            {e.desc}{e.source === 'rec' && <span style={{ fontSize: 11, color: T.muted }}> · prevista 🔁</span>}
                          </td>
                          <td style={{ padding: '9px 10px', whiteSpace: 'nowrap' }}>
                            {isTransf ? <span style={{ color: T.muted }}>—</span> : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                                <span style={{ width: 9, height: 9, borderRadius: '50%', background: catColor(e.kind, e.categoria) }} />{catName(e.kind, e.categoria)}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '9px 10px', whiteSpace: 'nowrap', color: T.sub }}>
                            {isTransf ? `${accName(e.fromId)} → ${accName(e.toId)}` : (e.cartaoId ? `💳 ${cardName(e.cartaoId)}` : accName(e.accountId))}
                          </td>
                          <td style={{ padding: '9px 10px', whiteSpace: 'nowrap' }}>{tipoBadge(e)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: valCor, whiteSpace: 'nowrap' }}>
                            {isTransf ? fmt(e.value) : `${isReceita ? '+' : '−'}${fmt(Math.abs(e.value))}`}
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, color: e.running == null ? T.muted : e.running >= 0 ? T.text : PT.red }}>
                            {e.running == null ? '—' : fmt(e.running)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginTop: 12, fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
              O <strong>saldo previsto</strong> parte do saldo atual das contas e aplica apenas os lançamentos ainda pendentes (a receber / a pagar).
              Transferências internas não entram como receita nem despesa. Faturas de cartão e dívidas aparecem nos alertas para evitar contagem dupla.
            </div>
          </SectionCard>
        </>
      )}
    </div>
  )
}
