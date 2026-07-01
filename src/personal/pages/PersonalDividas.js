import { useState, useMemo } from 'react'
import { T, fmt, fd, uid, errMsgAcao } from '../../theme'
import { Card, Btn, Modal, Input, Select, Table, Toast, Confirm, EmptyState, Badge, FilterBar, SearchInput } from '../../components/ui'
import { PageHeader } from '../pfui'
import { STATUS_DIVIDA_PF, statusDividaInfo } from '../../personalData'

const parcelaMensal = (d) => (d.installmentsTotal ? (d.total || 0) / d.installmentsTotal : 0)

export default function PersonalDividas({ debts, onSaveDebt, onDeleteDebt }) {
  const [modal, setModal] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState(null)
  const [busca, setBusca] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fVenc, setFVenc] = useState('')

  const totalDevedor = useMemo(() => debts.filter(d => d.status !== 'quitada').reduce((s, d) => s + (d.remaining || 0), 0), [debts])
  const parcelasMes = useMemo(() => debts.filter(d => d.status !== 'quitada').reduce((s, d) => s + parcelaMensal(d), 0), [debts])
  const hojeStr = new Date().toISOString().slice(0, 10)
  const em30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const filtered = useMemo(() => debts.filter(d =>
    (!fStatus || d.status === fStatus) &&
    (!fVenc || (fVenc === 'vencidas' ? (d.dueDate && d.dueDate < hojeStr && d.status !== 'quitada') : (d.dueDate && d.dueDate >= hojeStr && d.dueDate <= em30))) &&
    (!busca.trim() || `${d.creditor} ${d.description}`.toLowerCase().includes(busca.trim().toLowerCase()))
  ), [debts, fStatus, fVenc, busca, hojeStr, em30])

  const novo = () => { setForm({ id: uid(), creditor: '', description: '', total: '', remaining: '', installmentsTotal: '', installmentsPaid: '', dueDate: '', interestRate: '', status: 'em_aberto', notes: '', _edit: false }); setModal(true) }
  const editar = (d) => { setForm({ ...d, total: String(d.total ?? ''), remaining: String(d.remaining ?? ''), installmentsTotal: String(d.installmentsTotal ?? ''), installmentsPaid: String(d.installmentsPaid ?? ''), interestRate: d.interestRate != null ? String(d.interestRate) : '', _edit: true }); setModal(true) }

  const salvar = async () => {
    if (!form.creditor.trim()) { setToast({ msg: 'Informe o credor.', type: 'error' }); return }
    const d = {
      ...form, creditor: form.creditor.trim(),
      total: parseFloat(String(form.total).replace(',', '.')) || 0,
      remaining: parseFloat(String(form.remaining).replace(',', '.')) || 0,
      installmentsTotal: parseInt(form.installmentsTotal, 10) || null,
      installmentsPaid: parseInt(form.installmentsPaid, 10) || 0,
      interestRate: form.interestRate === '' ? null : parseFloat(String(form.interestRate).replace(',', '.')),
    }
    delete d._edit
    try {
      await onSaveDebt(d, form._edit)
      setModal(false); setForm(null)
      setToast({ msg: form._edit ? 'Dívida atualizada!' : 'Dívida cadastrada!', type: 'success' })
    } catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
  }

  const excluir = async () => {
    try { await onDeleteDebt(confirmId); setToast({ msg: 'Excluída.', type: 'success' }) }
    catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
    setConfirmId(null)
  }

  const columns = [
    { key: 'creditor', label: 'Credor', render: (v, r) => (
      <div><div style={{ fontWeight: 600 }}>{v}</div>{r.description && <div style={{ fontSize: 12, color: T.muted }}>{r.description}</div>}</div>
    )},
    { key: 'remaining', label: 'Saldo devedor', render: (v, r) => <div><div style={{ fontWeight: 700, color: T.red }}>{fmt(v)}</div><div style={{ fontSize: 12, color: T.muted }}>de {fmt(r.total)}</div></div> },
    { key: 'installmentsPaid', label: 'Parcelas', render: (v, r) => r.installmentsTotal ? (
      <div><div>{v}/{r.installmentsTotal}</div><div style={{ fontSize: 12, color: T.muted }}>{fmt(parcelaMensal(r))}/mês</div></div>
    ) : '—' },
    { key: 'dueDate', label: 'Vencimento', render: v => fd(v) },
    { key: 'status', label: 'Status', render: v => { const s = statusDividaInfo(v); return <Badge label={s.label} color={s.cor} bg={s.cor + '18'} /> } },
    { key: 'id', label: '', render: (_v, r) => (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <Btn sm variant="ghost" onClick={() => editar(r)}>Editar</Btn>
        <Btn sm variant="ghost" onClick={() => setConfirmId(r.id)} style={{ color: T.red, borderColor: T.red }}>Excluir</Btn>
      </div>
    )},
  ]

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {confirmId && <Confirm msg="Excluir esta dívida?" onYes={excluir} onNo={() => setConfirmId(null)} />}

      <PageHeader title="Dívidas" subtitle="Empréstimos, financiamentos e parcelamentos."
        actionLabel="Nova dívida" actionIcon="+" onAction={novo} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Total devedor</div><div style={{ fontWeight: 800, fontSize: 22, color: T.red, marginTop: 4 }}>{fmt(totalDevedor)}</div></Card>
        <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Parcelas do mês</div><div style={{ fontWeight: 800, fontSize: 22, color: T.orange, marginTop: 4 }}>{fmt(parcelasMes)}</div></Card>
        <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Dívidas ativas</div><div style={{ fontWeight: 800, fontSize: 22, color: T.text, marginTop: 4 }}>{debts.filter(d => d.status !== 'quitada').length}</div></Card>
      </div>

      {debts.length > 0 && (
        <FilterBar>
          <SearchInput value={busca} onChange={setBusca} placeholder="Buscar por credor ou descrição…" />
          <Select value={fStatus} onChange={e => setFStatus(e.target.value)} placeholder="Todos os status" options={STATUS_DIVIDA_PF.map(s => ({ value: s.id, label: s.label }))} style={{ marginBottom: 0, minWidth: 150 }} />
          <Select value={fVenc} onChange={e => setFVenc(e.target.value)} placeholder="Vencimento" options={[{ value: 'proximas', label: 'A vencer (30 dias)' }, { value: 'vencidas', label: 'Vencidas' }]} style={{ marginBottom: 0, minWidth: 150 }} />
        </FilterBar>
      )}

      <Card style={{ padding: 4 }}>
        <Table columns={columns} data={filtered} emptyState={
          <EmptyState icon="📉" title={debts.length ? 'Nenhum resultado para o filtro' : 'Nenhuma dívida cadastrada'} sub={debts.length ? 'Ajuste a busca ou os filtros.' : 'Cadastre empréstimos e parcelamentos para controlar.'}
            action={debts.length ? null : <Btn onClick={novo} icon="+">Nova dívida</Btn>} />
        } />
      </Card>

      {modal && form && (
        <Modal title={`${form._edit ? 'Editar' : 'Nova'} dívida`} onClose={() => { setModal(false); setForm(null) }}
          footer={<div style={{ display: 'flex', gap: 10, padding: 16 }}>
            <Btn full variant="ghost" onClick={() => { setModal(false); setForm(null) }}>Cancelar</Btn>
            <Btn full onClick={salvar}>Salvar</Btn>
          </div>}>
          <Input label="Credor" value={form.creditor} onChange={e => setForm(f => ({ ...f, creditor: e.target.value }))} placeholder="Ex.: Banco X" />
          <Input label="Descrição" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex.: Financiamento do carro" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Valor total (R$)" type="text" value={form.total} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} placeholder="0,00" style={{ marginBottom: 0 }} />
            <Input label="Saldo devedor (R$)" type="text" value={form.remaining} onChange={e => setForm(f => ({ ...f, remaining: e.target.value }))} placeholder="0,00" style={{ marginBottom: 0 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Total de parcelas" type="number" value={form.installmentsTotal} onChange={e => setForm(f => ({ ...f, installmentsTotal: e.target.value }))} placeholder="Ex.: 48" style={{ marginBottom: 0 }} />
            <Input label="Parcelas pagas" type="number" value={form.installmentsPaid} onChange={e => setForm(f => ({ ...f, installmentsPaid: e.target.value }))} placeholder="Ex.: 12" style={{ marginBottom: 0 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Próx. vencimento" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={{ marginBottom: 0 }} />
            <Input label="Juros (% a.m.)" type="text" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} placeholder="Opcional" style={{ marginBottom: 0 }} />
          </div>
          <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} options={STATUS_DIVIDA_PF.map(s => ({ value: s.id, label: s.label }))} />
          <Input label="Observações" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional" />
        </Modal>
      )}
    </div>
  )
}
