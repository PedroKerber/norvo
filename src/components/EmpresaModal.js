import { useState } from 'react'
import { T } from '../theme'
import { Btn, Modal } from './ui'
import { SEGMENTOS, labelSegmento } from '../modules'

// Modal unificado de empresa — usado em Empresas.js (criar/editar) e
// SelectEmpresa.js (criar). Produz sempre { nome, cnpj, segmento, cor }.

const COR_OPTS = ['#16a34a', '#2563eb', '#7c3aed', '#ea580c', '#dc2626', '#0891b2', '#ca8a04', '#0d9488']

function mascaraCNPJ(v) {
  const d = (v || '').replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

const initialsOf = (nome) =>
  (nome || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'EM'

export default function EmpresaModal({ mode = 'add', initial, saving = false, onClose, onSubmit }) {
  const [form, setForm] = useState(() => ({
    nome: '', cnpj: '', segmento: '', cor: '#16a34a', ...(initial || {}),
  }))
  const [erros, setErros] = useState({})

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (erros[k]) setErros(e => ({ ...e, [k]: '' })) }

  const validar = () => {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    const digits = (form.cnpj || '').replace(/\D/g, '')
    if (!digits || digits.length !== 14) e.cnpj = 'CNPJ deve ter 14 dígitos'
    if (!form.segmento) e.segmento = 'Selecione o segmento'
    return e
  }

  const submit = () => {
    const e = validar()
    if (Object.keys(e).length) { setErros(e); return }
    onSubmit({ ...form, nome: form.nome.trim(), cnpj: (form.cnpj || '').trim() })
  }

  const iSty = (err) => ({
    display: 'block', width: '100%', background: 'var(--card)',
    border: `1.5px solid ${err ? T.red : 'var(--border)'}`,
    borderRadius: 8, padding: '10px 12px', color: 'var(--text)',
    fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: 44,
  })
  const lbl = { display: 'block', fontWeight: 600, fontSize: 12, color: T.sub, marginBottom: 5 }

  return (
    <Modal title={mode === 'edit' ? 'Editar Empresa' : 'Nova Empresa'} onClose={onClose}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={submit} disabled={saving}>{saving ? 'Salvando...' : (mode === 'edit' ? 'Salvar' : '+ Criar Empresa')}</Btn>
      </>}>
      {/* Preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg)', borderRadius: 10, padding: '12px 16px', border: `1px solid var(--border-light)`, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: (form.cor || T.primary) + '20', border: `2px solid ${(form.cor || T.primary)}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: form.cor || T.primary, fontSize: 14, flexShrink: 0 }}>
          {initialsOf(form.nome)}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{form.nome || 'Nome da empresa'}</div>
          <div style={{ color: T.muted, fontSize: 12 }}>{form.segmento ? labelSegmento(form.segmento) : 'Segmento'}</div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>NOME DA EMPRESA *</label>
        <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Kazole Imobiliária LTDA" style={iSty(erros.nome)} />
        {erros.nome && <div style={{ color: T.red, fontSize: 11, marginTop: 3 }}>⚠ {erros.nome}</div>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>CNPJ *</label>
        <input value={form.cnpj} onChange={e => set('cnpj', mascaraCNPJ(e.target.value))} placeholder="00.000.000/0001-00" style={iSty(erros.cnpj)} />
        {erros.cnpj && <div style={{ color: T.red, fontSize: 11, marginTop: 3 }}>⚠ {erros.cnpj}</div>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>SEGMENTO *</label>
        <div style={{ position: 'relative' }}>
          <select value={form.segmento} onChange={e => set('segmento', e.target.value)}
            style={{ ...iSty(erros.segmento), appearance: 'none', paddingRight: 28 }}>
            <option value="">Selecione o segmento</option>
            {SEGMENTOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.muted, fontSize: 12 }}>▾</span>
        </div>
        {erros.segmento && <div style={{ color: T.red, fontSize: 11, marginTop: 3 }}>⚠ {erros.segmento}</div>}
      </div>

      <div>
        <label style={lbl}>COR IDENTIFICADORA</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {COR_OPTS.map(cor => (
            <button key={cor} type="button" onClick={() => set('cor', cor)} style={{
              width: 32, height: 32, borderRadius: 8, background: cor,
              border: `3px solid ${form.cor === cor ? T.text : 'transparent'}`, cursor: 'pointer', outline: 'none',
            }}>{form.cor === cor && <span style={{ color: '#fff', fontWeight: 900, fontSize: 14 }}>✓</span>}</button>
          ))}
          <input type="color" value={form.cor || '#16a34a'} onChange={e => set('cor', e.target.value)}
            style={{ width: 32, height: 32, border: `1px solid var(--border)`, borderRadius: 8, cursor: 'pointer', padding: 2, boxSizing: 'border-box' }} />
        </div>
      </div>
    </Modal>
  )
}
