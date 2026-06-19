import { useState, useMemo } from 'react'
import { T } from '../theme'
import { Card, Btn, Modal } from '../components/ui'
import { SEGMENTOS, labelSegmento } from '../modules'

const EMPTY = { nome: '', cnpj: '', segmento: '', cor: '#16a34a' }

function mascaraCNPJ(v) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

export default function Empresas({ setPage, empresas = [], onSaveEmpresa }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('Todas')
  const [ordem, setOrdem] = useState('Nome (A-Z)')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [erros, setErros] = useState({})
  const [saving, setSaving] = useState(false)

  const lista = useMemo(() => {
    let list = [...empresas]
    if (search) list = list.filter(e => e.nome.toLowerCase().includes(search.toLowerCase()) || (e.cnpj || '').includes(search))
    if (ordem === 'Nome (A-Z)') list.sort((a, b) => a.nome.localeCompare(b.nome))
    if (ordem === 'Nome (Z-A)') list.sort((a, b) => b.nome.localeCompare(a.nome))
    return list
  }, [empresas, search, ordem])

  const validar = () => {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    const digits = form.cnpj.replace(/\D/g, '')
    if (!digits || digits.length !== 14) e.cnpj = 'CNPJ deve ter 14 dígitos'
    if (!form.segmento) e.segmento = 'Selecione o segmento'
    return e
  }

  const handleSalvar = () => {
    const e = validar()
    if (Object.keys(e).length) { setErros(e); return }
    setSaving(true)
    if (onSaveEmpresa) onSaveEmpresa(form)
    setModal(false)
    setForm(EMPTY)
    setErros({})
    setSaving(false)
  }

  const iSty = (err) => ({
    display: 'block', width: '100%', background: T.white,
    border: `1.5px solid ${err ? T.red : T.border}`,
    borderRadius: 8, padding: '9px 12px', color: T.text,
    fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  })

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: T.text }}>
      {/* Header */}
      <div className="page-hd">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Empresas</h1>
          <div style={{ color: T.sub, fontSize: 14 }}>Gerencie todas as empresas do grupo.</div>
        </div>
        <Btn onClick={() => { setForm(EMPTY); setErros({}); setModal(true) }} icon="＋">Nova Empresa</Btn>
      </div>

      {/* KPIs */}
      <div className="g-4">
        {[
          { icon: '🏢', bg: T.blueL, label: 'Total de Empresas', value: empresas.length },
          { icon: '✅', bg: T.greenL, label: 'Empresas Ativas', value: empresas.length },
          { icon: '⏸', bg: T.borderLight, label: 'Empresas Inativas', value: 0 },
          { icon: '🔑', bg: T.purpleL, label: 'Plano', value: 'Premium' },
        ].map(k => (
          <Card key={k.label} style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: k.bg, borderRadius: 10, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{k.icon}</div>
              <div>
                <div style={{ color: T.sub, fontSize: 12 }}>{k.label}</div>
                <div style={{ fontWeight: 800, fontSize: 24 }}>{k.value}</div>
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
            { label: 'Ordenar por', value: ordem, opts: ['Nome (A-Z)', 'Nome (Z-A)', 'Mais recente'], set: setOrdem },
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
        {lista.map(emp => (
          <Card key={emp.id} style={{ padding: '18px 22px' }}>
            <div className="emp-card-row">
              <div style={{ width: 60, height: 60, borderRadius: 12, background: (emp.cor || T.primary) + '18', border: `2px solid ${(emp.cor || T.primary)}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: emp.cor || T.primary, fontWeight: 900, fontSize: 16, letterSpacing: -1 }}>{emp.initials}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{emp.nome}</div>
                <div style={{ color: T.sub, fontSize: 13, marginBottom: 6 }}>{emp.cnpj || '—'}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ background: T.greenL, color: T.green, fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '2px 8px' }}>Ativa</span>
                  {(emp.setor || emp.segmento) && <span style={{ background: T.blueL, color: '#2563eb', fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '2px 8px' }}>{emp.setor || labelSegmento(emp.segmento)}</span>}
                </div>
              </div>
              <div className="emp-card-meta">
                <div>
                  <div style={{ color: T.muted, fontSize: 11, marginBottom: 2 }}>Plano</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.primary }}>Premium</div>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {lista.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: T.muted }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Nenhuma empresa encontrada</div>
          </div>
        )}

        {/* Add card */}
        <div onClick={() => { setForm(EMPTY); setErros({}); setModal(true) }}
          style={{ border: `2px dashed ${T.border}`, borderRadius: 12, padding: 28, textAlign: 'center', cursor: 'pointer', transition: 'border-color .15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = T.primary}
          onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', margin: '0 auto 10px' }}>+</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.primary, marginBottom: 4 }}>Cadastrar nova empresa</div>
          <div style={{ color: T.muted, fontSize: 13 }}>Clique para adicionar uma nova empresa ao sistema</div>
        </div>
      </div>

      {/* Modal nova empresa */}
      {modal && (
        <Modal title="Nova Empresa" onClose={() => { setModal(false); setErros({}) }}
          footer={
            <>
              <Btn variant="ghost" onClick={() => { setModal(false); setErros({}) }}>Cancelar</Btn>
              <Btn onClick={handleSalvar} disabled={saving}>{saving ? 'Salvando...' : '+ Criar Empresa'}</Btn>
            </>
          }>
          {/* Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: T.bg, borderRadius: 10, padding: '12px 16px', border: `1px solid ${T.borderLight}`, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: (form.cor || T.primary) + '20', border: `2px solid ${(form.cor || T.primary)}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: form.cor || T.primary, fontSize: 14, flexShrink: 0 }}>
              {form.nome ? form.nome.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('') || 'EM' : 'EM'}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{form.nome || 'Nome da empresa'}</div>
              <div style={{ color: T.muted, fontSize: 12 }}>{form.segmento ? labelSegmento(form.segmento) : 'Segmento'}</div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: T.sub, marginBottom: 5 }}>NOME DA EMPRESA *</label>
            <input value={form.nome} onChange={e => { setForm(f => ({ ...f, nome: e.target.value })); if (erros.nome) setErros(p => ({ ...p, nome: '' })) }}
              placeholder="Ex: Kazole Imobiliária LTDA" style={iSty(erros.nome)} />
            {erros.nome && <div style={{ color: T.red, fontSize: 11, marginTop: 3 }}>⚠ {erros.nome}</div>}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: T.sub, marginBottom: 5 }}>CNPJ *</label>
            <input value={form.cnpj} onChange={e => { setForm(f => ({ ...f, cnpj: mascaraCNPJ(e.target.value) })); if (erros.cnpj) setErros(p => ({ ...p, cnpj: '' })) }}
              placeholder="00.000.000/0001-00" style={iSty(erros.cnpj)} />
            {erros.cnpj && <div style={{ color: T.red, fontSize: 11, marginTop: 3 }}>⚠ {erros.cnpj}</div>}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: T.sub, marginBottom: 5 }}>SEGMENTO *</label>
            <div style={{ position: 'relative' }}>
              <select value={form.segmento} onChange={e => { setForm(f => ({ ...f, segmento: e.target.value })); if (erros.segmento) setErros(p => ({ ...p, segmento: '' })) }}
                style={{ ...iSty(erros.segmento), appearance: 'none', paddingRight: 28 }}>
                <option value="">Selecione o segmento</option>
                {SEGMENTOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.muted, fontSize: 12 }}>▾</span>
            </div>
            {erros.segmento && <div style={{ color: T.red, fontSize: 11, marginTop: 3 }}>⚠ {erros.segmento}</div>}
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: T.sub, marginBottom: 8 }}>COR IDENTIFICADORA</label>
            <input type="color" value={form.cor || '#16a34a'} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))}
              style={{ width: 48, height: 36, border: `1.5px solid ${T.border}`, borderRadius: 6, cursor: 'pointer', padding: 2 }} />
          </div>
        </Modal>
      )}
    </div>
  )
}
