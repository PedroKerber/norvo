import { useState, useMemo } from 'react'
import { T, fmt, fd, uid, errMsgAcao } from '../../theme'
import { Card, Btn, Modal, Input, Select, Toast, Confirm, EmptyState, Badge, FilterBar, SearchInput } from '../../components/ui'
import { PageHeader } from '../pfui'
import { CATS_META_PF, STATUS_META_PF, statusMetaInfo } from '../../personalData'

export default function PersonalMetas({ goals, onSaveGoal, onDeleteGoal }) {
  const [modal, setModal] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState(null)
  const [busca, setBusca] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fCat, setFCat] = useState('')

  const filtered = useMemo(() => goals.filter(g =>
    (!fStatus || g.status === fStatus) && (!fCat || g.category === fCat) &&
    (!busca.trim() || (g.name || '').toLowerCase().includes(busca.trim().toLowerCase()))
  ), [goals, fStatus, fCat, busca])
  const totalAlvo = useMemo(() => goals.reduce((s, g) => s + (g.target || 0), 0), [goals])
  const totalAtual = useMemo(() => goals.reduce((s, g) => s + (g.current || 0), 0), [goals])
  const ativas = goals.filter(g => g.status === 'ativa').length
  const concluidas = goals.filter(g => g.status === 'concluida').length

  const novo = () => { setForm({ id: uid(), name: '', target: '', current: '', deadline: '', category: CATS_META_PF[0], status: 'ativa', notes: '', _edit: false }); setModal(true) }
  const editar = (g) => { setForm({ ...g, target: String(g.target ?? ''), current: String(g.current ?? ''), _edit: true }); setModal(true) }

  const salvar = async () => {
    if (!form.name.trim()) { setToast({ msg: 'Informe o nome da meta.', type: 'error' }); return }
    const g = {
      ...form, name: form.name.trim(),
      target: parseFloat(String(form.target).replace(',', '.')) || 0,
      current: parseFloat(String(form.current).replace(',', '.')) || 0,
    }
    delete g._edit
    try {
      await onSaveGoal(g, form._edit)
      setModal(false); setForm(null)
      setToast({ msg: form._edit ? 'Meta atualizada!' : 'Meta criada!', type: 'success' })
    } catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
  }

  const excluir = async () => {
    try { await onDeleteGoal(confirmId); setToast({ msg: 'Meta excluída.', type: 'success' }) }
    catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
    setConfirmId(null)
  }

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {confirmId && <Confirm msg="Excluir esta meta?" onYes={excluir} onNo={() => setConfirmId(null)} />}

      <PageHeader title="Metas" subtitle="Seus objetivos financeiros."
        actionLabel="Nova meta" actionIcon="+" onAction={novo} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
        <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Total das metas</div><div style={{ fontWeight: 800, fontSize: 22, color: T.text, marginTop: 4 }}>{fmt(totalAlvo)}</div></Card>
        <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Já guardado</div><div style={{ fontWeight: 800, fontSize: 22, color: T.green, marginTop: 4 }}>{fmt(totalAtual)}</div></Card>
        <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Ativas</div><div style={{ fontWeight: 800, fontSize: 22, color: T.blue, marginTop: 4 }}>{ativas}</div></Card>
        <Card style={{ padding: '16px 20px' }}><div style={{ fontSize: 12, color: T.sub }}>Concluídas</div><div style={{ fontWeight: 800, fontSize: 22, color: T.green, marginTop: 4 }}>{concluidas}</div></Card>
      </div>

      {goals.length > 0 && (
        <FilterBar>
          <SearchInput value={busca} onChange={setBusca} placeholder="Buscar meta…" />
          <Select value={fStatus} onChange={e => setFStatus(e.target.value)} placeholder="Todos os status" options={STATUS_META_PF.map(s => ({ value: s.id, label: s.label }))} style={{ marginBottom: 0, minWidth: 150 }} />
          <Select value={fCat} onChange={e => setFCat(e.target.value)} placeholder="Todas categorias" options={CATS_META_PF} style={{ marginBottom: 0, minWidth: 150 }} />
        </FilterBar>
      )}

      {goals.length === 0 ? (
        <Card style={{ padding: 0 }}>
          <EmptyState icon="🎯" title="Nenhuma meta criada" sub="Defina um objetivo e acompanhe o progresso."
            action={<Btn onClick={novo} icon="+">Nova meta</Btn>} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: 0 }}>
          <EmptyState icon="🔍" title="Nenhum resultado para o filtro" sub="Ajuste a busca ou os filtros." />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(g => {
            const pct = g.target > 0 ? Math.min(100, Math.round((g.current || 0) / g.target * 100)) : 0
            const s = statusMetaInfo(g.status)
            return (
              <Card key={g.id} style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: T.text }}>{g.name}</div>
                    {g.category && <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{g.category}</div>}
                  </div>
                  <Badge label={s.label} color={s.cor} bg={s.cor + '18'} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, color: T.green }}>{fmt(g.current)}</span>
                  <span style={{ color: T.muted }}>de {fmt(g.target)}</span>
                </div>
                <div style={{ background: T.borderLight, borderRadius: 5, height: 10, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? T.green : T.primary, transition: 'width .4s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.sub, marginBottom: 12 }}>
                  <span>{pct}% concluído</span>
                  {g.deadline && <span>Prazo: {fd(g.deadline)}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn sm full variant="ghost" onClick={() => editar(g)}>Editar</Btn>
                  <Btn sm full variant="ghost" onClick={() => setConfirmId(g.id)} style={{ color: T.red, borderColor: T.red }}>Excluir</Btn>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {modal && form && (
        <Modal title={`${form._edit ? 'Editar' : 'Nova'} meta`} onClose={() => { setModal(false); setForm(null) }}
          footer={<div style={{ display: 'flex', gap: 10, padding: 16 }}>
            <Btn full variant="ghost" onClick={() => { setModal(false); setForm(null) }}>Cancelar</Btn>
            <Btn full onClick={salvar}>Salvar</Btn>
          </div>}>
          <Input label="Nome da meta" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex.: Reserva de emergência" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Valor alvo (R$)" type="text" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} placeholder="0,00" style={{ marginBottom: 0 }} />
            <Input label="Valor atual (R$)" type="text" value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} placeholder="0,00" style={{ marginBottom: 0 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Categoria" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} options={CATS_META_PF} style={{ marginBottom: 0 }} />
            <Input label="Prazo" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={{ marginBottom: 0 }} />
          </div>
          <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} options={STATUS_META_PF.map(s => ({ value: s.id, label: s.label }))} />
          <Input label="Observações" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional" />
        </Modal>
      )}
    </div>
  )
}
