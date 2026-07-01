import { useState, useMemo } from 'react'
import { T, fmt, errMsgAcao } from '../../theme'
import { Card, Btn, Toast, EmptyState, Badge } from '../../components/ui'
import { PageHeader } from '../pfui'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function PersonalFechamento({ transactions = [], accounts = [], investments = [], debts = [], catsDespesa = [], closings = [], onSaveClosing }) {
  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(false)
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))

  const [ano, mesNum] = mes.split('-').map(Number)
  const noMes = useMemo(() => transactions.filter(t => (t.data || '').startsWith(mes)), [transactions, mes])
  const receitas = noMes.filter(t => t.tipo === 'receita').reduce((s, t) => s + (t.valor || 0), 0)
  const despesas = noMes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + (t.valor || 0), 0)
  const saldo = receitas - despesas
  const investTotal = investments.reduce((s, i) => s + (i.current || 0), 0)
  const dividasTotal = debts.filter(d => d.status !== 'quitada').reduce((s, d) => s + (d.remaining || 0), 0)
  const contasTotal = accounts.reduce((s, a) => s + (a.saldoAtual || 0), 0)
  const patrimonio = contasTotal + investTotal - dividasTotal

  const catDesp = useMemo(() => {
    const map = {}
    noMes.filter(t => t.tipo === 'despesa').forEach(t => { map[t.categoria] = (map[t.categoria] || 0) + (t.valor || 0) })
    return Object.entries(map).map(([id, v]) => ({ nome: catsDespesa.find(c => c.id === id)?.nome || id, cor: catsDespesa.find(c => c.id === id)?.cor || T.muted, valor: v })).sort((a, b) => b.valor - a.valor)
  }, [noMes, catsDespesa])
  const maiorGasto = catDesp[0] || null

  const jaFechado = closings.find(c => c.year === ano && c.month === mesNum)

  const registrar = async () => {
    setSaving(true)
    try {
      await onSaveClosing({ month: mesNum, year: ano, totalIncome: receitas, totalExpenses: despesas, balance: saldo, accountsTotal: contasTotal, investmentsTotal: investTotal, debtsTotal: dividasTotal, netWorth: patrimonio })
      setToast({ msg: 'Fechamento registrado!', type: 'success' })
    } catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
    setSaving(false)
  }

  const inputStyle = { background: 'var(--card)', border: `1.5px solid var(--border)`, borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'inherit' }
  const Kpi = ({ label, value, cor }) => (
    <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>{label}</div><div style={{ fontWeight: 800, fontSize: 20, color: cor || T.text, marginTop: 4 }}>{value}</div></Card>
  )

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <PageHeader title="Fechamento mensal" subtitle={`Consolidação do mês — ${MESES[mesNum - 1]}/${ano}.`}
        right={<div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={inputStyle} />
          {jaFechado
            ? <Badge label="✓ Fechado" color={T.green} bg={T.greenL} />
            : <Btn onClick={registrar} disabled={saving}>{saving ? 'Registrando…' : 'Registrar fechamento'}</Btn>}
        </div>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 16 }}>
        <Kpi label="Receitas do mês" value={fmt(receitas)} cor={T.green} />
        <Kpi label="Despesas do mês" value={fmt(despesas)} cor={T.red} />
        <Kpi label="Saldo final" value={fmt(saldo)} cor={saldo >= 0 ? T.green : T.red} />
        <Kpi label="Investimentos" value={fmt(investTotal)} cor={T.blue} />
        <Kpi label="Dívidas" value={fmt(dividasTotal)} cor={T.orange} />
        <Kpi label="Patrimônio no fechamento" value={fmt(patrimonio)} cor={patrimonio >= 0 ? T.green : T.red} />
      </div>

      <Card style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Categorias de despesa — {MESES[mesNum - 1]}</div>
        {catDesp.length === 0 ? <EmptyState icon="🧾" title="Sem despesas neste mês" /> : (
          <>
            {maiorGasto && <div style={{ fontSize: 13, color: T.sub, marginBottom: 10 }}>Maior gasto: <strong style={{ color: T.text }}>{maiorGasto.nome}</strong> ({fmt(maiorGasto.valor)})</div>}
            {catDesp.slice(0, 8).map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${T.borderLight}`, fontSize: 13 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: c.cor }} />{c.nome}</span>
                <span style={{ fontWeight: 700, color: T.red }}>{fmt(c.valor)}</span>
              </div>
            ))}
          </>
        )}
      </Card>

      {closings.length > 0 && (
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Fechamentos registrados</div>
          {closings.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${T.borderLight}`, fontSize: 13, flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontWeight: 600 }}>{MESES[c.month - 1]}/{c.year}</span>
              <span style={{ display: 'flex', gap: 14, color: T.muted, flexWrap: 'wrap' }}>
                <span>Saldo <strong style={{ color: c.balance >= 0 ? T.green : T.red }}>{fmt(c.balance)}</strong></span>
                <span>Patrimônio <strong style={{ color: c.netWorth >= 0 ? T.green : T.red }}>{fmt(c.netWorth)}</strong></span>
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
