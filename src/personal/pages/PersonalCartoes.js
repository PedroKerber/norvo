import { useState, useMemo } from 'react'
import { T, fmt, uid, errMsgAcao } from '../../theme'
import { Card, Btn, Modal, Input, Select, Toast, Confirm, EmptyState, Badge } from '../../components/ui'
import { BANDEIRAS_CARTAO_PF, CORES_CARTAO_PF } from '../../personalData'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const ABERTO = ['A Pagar', 'Pendente', 'Atrasado']

export default function PersonalCartoes({ cards, transactions, onSaveCard, onDeleteCard }) {
  const [modal, setModal] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState(null)

  const hoje = new Date()
  const mesAtual = hoje.toISOString().slice(0, 7)

  // Métricas por cartão a partir das transações reais (despesas com credit_card_id)
  const metrics = useMemo(() => {
    const m = {}
    cards.forEach(c => { m[c.id] = { usado: 0, fatura: 0, futuras: {} } })
    transactions.forEach(t => {
      if (t.tipo !== 'despesa' || !t.cartaoId || !m[t.cartaoId]) return
      if (ABERTO.includes(t.status)) m[t.cartaoId].usado += t.valor || 0
      const comp = (t.data || '').slice(0, 7)
      if (comp === mesAtual) m[t.cartaoId].fatura += t.valor || 0
      else if (comp > mesAtual) m[t.cartaoId].futuras[comp] = (m[t.cartaoId].futuras[comp] || 0) + (t.valor || 0)
    })
    return m
  }, [cards, transactions, mesAtual])

  const totalLimite = useMemo(() => cards.reduce((s, c) => s + (c.limit || 0), 0), [cards])
  const totalUsado  = useMemo(() => cards.reduce((s, c) => s + (metrics[c.id]?.usado || 0), 0), [cards, metrics])

  const novo = () => { setForm({ id: uid(), name: '', institution: '', brand: 'Visa', limit: '', closingDay: '', dueDay: '', color: CORES_CARTAO_PF[0], isActive: true, _edit: false }); setModal(true) }
  const editar = (c) => { setForm({ ...c, limit: String(c.limit ?? ''), closingDay: String(c.closingDay ?? ''), dueDay: String(c.dueDay ?? ''), _edit: true }); setModal(true) }

  const salvar = async () => {
    if (!form.name.trim()) { setToast({ msg: 'Informe o nome do cartão.', type: 'error' }); return }
    const c = {
      ...form, name: form.name.trim(),
      limit: parseFloat(String(form.limit).replace(',', '.')) || 0,
      closingDay: parseInt(form.closingDay, 10) || null,
      dueDay: parseInt(form.dueDay, 10) || null,
    }
    delete c._edit
    try {
      await onSaveCard(c, form._edit)
      setModal(false); setForm(null)
      setToast({ msg: form._edit ? 'Cartão atualizado!' : 'Cartão cadastrado!', type: 'success' })
    } catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
  }

  const excluir = async () => {
    try { await onDeleteCard(confirmId); setToast({ msg: 'Cartão excluído.', type: 'success' }) }
    catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
    setConfirmId(null)
  }

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {confirmId && <Confirm msg="Excluir este cartão? As despesas ligadas a ele não são apagadas." onYes={excluir} onNo={() => setConfirmId(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: 0, color: T.text }}>Cartões</h1>
          <div style={{ color: T.sub, fontSize: 14, marginTop: 2 }}>Seus cartões de crédito e faturas.</div>
        </div>
        <Btn onClick={novo} icon="+">Novo cartão</Btn>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Limite total</div><div style={{ fontWeight: 800, fontSize: 22, color: T.text, marginTop: 4 }}>{fmt(totalLimite)}</div></Card>
        <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Limite usado</div><div style={{ fontWeight: 800, fontSize: 22, color: T.red, marginTop: 4 }}>{fmt(totalUsado)}</div></Card>
        <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Limite disponível</div><div style={{ fontWeight: 800, fontSize: 22, color: T.green, marginTop: 4 }}>{fmt(Math.max(0, totalLimite - totalUsado))}</div></Card>
      </div>

      {cards.length === 0 ? (
        <Card style={{ padding: 0 }}>
          <EmptyState icon="💳" title="Nenhum cartão cadastrado" sub="Cadastre um cartão para acompanhar limite e faturas."
            action={<Btn onClick={novo} icon="+">Novo cartão</Btn>} />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {cards.map(c => {
            const mt = metrics[c.id] || { usado: 0, fatura: 0, futuras: {} }
            const disp = Math.max(0, (c.limit || 0) - mt.usado)
            const pctUso = c.limit > 0 ? Math.min(100, Math.round(mt.usado / c.limit * 100)) : 0
            const futuras = Object.entries(mt.futuras).sort().slice(0, 3)
            return (
              <Card key={c.id} style={{ padding: 0, overflow: 'hidden' }}>
                {/* Cartão visual */}
                <div style={{ background: c.color || '#0D2545', color: '#fff', padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{c.institution || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{c.brand || ''}</div>
                      {!c.isActive && <Badge label="Inativo" color="#fff" bg="rgba(255,255,255,0.25)" />}
                    </div>
                  </div>
                  <div style={{ marginTop: 18, fontSize: 11, opacity: 0.8 }}>Fatura do mês ({MESES[hoje.getMonth()]})</div>
                  <div style={{ fontWeight: 800, fontSize: 22 }}>{fmt(mt.fatura)}</div>
                </div>
                {/* Métricas */}
                <div style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.sub, marginBottom: 6 }}>
                    <span>Usado {fmt(mt.usado)}</span><span>Disponível {fmt(disp)}</span>
                  </div>
                  <div style={{ background: T.borderLight, borderRadius: 5, height: 8, overflow: 'hidden', marginBottom: 12 }}>
                    <div style={{ height: '100%', width: `${pctUso}%`, background: pctUso >= 80 ? T.red : pctUso >= 50 ? T.orange : T.green }} />
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 12, color: T.muted, marginBottom: 10 }}>
                    <span>Limite: <strong style={{ color: T.text }}>{fmt(c.limit)}</strong></span>
                    {c.closingDay && <span>Fecha dia {c.closingDay}</span>}
                    {c.dueDay && <span>Vence dia {c.dueDay}</span>}
                  </div>
                  {futuras.length > 0 && (
                    <div style={{ marginBottom: 10, fontSize: 12 }}>
                      <div style={{ color: T.sub, fontWeight: 600, marginBottom: 4 }}>Próximas faturas</div>
                      {futuras.map(([comp, v]) => {
                        const [y, mo] = comp.split('-')
                        return <div key={comp} style={{ display: 'flex', justifyContent: 'space-between', color: T.muted }}><span>{MESES[+mo - 1]}/{y}</span><span>{fmt(v)}</span></div>
                      })}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn sm full variant="ghost" onClick={() => editar(c)}>Editar</Btn>
                    <Btn sm full variant="ghost" onClick={() => setConfirmId(c.id)} style={{ color: T.red, borderColor: T.red }}>Excluir</Btn>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {modal && form && (
        <Modal title={`${form._edit ? 'Editar' : 'Novo'} cartão`} onClose={() => { setModal(false); setForm(null) }}
          footer={<div style={{ display: 'flex', gap: 10, padding: 16 }}>
            <Btn full variant="ghost" onClick={() => { setModal(false); setForm(null) }}>Cancelar</Btn>
            <Btn full onClick={salvar}>Salvar</Btn>
          </div>}>
          <Input label="Nome do cartão" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex.: Nubank Ultravioleta" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Banco / instituição" value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="Opcional" style={{ marginBottom: 0 }} />
            <Select label="Bandeira" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} options={BANDEIRAS_CARTAO_PF} style={{ marginBottom: 0 }} />
          </div>
          <Input label="Limite total (R$)" type="text" value={form.limit} onChange={e => setForm(f => ({ ...f, limit: e.target.value }))} placeholder="0,00" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Dia de fechamento" type="number" value={form.closingDay} onChange={e => setForm(f => ({ ...f, closingDay: e.target.value }))} placeholder="1-31" style={{ marginBottom: 0 }} />
            <Input label="Dia de vencimento" type="number" value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))} placeholder="1-31" style={{ marginBottom: 0 }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: T.text, marginBottom: 6 }}>Cor</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CORES_CARTAO_PF.map(cor => (
                <button key={cor} onClick={() => setForm(f => ({ ...f, color: cor }))}
                  style={{ width: 30, height: 30, borderRadius: 8, background: cor, border: form.color === cor ? `3px solid ${T.primary}` : '2px solid var(--border)', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <Select label="Status" value={form.isActive ? 'ativo' : 'inativo'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'ativo' }))}
            options={[{ value: 'ativo', label: 'Ativo' }, { value: 'inativo', label: 'Inativo' }]} />
        </Modal>
      )}
    </div>
  )
}
