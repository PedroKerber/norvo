import { useState, useEffect, useCallback } from 'react'
import { T, fd, errMsgAcao } from '../../theme'
import { Card, Btn, Modal, Input, Select, Toast, Confirm, EmptyState, Badge } from '../../components/ui'
import { PageHeader, PfBtn } from '../pfui'
import {
  getOrCreatePersonalSpace, updatePersonalSpace,
  getSpaceMembers, inviteSpaceMember, updateSpaceMemberRole, removeSpaceMember,
} from '../../personalSupabase'

const ROLES = [
  { id: 'admin', label: 'Administrador', desc: 'Vê tudo, lança, edita, exclui e convida/remove membros.' },
  { id: 'editor', label: 'Editor', desc: 'Vê tudo, lança e edita. Não gerencia usuários.' },
  { id: 'viewer', label: 'Leitura', desc: 'Apenas visualiza dashboard, relatórios e patrimônio.' },
]
const roleLabel = (r) => ROLES.find(x => x.id === r)?.label || r
const statusInfo = (s) => s === 'accepted'
  ? { label: 'Ativo', cor: T.green }
  : { label: 'Convite pendente', cor: T.yellow || T.orange }

export default function PersonalFamilia({ usuario }) {
  const [space, setSpace] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [toast, setToast] = useState(null)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sp = await getOrCreatePersonalSpace()
      if (!sp) { setUnavailable(true); return }
      setSpace(sp); setNameDraft(sp.name)
      const mem = await getSpaceMembers(sp.id)
      setMembers(mem)
    } catch (e) {
      // Tabela ausente (migration 0015 não aplicada) ou erro de acesso.
      setUnavailable(true)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const canManage = space && usuario && space.ownerId === usuario.id

  const salvarNome = async () => {
    if (!nameDraft.trim()) { setToast({ msg: 'Informe um nome para o espaço.', type: 'error' }); return }
    setSavingName(true)
    try {
      const isFamily = members.length > 0
      await updatePersonalSpace(space.id, { name: nameDraft.trim(), type: isFamily ? 'family' : space.type })
      setSpace(s => ({ ...s, name: nameDraft.trim(), type: isFamily ? 'family' : s.type }))
      setToast({ msg: 'Nome do espaço atualizado!', type: 'success' })
    } catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
    setSavingName(false)
  }

  const abrirConvite = () => { setForm({ nome: '', email: '', role: 'viewer' }); setModal(true) }
  const enviarConvite = async () => {
    const email = (form.email || '').trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setToast({ msg: 'Informe um e-mail válido.', type: 'error' }); return }
    if (usuario && email === (usuario.email || '').toLowerCase()) { setToast({ msg: 'Você já é o administrador deste espaço.', type: 'error' }); return }
    try {
      const saved = await inviteSpaceMember({ spaceId: space.id, email, role: form.role })
      setMembers(prev => prev.some(m => m.id === saved.id) ? prev.map(m => m.id === saved.id ? saved : m) : [...prev, saved])
      // Ao ganhar o 1º membro, o espaço passa a ser familiar.
      if (space.type !== 'family') { try { await updatePersonalSpace(space.id, { type: 'family' }); setSpace(s => ({ ...s, type: 'family' })) } catch (e) { /* best-effort */ } }
      setModal(false); setForm(null)
      setToast({ msg: 'Convite registrado! A pessoa poderá aceitar ao entrar com esse e-mail.', type: 'success' })
    } catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
  }

  const alterarRole = async (m, role) => {
    try { await updateSpaceMemberRole(m.id, role); setMembers(prev => prev.map(x => x.id === m.id ? { ...x, role } : x)) }
    catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
  }
  const remover = async () => {
    try { await removeSpaceMember(confirmId); setMembers(prev => prev.filter(x => x.id !== confirmId)); setToast({ msg: 'Membro removido.', type: 'success' }) }
    catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
    setConfirmId(null)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '80px 20px', color: T.muted, fontSize: 14 }}>Carregando seu espaço familiar…</div>

  if (unavailable) {
    return (
      <div>
        <PageHeader title="Família" subtitle="Compartilhe seu financeiro com quem você confia." />
        <Card style={{ padding: 0 }}>
          <EmptyState icon="👨‍👩‍👧" title="Recurso ainda não disponível"
            sub="A base de compartilhamento familiar precisa ser ativada no banco de dados (migration 0015). Assim que aplicada, esta tela funciona automaticamente." />
        </Card>
      </div>
    )
  }

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {confirmId && <Confirm msg="Remover esta pessoa do seu espaço? Ela perde o acesso compartilhado." onYes={remover} onNo={() => setConfirmId(null)} />}

      <PageHeader title="Família" subtitle="Compartilhe seu financeiro com quem você confia."
        right={canManage ? <PfBtn icon="+" onClick={abrirConvite}>Convidar membro</PfBtn> : null} />

      <div style={{ background: T.blueL, border: `1px solid ${T.blue}22`, borderRadius: 12, padding: '12px 16px', marginBottom: 18, fontSize: 13.5, color: T.text, lineHeight: 1.5 }}>
        Convide uma pessoa de confiança (cônjuge, família) para acompanhar ou gerenciar sua vida financeira junto com você.
        Cada pessoa entra com o <strong>login próprio</strong> — nada de compartilhar senha.
      </div>

      {/* Nome do espaço */}
      <Card style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ fontSize: 12, color: T.sub, marginBottom: 6 }}>Nome do espaço financeiro</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input value={nameDraft} onChange={e => setNameDraft(e.target.value)} placeholder="Ex.: Família Kerber"
            style={{ marginBottom: 0, flex: '1 1 240px' }} />
          {canManage && <Btn onClick={salvarNome} disabled={savingName || nameDraft.trim() === space.name}>{savingName ? 'Salvando…' : 'Salvar'}</Btn>}
          <Badge label={space.type === 'family' ? 'Familiar' : 'Individual'} color={T.primary} bg={T.primaryLight} />
        </div>
      </Card>

      {/* Membros */}
      <Card style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: T.text }}>Membros do espaço</div>

        {/* Dono (você) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 0', borderBottom: `1px solid ${T.borderLight}`, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: T.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
              {(usuario?.nome || usuario?.email || 'U')[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{usuario?.nome || 'Você'} <span style={{ color: T.muted, fontWeight: 400 }}>(você)</span></div>
              <div style={{ fontSize: 12, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.email || '—'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge label="Administrador" color={T.primary} bg={T.primaryLight} />
            <Badge label="Dono" color={T.green} bg={T.greenL} />
          </div>
        </div>

        {/* Convidados */}
        {members.length === 0 ? (
          <EmptyState icon="🤝" title="Nenhum membro convidado ainda"
            sub="Convide seu cônjuge ou alguém de confiança para compartilhar o financeiro."
            action={canManage ? <Btn onClick={abrirConvite} icon="+">Convidar membro</Btn> : null} />
        ) : (
          members.map(m => {
            const st = statusInfo(m.status)
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 0', borderBottom: `1px solid ${T.borderLight}`, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: T.borderLight, color: T.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                    {(m.email || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                    <div style={{ fontSize: 12, color: T.muted }}>Convidado em {fd(m.invitedAt)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Badge label={st.label} color={st.cor} bg={st.cor + '18'} />
                  {canManage ? (
                    <Select value={m.role} onChange={e => alterarRole(m, e.target.value)}
                      options={ROLES.map(r => ({ value: r.id, label: r.label }))} style={{ marginBottom: 0, minWidth: 150 }} />
                  ) : <Badge label={roleLabel(m.role)} color={T.sub} bg={T.borderLight} />}
                  {canManage && <Btn sm variant="ghost" onClick={() => setConfirmId(m.id)} style={{ color: T.red, borderColor: T.red }}>Remover</Btn>}
                </div>
              </div>
            )
          })
        )}
      </Card>

      {/* Modal de convite */}
      {modal && form && (
        <Modal title="Convidar membro" onClose={() => { setModal(false); setForm(null) }}
          footer={<div style={{ display: 'flex', gap: 10, padding: 16 }}>
            <Btn full variant="ghost" onClick={() => { setModal(false); setForm(null) }}>Cancelar</Btn>
            <Btn full onClick={enviarConvite}>Enviar convite</Btn>
          </div>}>
          <div style={{ fontSize: 13, color: T.sub, marginBottom: 14, lineHeight: 1.5 }}>
            Convide uma pessoa de confiança para acompanhar ou gerenciar sua vida financeira junto com você.
          </div>
          <Input label="Nome (opcional)" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex.: Lorena" />
          <Input label="E-mail" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
          <Select label="Permissão" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            options={ROLES.map(r => ({ value: r.id, label: r.label }))} />
          <div style={{ fontSize: 12, color: T.muted, background: T.bg, borderRadius: 8, padding: '10px 12px', marginTop: 4 }}>
            {ROLES.find(r => r.id === form.role)?.desc}
          </div>
        </Modal>
      )}
    </div>
  )
}
