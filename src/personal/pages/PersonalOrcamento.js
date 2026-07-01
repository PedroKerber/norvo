import { useState, useMemo } from 'react'
import { T, fmt, uid, errMsgAcao } from '../../theme'
import { Card, Btn, Modal, Input, Select, Toast, Confirm, EmptyState } from '../../components/ui'
import { PageHeader } from '../pfui'

export default function PersonalOrcamento({ budgets = [], transactions = [], catsDespesa = [], onSaveBudget, onDeleteBudget }) {
  const [modal, setModal] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState(null)

  const mesAtual = new Date().toISOString().slice(0, 7)
  const catNome = (id) => catsDespesa.find(c => c.id === id)?.nome || id || '—'
  const catCor = (id) => catsDespesa.find(c => c.id === id)?.cor || T.muted

  // Gasto do mês por categoria (despesas)
  const gastoPorCat = useMemo(() => {
    const map = {}
    transactions.filter(t => t.tipo === 'despesa' && (t.data || '').startsWith(mesAtual))
      .forEach(t => { map[t.categoria] = (map[t.categoria] || 0) + (t.valor || 0) })
    return map
  }, [transactions, mesAtual])

  const totalOrcado = budgets.reduce((s, b) => s + (b.amount || 0), 0)
  const totalGasto = budgets.reduce((s, b) => s + (gastoPorCat[b.categoria] || 0), 0)
  const catsDisponiveis = catsDespesa.filter(c => c.active !== false && !budgets.some(b => b.categoria === c.id))

  const novo = () => {
    const first = catsDisponiveis[0]?.id || catsDespesa[0]?.id || ''
    setForm({ id: uid(), categoria: first, amount: '', _edit: false }); setModal(true)
  }
  const editar = (b) => { setForm({ ...b, amount: String(b.amount ?? ''), _edit: true }); setModal(true) }

  const salvar = async () => {
    if (!form.categoria) { setToast({ msg: 'Escolha uma categoria.', type: 'error' }); return }
    const amount = parseFloat(String(form.amount).replace(',', '.')) || 0
    if (amount <= 0) { setToast({ msg: 'Informe um valor de orçamento.', type: 'error' }); return }
    try {
      await onSaveBudget({ id: form.id, categoria: form.categoria, amount })
      setModal(false); setForm(null); setToast({ msg: form._edit ? 'Orçamento atualizado!' : 'Orçamento definido!', type: 'success' })
    } catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
  }
  const excluir = async () => {
    try { await onDeleteBudget(confirmId); setToast({ msg: 'Orçamento removido.', type: 'success' }) }
    catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
    setConfirmId(null)
  }

  const MESNOME = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][new Date().getMonth()]

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {confirmId && <Confirm msg="Remover este orçamento?" onYes={excluir} onNo={() => setConfirmId(null)} />}

      <PageHeader title="Orçamento" subtitle={`Limites de gasto por categoria — ${MESNOME}.`}
        actionLabel="Novo orçamento" actionIcon="+" onAction={novo} />

      {budgets.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
          <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Total orçado</div><div style={{ fontWeight: 800, fontSize: 22, color: T.text, marginTop: 4 }}>{fmt(totalOrcado)}</div></Card>
          <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Gasto no mês</div><div style={{ fontWeight: 800, fontSize: 22, color: T.red, marginTop: 4 }}>{fmt(totalGasto)}</div></Card>
          <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Disponível</div><div style={{ fontWeight: 800, fontSize: 22, color: totalOrcado - totalGasto >= 0 ? T.green : T.red, marginTop: 4 }}>{fmt(totalOrcado - totalGasto)}</div></Card>
        </div>
      )}

      {budgets.length === 0 ? (
        <Card style={{ padding: 0 }}>
          <EmptyState icon="🎯" title="Nenhum orçamento definido" sub="Defina um limite mensal por categoria (ex.: Alimentação R$ 1.500) e acompanhe o quanto já gastou."
            action={<Btn onClick={novo} icon="+">Novo orçamento</Btn>} />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {budgets.map(b => {
            const gasto = gastoPorCat[b.categoria] || 0
            const pct = b.amount > 0 ? Math.round(gasto / b.amount * 100) : 0
            const restante = b.amount - gasto
            const estourou = gasto > b.amount
            return (
              <Card key={b.id} style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: catCor(b.categoria), flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: 15, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{catNome(b.categoria)}</span>
                  </div>
                  {estourou && <span style={{ fontSize: 11, fontWeight: 700, color: T.red, background: T.redL, borderRadius: 6, padding: '2px 8px' }}>Estourou</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, color: estourou ? T.red : T.text }}>{fmt(gasto)}</span>
                  <span style={{ color: T.muted }}>de {fmt(b.amount)}</span>
                </div>
                <div style={{ background: T.borderLight, borderRadius: 5, height: 10, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: pct >= 100 ? T.red : pct >= 80 ? T.orange : T.green, transition: 'width .4s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.sub, marginBottom: 12 }}>
                  <span>{pct}% usado</span>
                  <span style={{ color: restante >= 0 ? T.green : T.red }}>{restante >= 0 ? `${fmt(restante)} restante` : `${fmt(-restante)} acima`}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn sm full variant="ghost" onClick={() => editar(b)}>Editar</Btn>
                  <Btn sm variant="ghost" onClick={() => setConfirmId(b.id)} style={{ color: T.red, borderColor: T.red }}>🗑</Btn>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {modal && form && (
        <Modal title={`${form._edit ? 'Editar' : 'Novo'} orçamento`} onClose={() => { setModal(false); setForm(null) }}
          footer={<div style={{ display: 'flex', gap: 10, padding: 16 }}>
            <Btn full variant="ghost" onClick={() => { setModal(false); setForm(null) }}>Cancelar</Btn>
            <Btn full onClick={salvar}>Salvar</Btn>
          </div>}>
          <Select label="Categoria" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
            options={(form._edit ? catsDespesa.filter(c => c.active !== false) : catsDisponiveis).map(c => ({ value: c.id, label: c.nome }))} />
          <Input label="Orçamento mensal (R$)" type="text" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
        </Modal>
      )}
    </div>
  )
}
