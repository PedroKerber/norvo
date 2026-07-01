import { useState, useMemo } from 'react'
import { T, fmt, fd, uid, errMsgAcao } from '../../theme'
import { Card, Btn, Modal, Input, Select, Table, Toast, Confirm, EmptyState, StatusBadge } from '../../components/ui'
import { PageHeader, PfFilterBar, PfPeriodFilter, PfSelect, pfCurrentMonthPeriod } from '../pfui'
import { FORMAS_PAGAMENTO_PF, RECORRENCIAS_PF, FREQ_RECORRENCIA_PF } from '../../personalData'

// Gerenciador genérico de transações pessoais (receita/despesa).
// Reusado por PersonalReceitas e PersonalDespesas.
export default function TxManager({ tipo, title, accent, cats, statusOptions, transactions, accounts, cards = [], onSaveTx, onSaveTxBatch, onSaveRecurrence, onDeleteTx }) {
  const isReceita = tipo === 'receita'
  const hoje = new Date().toISOString().slice(0, 10)

  const [period, setPeriod] = useState(() => pfCurrentMonthPeriod())
  const [fCat, setFCat] = useState('')
  const [busca, setBusca] = useState('')
  const [fConta, setFConta] = useState('')
  const [fCartao, setFCartao] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [modal, setModal] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState(null)

  // cats = todas (para RESOLVER nome/cor, inclusive inativas/removidas dos registros antigos)
  // catsAtivas = só as ativas (para os DROPDOWNS de seleção)
  const catsAtivas = useMemo(() => cats.filter(c => c.active !== false), [cats])
  const catNome = (id) => cats.find(c => c.id === id)?.nome || id || '—'
  const catCor  = (id) => cats.find(c => c.id === id)?.cor || T.muted
  const contaNome = (id) => accounts.find(a => a.id === id)?.nome || '—'
  const defaultPeriod = pfCurrentMonthPeriod()
  const periodChanged = period.from !== defaultPeriod.from || period.to !== defaultPeriod.to

  // Chips rápidos de status (data-driven). Tokens especiais: __rec (recorrentes), __card (via cartão).
  const statusChips = isReceita
    ? [{ value: '', label: 'Todas' }, { value: 'Recebida', label: 'Recebidas' }, { value: 'A receber', label: 'A receber' }, { value: '__rec', label: 'Recorrentes' }]
    : [{ value: '', label: 'Todas' }, { value: 'Pago', label: 'Pago' }, { value: 'A Pagar', label: 'A pagar' }, { value: 'Atrasado', label: 'Vencidas' }, { value: '__card', label: 'Cartão' }]

  const lista = useMemo(() => {
    let l = transactions.filter(t => t.tipo === tipo)
    if (period) l = l.filter(t => { const d = t.data || ''; return d >= period.from && d <= period.to })
    if (fCat) l = l.filter(t => t.categoria === fCat)
    if (fConta) l = l.filter(t => t.accountId === fConta)
    if (fCartao) l = l.filter(t => t.cartaoId === fCartao)
    if (fStatus === '__rec') l = l.filter(t => t.recurrenceId)
    else if (fStatus === '__card') l = l.filter(t => t.cartaoId)
    else if (fStatus) l = l.filter(t => t.status === fStatus)
    if (busca.trim()) { const q = busca.trim().toLowerCase(); l = l.filter(t => (t.desc || '').toLowerCase().includes(q) || catNome(t.categoria).toLowerCase().includes(q)) }
    return l
  }, [transactions, tipo, period, fCat, fConta, fCartao, fStatus, busca]) // eslint-disable-line react-hooks/exhaustive-deps

  const total = useMemo(() => lista.reduce((s, t) => s + (t.valor || 0), 0), [lista])

  const novo = () => {
    setForm({ id: uid(), tipo, data: hoje, valor: '', categoria: catsAtivas[0]?.id || '', desc: '',
      accountId: accounts[0]?.id || '', cartaoId: '', forma: isReceita ? '' : 'Pix',
      recorrencia: isReceita ? '' : 'Único', status: statusOptions[0], anexoUrl: '',
      recorrente: false, frequency: 'mensal', endDate: '', parcelar: false, parcelas: '', _edit: false })
    setModal(true)
  }
  const editar = (row) => { setForm({ ...row, valor: String(row.valor ?? ''), _edit: true }); setModal(true) }

  const salvar = async () => {
    const valorNum = parseFloat(String(form.valor).replace(',', '.')) || 0
    if (valorNum <= 0) { setToast({ msg: 'Informe um valor válido.', type: 'error' }); return }
    try {
      // Parcelamento: gera N parcelas mensais (só na criação)
      if (!form._edit && form.parcelar && parseInt(form.parcelas, 10) > 1) {
        const n = Math.min(360, parseInt(form.parcelas, 10))
        const groupId = uid()
        const valorParcela = Math.round((valorNum / n) * 100) / 100
        const items = []
        for (let i = 0; i < n; i++) {
          const d = new Date(form.data); d.setMonth(d.getMonth() + i)
          items.push({ id: uid(), tipo, valor: valorParcela, data: d.toISOString().slice(0, 10), categoria: form.categoria,
            desc: `${form.desc || catNome(form.categoria)} (${i + 1}/${n})`, accountId: form.accountId, cartaoId: form.cartaoId,
            forma: form.forma, status: i === 0 ? form.status : 'A Pagar', installmentId: groupId, parcelaNum: i + 1, parcelaTotal: n })
        }
        await onSaveTxBatch(items)
        setModal(false); setForm(null)
        setToast({ msg: `${n} parcelas de ${fmt(valorParcela)} criadas!`, type: 'success' }); return
      }
      // Recorrência: cria o modelo (a geração dos lançamentos é automática)
      if (!form._edit && form.recorrente) {
        await onSaveRecurrence({ tipo, valor: valorNum, categoria: form.categoria, desc: form.desc, accountId: form.accountId,
          cardId: form.cartaoId, frequency: form.frequency || 'mensal', startDate: form.data, endDate: form.endDate || null, status: 'ativo' })
        setModal(false); setForm(null)
        setToast({ msg: 'Recorrência criada! Os lançamentos são gerados automaticamente.', type: 'success' }); return
      }
      // Lançamento único
      const item = { ...form, valor: valorNum }
      delete item._edit; delete item.recorrente; delete item.frequency; delete item.endDate; delete item.parcelar; delete item.parcelas
      await onSaveTx(item, form._edit)
      setModal(false); setForm(null)
      setToast({ msg: form._edit ? 'Atualizado com sucesso!' : 'Lançamento salvo!', type: 'success' })
    } catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
  }

  const excluir = async () => {
    try { await onDeleteTx(confirmId); setToast({ msg: 'Excluído.', type: 'success' }) }
    catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
    setConfirmId(null)
  }

  const columns = [
    { key: 'data', label: 'Data', render: v => fd(v) },
    { key: 'desc', label: 'Descrição', render: (v, r) => v || catNome(r.categoria) },
    { key: 'categoria', label: 'Categoria', render: v => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: catCor(v) }} />{catNome(v)}
      </span>
    )},
    { key: 'accountId', label: 'Conta', render: v => contaNome(v) },
    { key: 'status', label: 'Status', render: v => v ? <StatusBadge status={v} /> : '—' },
    { key: 'valor', label: 'Valor', render: v => <span style={{ fontWeight: 700, color: accent }}>{fmt(v)}</span> },
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
      {confirmId && <Confirm msg="Deseja excluir este lançamento?" onYes={excluir} onNo={() => setConfirmId(null)} />}

      <PageHeader title={title} subtitle={`Controle suas ${title.toLowerCase()} pessoais.`}
        actionLabel={`Nova ${isReceita ? 'receita' : 'despesa'}`} actionIcon="+" onAction={novo} />

      {/* Resumo do período */}
      <Card style={{ padding: '14px 20px', marginBottom: 14, display: 'inline-block' }}>
        <div style={{ fontSize: 12, color: T.sub }}>Total no período</div>
        <div style={{ fontWeight: 800, fontSize: 24, color: accent, marginTop: 4 }}>{fmt(total)}</div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{lista.length} lançamento(s)</div>
      </Card>

      {/* Filtros premium */}
      <PfFilterBar
        search={busca} onSearch={setBusca} searchPlaceholder="Buscar por descrição ou categoria…"
        segments={{ value: fStatus, onChange: setFStatus, options: statusChips }}
        inline={<PfPeriodFilter value={period} onChange={setPeriod} onClear={() => setPeriod(pfCurrentMonthPeriod())} />}
        more={<>
          <PfSelect value={fCat} onChange={e => setFCat(e.target.value)} placeholder="Todas as categorias" options={catsAtivas.map(c => ({ value: c.id, label: c.nome }))} />
          <PfSelect value={fConta} onChange={e => setFConta(e.target.value)} placeholder="Todas as contas" options={accounts.map(a => ({ value: a.id, label: a.nome }))} />
          {!isReceita && cards.length > 0 && (
            <PfSelect value={fCartao} onChange={e => setFCartao(e.target.value)} placeholder="Todos os cartões" options={cards.map(c => ({ value: c.id, label: c.name }))} />
          )}
        </>}
        chips={[
          fCat && { label: `Categoria: ${catNome(fCat)}`, onRemove: () => setFCat('') },
          fConta && { label: `Conta: ${contaNome(fConta)}`, onRemove: () => setFConta('') },
          fCartao && { label: `Cartão: ${cards.find(c => c.id === fCartao)?.name || ''}`, onRemove: () => setFCartao('') },
          periodChanged && { label: `Período: ${period.label}`, onRemove: () => setPeriod(pfCurrentMonthPeriod()) },
          fStatus && { label: `Status: ${statusChips.find(s => s.value === fStatus)?.label || fStatus}`, onRemove: () => setFStatus('') },
        ]}
        onClear={(busca || fCat || fConta || fCartao || fStatus || periodChanged)
          ? () => { setBusca(''); setFCat(''); setFConta(''); setFCartao(''); setFStatus(''); setPeriod(pfCurrentMonthPeriod()) }
          : null}
      />

      {/* Tabela */}
      <Card style={{ padding: 4 }}>
        <Table columns={columns} data={lista} emptyState={
          <EmptyState icon={isReceita ? '💰' : '🧾'} title={`Nenhuma ${isReceita ? 'receita' : 'despesa'} no período`}
            sub="Adicione seu primeiro lançamento para começar." action={<Btn onClick={novo} icon="+">Nova {isReceita ? 'receita' : 'despesa'}</Btn>} />
        } />
      </Card>

      {/* Modal form */}
      {modal && form && (
        <Modal title={`${form._edit ? 'Editar' : 'Nova'} ${isReceita ? 'receita' : 'despesa'}`} onClose={() => { setModal(false); setForm(null) }}
          footer={<div style={{ display: 'flex', gap: 10, padding: 16 }}>
            <Btn full variant="ghost" onClick={() => { setModal(false); setForm(null) }}>Cancelar</Btn>
            <Btn full onClick={salvar}>Salvar</Btn>
          </div>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Data" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} style={{ marginBottom: 0 }} />
            <Input label="Valor (R$)" type="text" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" style={{ marginBottom: 0 }} />
          </div>
          <Select label="Categoria" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
            options={catsAtivas.map(c => ({ value: c.id, label: `${c.icon || ''} ${c.nome}`.trim() }))} />
          <Input label="Descrição" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="Opcional" />
          <Select label="Conta" value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
            placeholder={accounts.length ? 'Selecione' : 'Cadastre uma conta em Contas'}
            options={accounts.map(a => ({ value: a.id, label: a.nome }))} />
          {!isReceita && cards.length > 0 && (
            <Select label="Cartão de crédito (opcional)" value={form.cartaoId || ''} onChange={e => setForm(f => ({ ...f, cartaoId: e.target.value }))}
              placeholder="Nenhum" options={cards.map(c => ({ value: c.id, label: c.name }))} />
          )}
          {!isReceita && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Select label="Forma de pagamento" value={form.forma} onChange={e => setForm(f => ({ ...f, forma: e.target.value }))} options={FORMAS_PAGAMENTO_PF} style={{ marginBottom: 0 }} />
              <Select label="Recorrência" value={form.recorrencia} onChange={e => setForm(f => ({ ...f, recorrencia: e.target.value }))} options={RECORRENCIAS_PF} style={{ marginBottom: 0 }} />
            </div>
          )}
          <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} options={statusOptions} />
          <Input label="Anexo (link, opcional)" value={form.anexoUrl} onChange={e => setForm(f => ({ ...f, anexoUrl: e.target.value }))} placeholder="https://..." />

          {!form._edit && (
            <div style={{ marginTop: 6, paddingTop: 12, borderTop: `1px solid ${T.borderLight}` }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.text, cursor: 'pointer', marginBottom: form.recorrente ? 10 : 0 }}>
                <input type="checkbox" checked={form.recorrente} onChange={e => setForm(f => ({ ...f, recorrente: e.target.checked, parcelar: e.target.checked ? false : f.parcelar }))} />
                🔁 Repetir automaticamente (recorrente)
              </label>
              {form.recorrente && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Select label="Frequência" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} options={FREQ_RECORRENCIA_PF.map(x => ({ value: x.id, label: x.label }))} style={{ marginBottom: 0 }} />
                  <Input label="Repetir até (opcional)" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={{ marginBottom: 0 }} />
                </div>
              )}
              {!isReceita && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.text, cursor: 'pointer', marginTop: 12, marginBottom: form.parcelar ? 10 : 0 }}>
                  <input type="checkbox" checked={form.parcelar} onChange={e => setForm(f => ({ ...f, parcelar: e.target.checked, recorrente: e.target.checked ? false : f.recorrente }))} />
                  💳 Parcelar esta despesa
                </label>
              )}
              {!isReceita && form.parcelar && (
                <>
                  <Input label="Número de parcelas" type="number" value={form.parcelas} onChange={e => setForm(f => ({ ...f, parcelas: e.target.value }))} placeholder="Ex.: 12" style={{ marginBottom: 6 }} />
                  {parseInt(form.parcelas, 10) > 1 && parseFloat(String(form.valor).replace(',', '.')) > 0 && (
                    <div style={{ fontSize: 12, color: T.muted }}>{form.parcelas}× de {fmt((parseFloat(String(form.valor).replace(',', '.')) || 0) / parseInt(form.parcelas, 10))} · o valor informado acima é o total.</div>
                  )}
                </>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
