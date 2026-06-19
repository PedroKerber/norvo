import { useState, useMemo } from 'react'
import { T } from '../theme'
import { Card, Btn, Modal } from '../components/ui'
import EmpresaModal from '../components/EmpresaModal'
import { labelSegmento, labelPlano, getCorPlano } from '../modules'

export default function Empresas({ setPage, empresas = [], onSaveEmpresa, onUpdateEmpresa, onSetStatus, plano = 'basico', limiteEmpresas = 1 }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('Todas')
  const [ordem, setOrdem] = useState('Nome (A-Z)')
  const [modal, setModal] = useState(null)          // null | 'add' | 'edit'
  const [editEmp, setEditEmp] = useState(null)
  const [saving, setSaving] = useState(false)
  const [limitErr, setLimitErr] = useState(null)

  const ativasCount   = empresas.filter(e => e.status !== 'inativa').length
  const noLimitInfinite = limiteEmpresas === Infinity
  const atingiuLimite   = !noLimitInfinite && ativasCount >= limiteEmpresas

  const lista = useMemo(() => {
    let list = [...empresas]
    if (status === 'Ativa')   list = list.filter(e => e.status !== 'inativa')
    if (status === 'Inativa') list = list.filter(e => e.status === 'inativa')
    if (search) list = list.filter(e => e.nome.toLowerCase().includes(search.toLowerCase()) || (e.cnpj || '').includes(search))
    if (ordem === 'Nome (A-Z)') list.sort((a, b) => a.nome.localeCompare(b.nome))
    if (ordem === 'Nome (Z-A)') list.sort((a, b) => b.nome.localeCompare(a.nome))
    return list
  }, [empresas, search, status, ordem])

  const abrirAdd = () => {
    if (atingiuLimite) { setLimitErr({ limite: limiteEmpresas, plano: labelPlano(plano) }); return }
    setEditEmp(null); setModal('add')
  }
  const abrirEdit = (emp) => { setEditEmp(emp); setModal('edit') }

  const handleSubmit = (form) => {
    setSaving(true)
    if (modal === 'edit' && editEmp) {
      if (onUpdateEmpresa) onUpdateEmpresa(editEmp.id, form)
      setModal(null); setEditEmp(null); setSaving(false)
    } else {
      if (onSaveEmpresa) {
        onSaveEmpresa(form, (limite, nomeP) => {
          setSaving(false); setModal(null); setLimitErr({ limite, plano: nomeP })
        })
      }
      setModal(null); setSaving(false)
    }
  }

  const toggleStatus = (emp) => {
    if (onSetStatus) onSetStatus(emp.id, emp.status === 'inativa' ? 'ativa' : 'inativa')
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: T.text }}>
      {/* Header */}
      <div className="page-hd">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Empresas</h1>
          <div style={{ color: T.sub, fontSize: 14 }}>Gerencie todas as empresas do grupo.</div>
        </div>
        <Btn onClick={abrirAdd} icon="＋" disabled={atingiuLimite}>Nova Empresa</Btn>
      </div>

      {/* KPIs */}
      <div className="g-4">
        {[
          { icon: '🏢', bg: T.blueL, label: 'Total de Empresas', value: empresas.length },
          { icon: '✅', bg: T.greenL, label: 'Empresas Ativas', value: ativasCount },
          { icon: '⏸', bg: T.borderLight, label: 'Limite do Plano', value: noLimitInfinite ? 'Ilimitado' : `${ativasCount} / ${limiteEmpresas}` },
          { icon: '🔑', bg: T.purpleL, label: 'Plano Atual', value: labelPlano(plano), cor: getCorPlano(plano) },
        ].map(k => (
          <Card key={k.label} style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: k.bg, borderRadius: 10, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{k.icon}</div>
              <div>
                <div style={{ color: T.sub, fontSize: 12 }}>{k.label}</div>
                <div style={{ fontWeight: 800, fontSize: 24, color: k.cor || 'inherit' }}>{k.value}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card style={{ padding: '14px 18px', marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empresa por nome ou CNPJ..."
              style={{ width: '100%', paddingLeft: 32, padding: '8px 12px 8px 32px', border: `1.5px solid ${T.border}`, borderRadius: 8, background: T.white, color: T.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          {[
            { label: 'Status', value: status, opts: ['Todas', 'Ativa', 'Inativa'], set: setStatus },
            { label: 'Ordenar por', value: ordem, opts: ['Nome (A-Z)', 'Nome (Z-A)'], set: setOrdem },
          ].map(f => (
            <select key={f.label} value={f.value} onChange={e => f.set(e.target.value)}
              style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', color: T.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
              {f.opts.map(o => <option key={o}>{o}</option>)}
            </select>
          ))}
        </div>
      </Card>

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {lista.map(emp => {
          const inativa = emp.status === 'inativa'
          return (
            <Card key={emp.id} style={{ padding: '18px 22px', opacity: inativa ? 0.7 : 1 }}>
              <div className="emp-card-row">
                <div style={{ width: 60, height: 60, borderRadius: 12, background: (emp.cor || T.primary) + '18', border: `2px solid ${(emp.cor || T.primary)}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: emp.cor || T.primary, fontWeight: 900, fontSize: 16, letterSpacing: -1 }}>{emp.initials}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{emp.nome}</div>
                  <div style={{ color: T.sub, fontSize: 13, marginBottom: 6 }}>{emp.cnpj || '—'}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {inativa
                      ? <span style={{ background: T.borderLight, color: T.muted, fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '2px 8px' }}>Inativa</span>
                      : <span style={{ background: T.greenL, color: T.green, fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '2px 8px' }}>Ativa</span>}
                    {(emp.setor || emp.segmento) && <span style={{ background: T.blueL, color: '#2563eb', fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '2px 8px' }}>{emp.setor || labelSegmento(emp.segmento)}</span>}
                  </div>
                </div>
                <div className="emp-card-meta">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <div style={{ color: T.muted, fontSize: 11, marginBottom: 2 }}>Plano</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: getCorPlano(emp.plano || plano) }}>{labelPlano(emp.plano || plano)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => abrirEdit(emp)} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: T.sub, fontFamily: 'inherit' }}>Editar</button>
                      <button onClick={() => toggleStatus(emp)} style={{ background: 'none', border: `1px solid ${inativa ? T.green : T.border}`, borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: inativa ? T.green : '#dc2626', fontFamily: 'inherit' }}>
                        {inativa ? 'Reativar' : 'Desativar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}

        {lista.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: T.muted }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Nenhuma empresa encontrada</div>
          </div>
        )}

        {/* Add card — bloqueado se atingiu limite */}
        {atingiuLimite ? (
          <div style={{ border: `2px dashed ${T.border}`, borderRadius: 12, padding: 28, textAlign: 'center', opacity: .6 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: T.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 10px' }}>🔒</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.sub, marginBottom: 4 }}>Limite de empresas atingido</div>
            <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>
              Seu plano <strong>{labelPlano(plano)}</strong> permite até <strong>{limiteEmpresas} empresa{limiteEmpresas !== 1 ? 's' : ''}</strong>.
            </div>
            <button onClick={() => setPage('meu_plano')}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Fazer Upgrade
            </button>
          </div>
        ) : (
          <div onClick={abrirAdd}
            style={{ border: `2px dashed ${T.border}`, borderRadius: 12, padding: 28, textAlign: 'center', cursor: 'pointer', transition: 'border-color .15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = T.primary}
            onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', margin: '0 auto 10px' }}>+</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.primary, marginBottom: 4 }}>Cadastrar nova empresa</div>
            <div style={{ color: T.muted, fontSize: 13 }}>Clique para adicionar uma nova empresa ao sistema</div>
          </div>
        )}
      </div>

      {/* Modal de limite de plano */}
      {limitErr && (
        <Modal title="Limite de Empresas" onClose={() => setLimitErr(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setLimitErr(null)}>Fechar</Btn>
              <Btn onClick={() => { setLimitErr(null); setPage('meu_plano') }}>Ver Meu Plano</Btn>
            </>
          }>
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
            <p style={{ color: T.text, fontSize: 15, margin: '0 0 8px', fontWeight: 600 }}>
              Limite de empresas atingido
            </p>
            <p style={{ color: T.sub, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              Seu plano <strong>{limitErr.plano}</strong> permite até{' '}
              <strong>{limitErr.limite} empresa{limitErr.limite !== 1 ? 's' : ''}</strong>.
              Faça upgrade para adicionar mais empresas.
            </p>
          </div>
        </Modal>
      )}

      {/* Modal nova/editar empresa */}
      {modal && (
        <EmpresaModal
          mode={modal}
          initial={modal === 'edit' ? editEmp : null}
          saving={saving}
          onClose={() => { setModal(null); setEditEmp(null) }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
