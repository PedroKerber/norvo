import { useState, useEffect } from 'react'
import { T, fmt } from '../theme'
import { useTheme } from '../context/ThemeContext'
import { SEGMENTOS, labelSegmento } from '../modules'

// ── Icons ────────────────────────────────────────────────────────
function SunIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
}
function MoonIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
}
function LogoutIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}
function ChevronRight() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
}
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
function SearchIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function HomeIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function ClockIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function EyeIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
}
function BriefcaseIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
}
function HashIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
}

// ── localStorage helpers ─────────────────────────────────────────
const getUltimas = () => {
  try { return JSON.parse(localStorage.getItem('x8_ultimas') || '[]') } catch { return [] }
}
const recordAcesso = (empId) => {
  const lista = [
    { id: empId, ts: new Date().toISOString() },
    ...getUltimas().filter(x => x.id !== empId),
  ].slice(0, 8)
  localStorage.setItem('x8_ultimas', JSON.stringify(lista))
}
const fmtTs = (ts) => {
  if (!ts) return ''
  const d = new Date(ts), now = new Date()
  const h = (now - d) / 3600000
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (h < 1) return 'Agora há pouco'
  if (h < 24) return `Hoje às ${time}`
  if (h < 48) return `Ontem às ${time}`
  return `${d.toLocaleDateString('pt-BR')} às ${time}`
}
const fmtCompact = (v) => {
  const n = Math.abs(v || 0)
  const sign = v < 0 ? '-' : ''
  if (n >= 1e6) return `${sign}R$\xa0${(n / 1e6).toFixed(1).replace('.', ',')}M`
  return fmt(v)
}

function mascaraCNPJ(v) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

// ── EmpresaCard ──────────────────────────────────────────────────
function EmpresaCard({ emp, stats, isPrincipal, onEntrar, onDetalhes }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.white, borderRadius: 14,
        border: `1.5px solid ${hovered ? emp.cor + '55' : T.border}`,
        boxShadow: hovered ? T.shadowMd : T.shadow,
        transform: hovered ? 'translateY(-3px)' : 'none',
        transition: 'all .18s ease',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
    >
      <div style={{ padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 13,
            background: emp.cor + '18', border: `2px solid ${emp.cor}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, color: emp.cor, fontSize: 17, flexShrink: 0, letterSpacing: -0.5,
          }}>
            {emp.initials}
          </div>
          {isPrincipal ? (
            <span style={{ background: T.primaryLight, color: T.primary, border: `1px solid ${T.primary}44`, borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700 }}>
              Principal
            </span>
          ) : (
            <span style={{ background: T.bg, color: T.sub, border: `1px solid ${T.border}`, borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600 }}>
              Ativa
            </span>
          )}
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, color: T.text, marginBottom: 10, lineHeight: 1.3 }}>{emp.nome}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: T.sub, fontSize: 12 }}>
            <span style={{ color: T.muted, flexShrink: 0 }}><BriefcaseIcon /></span>
            {emp.setor}
          </div>
          {emp.cnpj && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: T.muted, fontSize: 11 }}>
              <span style={{ flexShrink: 0 }}><HashIcon /></span>
              {emp.cnpj}
            </div>
          )}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${T.borderLight}`, padding: '14px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
          {[
            { label: 'Saldo do mês', value: stats.saldo, color: stats.saldo >= 0 ? T.green : T.red },
            { label: 'Receita do mês', value: stats.rec, color: T.green },
            { label: 'Despesa do mês', value: stats.desp, color: T.red },
          ].map(({ label, value, color }, j) => (
            <div key={label} style={{ borderLeft: j > 0 ? `1px solid ${T.borderLight}` : 'none', paddingLeft: j > 0 ? 12 : 0, paddingRight: j < 2 ? 10 : 0 }}>
              <div style={{ color: T.muted, fontSize: 10, fontWeight: 600, marginBottom: 4, letterSpacing: 0.2, lineHeight: 1.3 }}>{label}</div>
              <div style={{ color, fontWeight: 700, fontSize: 12, lineHeight: 1 }}>{fmtCompact(value)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 20px 18px', display: 'flex', gap: 10, marginTop: 'auto' }}>
        <button
          onClick={onDetalhes}
          style={{ flex: 1, background: 'none', border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '9px 0', color: T.sub, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.text; e.currentTarget.style.color = T.text }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.sub }}
        >
          <EyeIcon /> Ver detalhes
        </button>
        <button
          onClick={onEntrar}
          style={{ flex: 1.4, background: emp.cor, border: 'none', borderRadius: 8, padding: '9px 0', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: `0 2px 10px ${emp.cor}44` }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'scale(1.02)' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)' }}
        >
          Entrar <ChevronRight />
        </button>
      </div>
    </div>
  )
}

// ── DetalheModal ─────────────────────────────────────────────────
function DetalheModal({ emp, onClose, onEntrar }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div style={{ background: T.white, borderRadius: 16, width: '100%', maxWidth: 460, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ background: `linear-gradient(135deg, ${emp.cor} 0%, ${emp.cor}bb 100%)`, padding: '24px 24px 20px', borderRadius: '16px 16px 0 0', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 13, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 18, letterSpacing: -0.5 }}>
              {emp.initials}
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>{emp.nome}</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 5 }}>{emp.setor}</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '6px 0' }}>
          {[
            { label: 'Empresa', value: emp.nome },
            { label: 'CNPJ', value: emp.cnpj || '—' },
            { label: 'Segmento', value: emp.setor || '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'flex-start', padding: '11px 24px', borderBottom: `1px solid ${T.borderLight}` }}>
              <span style={{ color: T.muted, fontSize: 12, fontWeight: 600, minWidth: 130, flexShrink: 0 }}>{label}</span>
              <span style={{ color: T.text, fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 24px', display: 'flex', gap: 10, borderTop: `1px solid ${T.border}` }}>
          <button onClick={onClose} style={{ flex: 1, background: 'none', border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '10px 0', color: T.sub, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.text; e.currentTarget.style.color = T.text }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.sub }}>
            Fechar
          </button>
          <button onClick={onEntrar} style={{ flex: 2, background: emp.cor, border: 'none', borderRadius: 8, padding: '10px 0', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: `0 2px 10px ${emp.cor}44` }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            Entrar na empresa <ChevronRight />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── NovaEmpresaModal ─────────────────────────────────────────────
const COR_OPTS = ['#16a34a', '#2563eb', '#7c3aed', '#ea580c', '#dc2626', '#0891b2', '#ca8a04', '#0d9488']

function NovaEmpresaModal({ onClose, onSave }) {
  const [form, setForm] = useState({ nome: '', cnpj: '', segmento: '', cor: '#16a34a' })
  const [erros, setErros] = useState({})
  const [saving, setSaving] = useState(false)

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validar = () => {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    const digits = form.cnpj.replace(/\D/g, '')
    if (!digits || digits.length !== 14) e.cnpj = 'CNPJ deve ter 14 dígitos'
    if (!form.segmento) e.segmento = 'Selecione o segmento'
    return e
  }

  const handleSave = () => {
    const e = validar()
    if (Object.keys(e).length) { setErros(e); return }
    setSaving(true)
    onSave(form)
    onClose()
  }

  const iSty = (err) => ({
    display: 'block', width: '100%', background: 'var(--card)',
    border: `1.5px solid ${err ? T.red : 'var(--border)'}`,
    borderRadius: 8, padding: '9px 12px', color: 'var(--text)',
    fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  })

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: T.white, borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ padding: '22px 24px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Nova Empresa</div>
            <div style={{ color: T.sub, fontSize: 13, marginTop: 2 }}>Cadastre uma nova empresa no sistema</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: T.bg, border: `1px solid ${T.border}`, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: T.bg, borderRadius: 10, padding: '12px 16px', border: `1px solid ${T.borderLight}` }}>
            <div style={{ width: 48, height: 48, borderRadius: 11, background: form.cor + '20', border: `2px solid ${form.cor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: form.cor, fontSize: 15, flexShrink: 0 }}>
              {form.nome ? form.nome.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('') || 'EM' : 'EM'}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{form.nome || 'Nome da empresa'}</div>
              <div style={{ color: T.muted, fontSize: 12 }}>{form.segmento ? labelSegmento(form.segmento) : 'Segmento'}</div>
            </div>
          </div>

          {/* Nome */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: T.sub, marginBottom: 5 }}>NOME DA EMPRESA *</label>
            <input value={form.nome} onChange={e => { sf('nome', e.target.value); if (erros.nome) setErros(p=>({...p,nome:''})) }}
              placeholder="Ex: Kazole Imobiliária LTDA" style={iSty(erros.nome)} />
            {erros.nome && <div style={{ color: T.red, fontSize: 11, marginTop: 3 }}>⚠ {erros.nome}</div>}
          </div>

          {/* CNPJ */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: T.sub, marginBottom: 5 }}>CNPJ *</label>
            <input value={form.cnpj} onChange={e => { sf('cnpj', mascaraCNPJ(e.target.value)); if (erros.cnpj) setErros(p=>({...p,cnpj:''})) }}
              placeholder="00.000.000/0001-00" style={iSty(erros.cnpj)} />
            {erros.cnpj && <div style={{ color: T.red, fontSize: 11, marginTop: 3 }}>⚠ {erros.cnpj}</div>}
          </div>

          {/* Setor */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: T.sub, marginBottom: 5 }}>SEGMENTO *</label>
            <div style={{ position: 'relative' }}>
              <select value={form.segmento} onChange={e => { sf('segmento', e.target.value); if (erros.segmento) setErros(p=>({...p,segmento:''})) }}
                style={{ ...iSty(erros.segmento), appearance: 'none', paddingRight: 28 }}>
                <option value="">Selecione o segmento</option>
                {SEGMENTOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.muted, fontSize: 12 }}>▾</span>
            </div>
            {erros.segmento && <div style={{ color: T.red, fontSize: 11, marginTop: 3 }}>⚠ {erros.segmento}</div>}
          </div>

          {/* Cor */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: T.sub, marginBottom: 8 }}>COR IDENTIFICADORA</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COR_OPTS.map(cor => (
                <button key={cor} onClick={() => sf('cor', cor)} style={{
                  width: 32, height: 32, borderRadius: 8, background: cor, border: `3px solid ${form.cor === cor ? T.text : 'transparent'}`,
                  cursor: 'pointer', transition: 'border .15s', outline: 'none',
                }}>
                  {form.cor === cor && <span style={{ color: '#fff', fontWeight: 900, fontSize: 14 }}>✓</span>}
                </button>
              ))}
              <div style={{ position: 'relative', width: 32, height: 32 }}>
                <input type="color" value={form.cor} onChange={e => sf('cor', e.target.value)}
                  style={{ width: 32, height: 32, border: `1px solid ${T.border}`, borderRadius: 8, cursor: 'pointer', padding: 2, boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 20px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'none', border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '10px 20px', color: T.sub, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{ background: T.primary, border: 'none', borderRadius: 8, padding: '10px 24px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', opacity: saving ? .7 : 1, boxShadow: '0 2px 8px rgba(22,163,74,0.35)' }}>
            {saving ? 'Salvando...' : '+ Criar Empresa'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────
export default function SelectEmpresa({ usuario, onSelect, data, onLogout, empresas, onSaveEmpresa }) {
  const { dark, toggleTheme } = useTheme()
  const [q, setQ] = useState('')
  const [segmento, setSegmento] = useState('Todos os segmentos')
  const [detalhe, setDetalhe] = useState(null)
  const [ultimasData, setUltimasData] = useState([])
  const [showNovaEmpresa, setShowNovaEmpresa] = useState(false)
  const foto = usuario?.foto || ''

  const nome = usuario?.nome || 'Usuário'
  const primeiroNome = nome.split(' ')[0]
  const nomeDisplay = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1)

  useEffect(() => { setUltimasData(getUltimas()) }, [])

  const getStats = (emp) => {
    const now = new Date()
    const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const lancs = (data[emp.id]?.lancamentos || []).filter(l => l.data?.startsWith(mes))
    const rec  = lancs.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
    const desp = lancs.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)
    return { rec, desp, saldo: rec - desp }
  }

  const handleEntrar = (emp) => {
    recordAcesso(emp.id)
    onSelect(emp)
  }

  const handleSaveEmpresa = (form) => {
    if (onSaveEmpresa) onSaveEmpresa(form)
  }

  const setores = ['Todos os segmentos', ...Array.from(new Set((empresas || []).map(e => e.setor).filter(Boolean)))]

  const filtered = (empresas || []).filter(e => {
    if (q && !e.nome.toLowerCase().includes(q.toLowerCase()) && !e.cnpj?.includes(q)) return false
    if (segmento !== 'Todos os segmentos' && e.setor !== segmento) return false
    return true
  })

  const ultimasLista = ultimasData
    .map(u => {
      const emp = (empresas || []).find(e => e.id === u.id)
      return emp ? { ...emp, ts: u.ts } : null
    })
    .filter(Boolean)

  const iconBtnStyle = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 8, borderRadius: 8,
  }

  const totalEmpresas = (empresas || []).length

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'Segoe UI', sans-serif" }}>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--sidebar-bg)', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', padding: '0 28px', height: 64, gap: 8, boxShadow: '0 2px 16px rgba(0,0,0,0.3)' }}>
        <div style={{ fontWeight: 900, fontSize: 19, letterSpacing: -0.3, color: '#fff', userSelect: 'none', marginRight: 8 }}>
          <span style={{ color: T.primary }}>Norvo</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: 16, marginRight: 4 }}>
          {foto ? (
            <img src={foto} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
              {(nome[0] || 'U').toUpperCase()}
            </div>
          )}
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{nome}</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Administrador Master</div>
          </div>
        </div>
        <button onClick={toggleTheme} title={dark ? 'Modo claro' : 'Modo escuro'} style={iconBtnStyle}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}>
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
        {onLogout && (
          <button onClick={onLogout} title="Sair" style={iconBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.18)'; e.currentTarget.style.color = '#f87171' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}>
            <LogoutIcon />
          </button>
        )}
      </header>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '44px 28px 64px' }}>

        {/* Greeting + Toolbar */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 36, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 30, margin: '0 0 6px', color: T.text, letterSpacing: -0.5 }}>
              Olá, {nomeDisplay}! 👋
            </h1>
            <p style={{ color: T.sub, fontSize: 15, margin: 0 }}>Selecione a empresa que deseja gerenciar</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: T.muted, display: 'flex', pointerEvents: 'none' }}><SearchIcon /></span>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar empresa por nome ou CNPJ..."
                style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 9, padding: '9px 14px 9px 34px', color: T.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', width: 290 }} />
            </div>
            <select value={segmento} onChange={e => setSegmento(e.target.value)}
              style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 9, padding: '9px 14px', color: T.sub, fontSize: 13, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
              {setores.map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={() => setShowNovaEmpresa(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: T.primary, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', boxShadow: '0 2px 10px rgba(22,163,74,0.35)' }}
              onMouseEnter={e => e.currentTarget.style.background = '#15803d'}
              onMouseLeave={e => e.currentTarget.style.background = T.primary}>
              <PlusIcon /> Nova Empresa
            </button>
          </div>
        </div>

        {/* Section title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span style={{ color: T.sub, display: 'flex' }}><HomeIcon /></span>
          <span style={{ fontWeight: 700, fontSize: 15, color: T.text }}>Suas Empresas</span>
          {q || segmento !== 'Todos os segmentos' ? (
            <span style={{ background: T.primaryLight, color: T.primary, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
              {filtered.length} de {totalEmpresas}
            </span>
          ) : (
            <span style={{ background: T.bg, color: T.muted, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600, border: `1px solid ${T.borderLight}` }}>
              {totalEmpresas} empresa{totalEmpresas !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: T.muted }}>
            <div style={{ fontSize: 42, marginBottom: 14 }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: T.sub, marginBottom: 6 }}>Nenhuma empresa encontrada</div>
            <div style={{ fontSize: 13 }}>Tente outros termos ou mude o filtro de segmento</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20, marginBottom: 52 }}>
            {filtered.map((emp, i) => (
              <EmpresaCard
                key={emp.id}
                emp={emp}
                stats={getStats(emp)}
                isPrincipal={i === 0 && !q && segmento === 'Todos os segmentos'}
                onEntrar={() => handleEntrar(emp)}
                onDetalhes={() => setDetalhe(emp)}
              />
            ))}
          </div>
        )}

        {/* Últimas acessadas */}
        {ultimasLista.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ color: T.sub, display: 'flex' }}><ClockIcon /></span>
              <span style={{ fontWeight: 700, fontSize: 15, color: T.text }}>Últimas acessadas</span>
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
              {ultimasLista.map(emp => (
                <button key={emp.id} onClick={() => handleEntrar(emp)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', flexShrink: 0, minWidth: 210, transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = emp.cor + '55'; e.currentTarget.style.boxShadow = T.shadowMd; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: emp.cor + '18', border: `1.5px solid ${emp.cor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: emp.cor, fontSize: 12, flexShrink: 0 }}>
                    {emp.initials}
                  </div>
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.nome}</div>
                    <div style={{ fontSize: 11, color: T.muted, whiteSpace: 'nowrap', marginTop: 2 }}>{fmtTs(emp.ts)}</div>
                  </div>
                  <span style={{ color: T.muted, display: 'flex', flexShrink: 0 }}><ChevronRight /></span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      {detalhe && (
        <DetalheModal emp={detalhe} onClose={() => setDetalhe(null)} onEntrar={() => { handleEntrar(detalhe); setDetalhe(null) }} />
      )}
      {showNovaEmpresa && (
        <NovaEmpresaModal onClose={() => setShowNovaEmpresa(false)} onSave={handleSaveEmpresa} />
      )}
    </div>
  )
}
