import { useState } from 'react'
import { T, fmt, fd, errMsgAcao } from '../../theme'
import { Card, Btn, Toast, Confirm, EmptyState, Badge } from '../../components/ui'
import { PageHeader } from '../pfui'
import { FREQ_RECORRENCIA_PF } from '../../personalData'

const freqLabel = (id) => FREQ_RECORRENCIA_PF.find(f => f.id === id)?.label || id

export default function PersonalRecorrentes({ recurrences = [], catsReceita = [], catsDespesa = [], onSaveRecurrence, onDeleteRecurrence, setPage }) {
  const [toast, setToast] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const catNome = (r) => {
    const list = r.tipo === 'receita' ? catsReceita : catsDespesa
    return list.find(c => c.id === r.categoria)?.nome || r.categoria || '—'
  }

  const togglePausar = async (r) => {
    try { await onSaveRecurrence({ ...r, status: r.status === 'ativo' ? 'inativo' : 'ativo' }, true); setToast({ msg: r.status === 'ativo' ? 'Recorrência pausada.' : 'Recorrência reativada.', type: 'success' }) }
    catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
  }
  const excluir = async () => {
    try { await onDeleteRecurrence(confirmId); setToast({ msg: 'Recorrência excluída (lançamentos já gerados são mantidos).', type: 'success' }) }
    catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
    setConfirmId(null)
  }

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {confirmId && <Confirm msg="Excluir esta recorrência? Os lançamentos já criados não são apagados." onYes={excluir} onNo={() => setConfirmId(null)} />}

      <PageHeader title="Recorrentes" subtitle="Modelos de receitas/despesas que se repetem. Crie marcando “Repetir” ao lançar em Receitas ou Despesas." />

      {recurrences.length === 0 ? (
        <Card style={{ padding: 0 }}>
          <EmptyState icon="🔁" title="Nenhuma recorrência" sub="Ao criar uma receita ou despesa, marque “Repetir automaticamente” para gerar os lançamentos sozinho."
            action={<Btn onClick={() => setPage('despesas')}>Ir para Despesas</Btn>} />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {recurrences.map(r => (
            <Card key={r.id} style={{ padding: 18, opacity: r.status === 'ativo' ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descricao || catNome(r)}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{catNome(r)} · {freqLabel(r.frequency)}</div>
                </div>
                <Badge label={r.status === 'ativo' ? 'Ativa' : 'Pausada'} color={r.status === 'ativo' ? T.green : T.muted} bg={(r.status === 'ativo' ? T.green : T.muted) + '18'} />
              </div>
              <div style={{ fontWeight: 800, fontSize: 20, color: r.tipo === 'receita' ? T.green : T.red, marginBottom: 8 }}>{fmt(r.valor)}</div>
              <div style={{ fontSize: 12, color: T.sub, marginBottom: 12 }}>
                Início {fd(r.startDate)}{r.endDate ? ` · até ${fd(r.endDate)}` : ''}{r.lastGenerated ? ` · último gerado ${fd(r.lastGenerated)}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn sm full variant="ghost" onClick={() => togglePausar(r)}>{r.status === 'ativo' ? 'Pausar' : 'Reativar'}</Btn>
                <Btn sm variant="ghost" onClick={() => setConfirmId(r.id)} style={{ color: T.red, borderColor: T.red }}>🗑</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
