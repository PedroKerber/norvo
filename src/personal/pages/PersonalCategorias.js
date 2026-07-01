import { useState } from 'react'
import { T, uid, errMsgAcao } from '../../theme'
import { Card, Btn, Modal, Input, Select, Toast, Confirm, EmptyState, Badge, FilterBar, SearchInput } from '../../components/ui'
import { PageHeader } from '../pfui'
import { TIPOS_CATEGORIA_PF, CORES_CATEGORIA_PF } from '../../personalData'

const tipoLabel = (t) => TIPOS_CATEGORIA_PF.find(x => x.id === t)?.label || t

export default function PersonalCategorias({ categories, onSaveCategory, onDeleteCategory }) {
  const [modal, setModal] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState(null)
  const [busca, setBusca] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [fAtivo, setFAtivo] = useState('')

  const filtered = categories.filter(c =>
    (!fTipo || c.type === fTipo) &&
    (!fAtivo || (fAtivo === 'ativa' ? c.isActive : !c.isActive)) &&
    (!busca.trim() || (c.name || '').toLowerCase().includes(busca.trim().toLowerCase()))
  )

  const novo = () => { setForm({ id: uid(), name: '', type: 'despesa', color: CORES_CATEGORIA_PF[0], isActive: true, _edit: false }); setModal(true) }
  const editar = (c) => { setForm({ ...c, _edit: true }); setModal(true) }

  const salvar = async () => {
    if (!form.name.trim()) { setToast({ msg: 'Informe o nome da categoria.', type: 'error' }); return }
    const c = { ...form, name: form.name.trim() }
    delete c._edit
    try {
      await onSaveCategory(c, form._edit)
      setModal(false); setForm(null)
      setToast({ msg: form._edit ? 'Categoria atualizada!' : 'Categoria criada!', type: 'success' })
    } catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
  }

  const toggleAtiva = async (c) => {
    try { await onSaveCategory({ ...c, isActive: !c.isActive }, true) }
    catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
  }

  const excluir = async () => {
    try { await onDeleteCategory(confirmId); setToast({ msg: 'Categoria excluída.', type: 'success' }) }
    catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
    setConfirmId(null)
  }

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {confirmId && <Confirm msg="Excluir esta categoria? Lançamentos antigos que a usam não são apagados (mas perdem o nome). Prefira inativar." onYes={excluir} onNo={() => setConfirmId(null)} />}

      <PageHeader title="Categorias" subtitle="Suas categorias personalizadas (somam às padrão do sistema)."
        actionLabel="Nova categoria" actionIcon="+" onAction={novo} />

      {categories.length > 0 && (
        <FilterBar>
          <SearchInput value={busca} onChange={setBusca} placeholder="Buscar categoria…" />
          <Select value={fTipo} onChange={e => setFTipo(e.target.value)} placeholder="Todos os tipos" options={TIPOS_CATEGORIA_PF.map(t => ({ value: t.id, label: t.label }))} style={{ marginBottom: 0, minWidth: 150 }} />
          <Select value={fAtivo} onChange={e => setFAtivo(e.target.value)} placeholder="Ativas e inativas" options={[{ value: 'ativa', label: 'Só ativas' }, { value: 'inativa', label: 'Só inativas' }]} style={{ marginBottom: 0, minWidth: 150 }} />
        </FilterBar>
      )}

      {categories.length === 0 ? (
        <Card style={{ padding: 0 }}>
          <EmptyState icon="🏷️" title="Nenhuma categoria personalizada" sub="As categorias padrão continuam disponíveis. Crie as suas para complementar."
            action={<Btn onClick={novo} icon="+">Nova categoria</Btn>} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: 0 }}>
          <EmptyState icon="🔍" title="Nenhum resultado para o filtro" sub="Ajuste a busca ou os filtros." />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {filtered.map(c => (
            <Card key={c.id} style={{ padding: 16, opacity: c.isActive ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{tipoLabel(c.type)}</div>
                </div>
                <Badge label={c.isActive ? 'Ativa' : 'Inativa'} color={c.isActive ? T.green : T.muted} bg={(c.isActive ? T.green : T.muted) + '18'} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn sm full variant="ghost" onClick={() => editar(c)}>Editar</Btn>
                <Btn sm full variant="ghost" onClick={() => toggleAtiva(c)}>{c.isActive ? 'Inativar' : 'Ativar'}</Btn>
                <Btn sm variant="ghost" onClick={() => setConfirmId(c.id)} style={{ color: T.red, borderColor: T.red }}>🗑</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modal && form && (
        <Modal title={`${form._edit ? 'Editar' : 'Nova'} categoria`} onClose={() => { setModal(false); setForm(null) }}
          footer={<div style={{ display: 'flex', gap: 10, padding: 16 }}>
            <Btn full variant="ghost" onClick={() => { setModal(false); setForm(null) }}>Cancelar</Btn>
            <Btn full onClick={salvar}>Salvar</Btn>
          </div>}>
          <Input label="Nome da categoria" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex.: Pet, Investimento anjo…" />
          <Select label="Tipo" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            options={TIPOS_CATEGORIA_PF.map(t => ({ value: t.id, label: t.label }))} />
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: T.text, marginBottom: 6 }}>Cor</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CORES_CATEGORIA_PF.map(cor => (
                <button key={cor} onClick={() => setForm(f => ({ ...f, color: cor }))}
                  style={{ width: 30, height: 30, borderRadius: '50%', background: cor, border: form.color === cor ? `3px solid ${T.primary}` : '2px solid var(--border)', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <Select label="Status" value={form.isActive ? 'ativa' : 'inativa'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'ativa' }))}
            options={[{ value: 'ativa', label: 'Ativa' }, { value: 'inativa', label: 'Inativa' }]} />
        </Modal>
      )}
    </div>
  )
}
