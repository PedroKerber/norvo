import { useState, useMemo } from 'react'
import { T, fmt, fmtPct, fd, uid, errMsgAcao } from '../../theme'
import { Card, Btn, Modal, Input, Select, Table, Toast, Confirm, EmptyState, FilterBar, SearchInput } from '../../components/ui'
import { PageHeader } from '../pfui'
import { TIPOS_INVESTIMENTO_PF, LIQUIDEZ_PF, investTypeLabel } from '../../personalData'

export default function PersonalInvestimentos({ investments, onSaveInvestment, onDeleteInvestment }) {
  const [modal, setModal] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState(null)
  const [busca, setBusca] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [fInst, setFInst] = useState('')

  const totalInvestido = useMemo(() => investments.reduce((s, i) => s + (i.invested || 0), 0), [investments])
  const totalAtual = useMemo(() => investments.reduce((s, i) => s + (i.current || 0), 0), [investments])
  const variacao = totalAtual - totalInvestido
  const variacaoPct = totalInvestido > 0 ? (variacao / totalInvestido) * 100 : 0
  const instituicoes = useMemo(() => [...new Set(investments.map(i => i.institution).filter(Boolean))].sort(), [investments])
  const filtered = useMemo(() => investments.filter(i =>
    (!fTipo || i.type === fTipo) && (!fInst || i.institution === fInst) &&
    (!busca.trim() || (i.name || '').toLowerCase().includes(busca.trim().toLowerCase()))
  ), [investments, fTipo, fInst, busca])

  const novo = () => { setForm({ id: uid(), name: '', type: TIPOS_INVESTIMENTO_PF[0].id, institution: '', invested: '', current: '', profitability: '', date: new Date().toISOString().slice(0, 10), liquidity: LIQUIDEZ_PF[0], notes: '', _edit: false }); setModal(true) }
  const editar = (i) => { setForm({ ...i, invested: String(i.invested ?? ''), current: String(i.current ?? ''), profitability: i.profitability != null ? String(i.profitability) : '', _edit: true }); setModal(true) }

  const salvar = async () => {
    if (!form.name.trim()) { setToast({ msg: 'Informe o nome do investimento.', type: 'error' }); return }
    const inv = {
      ...form, name: form.name.trim(),
      invested: parseFloat(String(form.invested).replace(',', '.')) || 0,
      current: parseFloat(String(form.current).replace(',', '.')) || 0,
      profitability: form.profitability === '' ? null : parseFloat(String(form.profitability).replace(',', '.')),
    }
    delete inv._edit
    try {
      await onSaveInvestment(inv, form._edit)
      setModal(false); setForm(null)
      setToast({ msg: form._edit ? 'Investimento atualizado!' : 'Investimento cadastrado!', type: 'success' })
    } catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
  }

  const excluir = async () => {
    try { await onDeleteInvestment(confirmId); setToast({ msg: 'Excluído.', type: 'success' }) }
    catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
    setConfirmId(null)
  }

  const columns = [
    { key: 'name', label: 'Investimento', render: (v, r) => (
      <div><div style={{ fontWeight: 600 }}>{v}</div><div style={{ fontSize: 12, color: T.muted }}>{investTypeLabel(r.type)}{r.institution ? ` · ${r.institution}` : ''}</div></div>
    )},
    { key: 'invested', label: 'Aplicado', render: v => fmt(v) },
    { key: 'current', label: 'Atual', render: v => <span style={{ fontWeight: 700 }}>{fmt(v)}</span> },
    { key: 'id', label: 'Variação', render: (_v, r) => {
      const dif = (r.current || 0) - (r.invested || 0)
      const pct = r.invested > 0 ? (dif / r.invested) * 100 : 0
      return <span style={{ color: dif >= 0 ? T.green : T.red, fontWeight: 700 }}>{dif >= 0 ? '↑' : '↓'} {fmt(Math.abs(dif))} ({fmtPct(pct)})</span>
    }},
    { key: 'date', label: 'Aplicação', render: v => fd(v) },
    { key: 'liquidity', label: 'Liquidez', render: v => v || '—' },
    { key: 'notes', label: '', render: (_v, r) => (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <Btn sm variant="ghost" onClick={() => editar(r)}>Editar</Btn>
        <Btn sm variant="ghost" onClick={() => setConfirmId(r.id)} style={{ color: T.red, borderColor: T.red }}>Excluir</Btn>
      </div>
    )},
  ]

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {confirmId && <Confirm msg="Excluir este investimento?" onYes={excluir} onNo={() => setConfirmId(null)} />}

      <PageHeader title="Investimentos" subtitle="Sua carteira e evolução patrimonial." actionLabel="Novo investimento" actionIcon="+" onAction={novo} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Total investido</div><div style={{ fontWeight: 800, fontSize: 22, color: T.text, marginTop: 4 }}>{fmt(totalInvestido)}</div></Card>
        <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Patrimônio atual</div><div style={{ fontWeight: 800, fontSize: 22, color: T.blue, marginTop: 4 }}>{fmt(totalAtual)}</div></Card>
        <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Variação</div><div style={{ fontWeight: 800, fontSize: 22, color: variacao >= 0 ? T.green : T.red, marginTop: 4 }}>{variacao >= 0 ? '↑' : '↓'} {fmt(Math.abs(variacao))}</div><div style={{ fontSize: 12, color: variacao >= 0 ? T.green : T.red }}>{fmtPct(variacaoPct)}</div></Card>
      </div>

      {investments.length > 0 && (
        <FilterBar>
          <SearchInput value={busca} onChange={setBusca} placeholder="Buscar investimento…" />
          <Select value={fTipo} onChange={e => setFTipo(e.target.value)} placeholder="Todos os tipos" options={TIPOS_INVESTIMENTO_PF.map(t => ({ value: t.id, label: t.label }))} style={{ marginBottom: 0, minWidth: 150 }} />
          {instituicoes.length > 0 && <Select value={fInst} onChange={e => setFInst(e.target.value)} placeholder="Todas instituições" options={instituicoes} style={{ marginBottom: 0, minWidth: 150 }} />}
        </FilterBar>
      )}

      <Card style={{ padding: 4 }}>
        <Table columns={columns} data={filtered} emptyState={
          <EmptyState icon="💹" title={investments.length ? 'Nenhum resultado para o filtro' : 'Nenhum investimento cadastrado'} sub={investments.length ? 'Ajuste a busca ou os filtros.' : 'Adicione seus ativos para acompanhar a rentabilidade.'}
            action={investments.length ? null : <Btn onClick={novo} icon="+">Novo investimento</Btn>} />
        } />
      </Card>

      {modal && form && (
        <Modal title={`${form._edit ? 'Editar' : 'Novo'} investimento`} onClose={() => { setModal(false); setForm(null) }}
          footer={<div style={{ display: 'flex', gap: 10, padding: 16 }}>
            <Btn full variant="ghost" onClick={() => { setModal(false); setForm(null) }}>Cancelar</Btn>
            <Btn full onClick={salvar}>Salvar</Btn>
          </div>}>
          <Input label="Nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex.: Tesouro Selic 2029" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Tipo" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} options={TIPOS_INVESTIMENTO_PF.map(t => ({ value: t.id, label: t.label }))} style={{ marginBottom: 0 }} />
            <Input label="Instituição" value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="Opcional" style={{ marginBottom: 0 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Valor aplicado (R$)" type="text" value={form.invested} onChange={e => setForm(f => ({ ...f, invested: e.target.value }))} placeholder="0,00" style={{ marginBottom: 0 }} />
            <Input label="Valor atual (R$)" type="text" value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} placeholder="0,00" style={{ marginBottom: 0 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Rentabilidade (%)" type="text" value={form.profitability} onChange={e => setForm(f => ({ ...f, profitability: e.target.value }))} placeholder="Ex.: 12,5" style={{ marginBottom: 0 }} />
            <Input label="Data de aplicação" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ marginBottom: 0 }} />
          </div>
          <Select label="Liquidez" value={form.liquidity} onChange={e => setForm(f => ({ ...f, liquidity: e.target.value }))} options={LIQUIDEZ_PF} />
          <Input label="Observações" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional" />
        </Modal>
      )}
    </div>
  )
}
