import { useState, useRef } from 'react'
import emailjs from '@emailjs/browser'
import { T } from '../theme'
import { Card, Btn } from '../components/ui'
import { EMPRESAS } from '../data'
import { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } from '../config/emailjs'

const MODULOS = ['Dashboard', 'Transações', 'Receitas', 'Despesas', 'Fluxo de Caixa', 'Contas a Pagar', 'Contas a Receber', 'Relatórios', 'Fechamento Mensal', 'Empresas', 'Categorias', 'Centro de Custos', 'Metas Financeiras', 'Usuários', 'Configurações', 'Logs do Sistema']
const ACOES = ['Visualizar', 'Criar', 'Editar', 'Excluir', 'Exportar']
const CARGOS = ['CEO / Administrador Master', 'Proprietário', 'Diretor', 'Gerente Financeiro', 'Contador', 'Analista Financeiro', 'Assistente Administrativo', 'Outro']

const PERFIS = [
  { id: 'master', nome: 'Master', icon: '👑', cor: '#7c3aed', bg: '#7c3aed18', nivel: 'Acesso total', desc: 'Acesso total. Gerencia empresas, usuários e configurações.' },
  { id: 'admin', nome: 'Administrador', icon: '🛡', cor: '#2563eb', bg: '#2563eb18', nivel: 'Alto acesso', desc: 'Operações financeiras, usuários (exceto Masters) e relatórios.' },
  { id: 'gerente', nome: 'Gerente Financeiro', icon: '📊', cor: '#16a34a', bg: '#16a34a18', nivel: 'Acesso médio', desc: 'Receitas, despesas, fluxo de caixa e relatórios financeiros.' },
  { id: 'contador', nome: 'Contador', icon: '🧾', cor: '#ea580c', bg: '#ea580c18', nivel: 'Acesso restrito', desc: 'Visualizar e gerar relatórios contábeis, exportar dados.' },
]

const STATUS_INFO = {
  ativo: { label: 'Ativo', cor: T.green, bg: T.greenL },
  inativo: { label: 'Inativo', cor: '#6b7280', bg: '#f3f4f6' },
  bloqueado: { label: 'Bloqueado', cor: '#dc2626', bg: '#fee2e2' },
}

const defaultPerms = (perfil) => {
  const full = Object.fromEntries(MODULOS.map(m => [m, Object.fromEntries(ACOES.map(a => [a, true]))]))
  if (perfil === 'master' || perfil === 'admin') return full
  if (perfil === 'gerente') {
    const fin = ['Dashboard', 'Receitas', 'Despesas', 'Fluxo de Caixa', 'Contas a Pagar', 'Contas a Receber', 'Relatórios', 'Categorias', 'Centro de Custos', 'Metas Financeiras']
    return Object.fromEntries(MODULOS.map(m => [m, Object.fromEntries(ACOES.map(a => [a, fin.includes(m) && a !== 'Excluir']))]))
  }
  const visExp = new Set(['Dashboard', 'Relatórios', 'Receitas', 'Despesas', 'Fluxo de Caixa'])
  return Object.fromEntries(MODULOS.map(m => [m, Object.fromEntries(ACOES.map(a => [a, visExp.has(m) && (a === 'Visualizar' || a === 'Exportar')]))]))
}

const initials = (nome) => (nome || 'U').split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'U'
const CORES_AV = ['#16a34a', '#2563eb', '#7c3aed', '#ea580c', '#dc2626', '#0891b2', '#ca8a04']
const avatarCor = (nome) => CORES_AV[(nome || 'U').charCodeAt(0) % CORES_AV.length]

const EMPTY = { nome: '', email: '', telefone: '', empresaIds: ['kz'], cargo: 'Analista Financeiro', perfil: 'gerente', status: 'ativo', mustChangePassword: false, foto: '' }

const Overlay = ({ children, onClose }) => (
  <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    {children}
  </div>
)

const PerfilBadge = ({ perfil }) => {
  const p = PERFIS.find(x => x.id === perfil) || PERFIS[2]
  return <span style={{ background: p.bg, color: p.cor, fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '3px 10px' }}>{p.icon} {p.nome}</span>
}

const StatusBadge = ({ status }) => {
  const s = STATUS_INFO[status] || STATUS_INFO.ativo
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: s.cor, fontWeight: 600, fontSize: 12 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.cor, display: 'inline-block' }} />{s.label}
    </span>
  )
}

export default function Usuarios({ usuario }) {
  const fotoRef = useRef(null)

  const [usuarios, setUsuarios] = useState([
    { id: '1', nome: usuario?.nome || 'Pedro Kerber', email: usuario?.email || 'pedrork22@icloud.com', telefone: '', empresaIds: EMPRESAS.map(e => e.id), cargo: 'CEO / Administrador Master', perfil: 'master', status: 'ativo', foto: '', ultimoAcesso: 'Hoje', criadoEm: '16/06/2026' },
  ])

  const [search, setSearch] = useState('')
  const [filtroEmp, setFiltroEmp] = useState('Todas')
  const [filtroPerfil, setFiltroPerfil] = useState('Todos')
  const [filtroStatus, setFiltroStatus] = useState('Todos')

  const [modalTipo, setModalTipo] = useState(null)
  const [editId, setEditId] = useState(null)
  const [viewUser, setViewUser] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [senhaUser, setSenhaUser] = useState(null)
  const [tempSenha, setTempSenha] = useState('')

  const [form, setForm] = useState(EMPTY)
  const [formPerms, setFormPerms] = useState(() => defaultPerms('gerente'))
  const [activeTab, setActiveTab] = useState('dados')
  const [erros, setErros] = useState({})

  const [toast, setToast] = useState('')
  const [toastOk, setToastOk] = useState(true)
  const [actionMenu, setActionMenu] = useState(null)

  const showToast = (msg, ok = true) => {
    setToast(msg); setToastOk(ok)
    setTimeout(() => setToast(''), 3500)
  }

  const openAdd = () => {
    setForm(EMPTY); setFormPerms(defaultPerms('gerente'))
    setActiveTab('dados'); setErros({}); setEditId(null)
    setTempSenha(''); setModalTipo('form')
  }

  const openEdit = (u) => {
    const saved = JSON.parse(localStorage.getItem(`x8_perms_${u.id}`) || 'null')
    setForm({ ...u }); setFormPerms(saved || defaultPerms(u.perfil))
    setActiveTab('dados'); setErros({}); setEditId(u.id)
    setModalTipo('form')
  }

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setForm(f => ({ ...f, foto: ev.target.result }))
    reader.readAsDataURL(file)
  }

  const validar = () => {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    if (!form.email.trim()) e.email = 'E-mail é obrigatório'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido'
    if (form.perfil !== 'master' && (!form.empresaIds || form.empresaIds.length === 0))
      e.empresaIds = 'Selecione ao menos uma empresa'
    setErros(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validar()) return
    if (editId) {
      setUsuarios(prev => prev.map(u => u.id === editId ? { ...form, id: editId } : u))
      localStorage.setItem(`x8_perms_${editId}`, JSON.stringify(formPerms))
      showToast('Usuário atualizado com sucesso!')
      setModalTipo(null)
    } else {
      const newId = Date.now().toString()
      setUsuarios(prev => [...prev, { ...form, id: newId, ultimoAcesso: '—', criadoEm: new Date().toLocaleDateString('pt-BR') }])
      localStorage.setItem(`x8_perms_${newId}`, JSON.stringify(formPerms))
      const senhaGerada = tempSenha || ''
      const empresasNome = form.empresaIds.map(id => EMPRESAS.find(e => e.id === id)?.nome).filter(Boolean).join(', ')
      emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_name:  form.nome,
          to_email: form.email,
          empresa:  empresasNome || '',
          cargo:    form.cargo,
          senha:    senhaGerada || '(definida pelo administrador)',
          link:     'https://x8finance.com.br',
        },
        EMAILJS_PUBLIC_KEY
      ).then(() => {
        showToast('Usuário criado e convite enviado por e-mail!')
      }).catch(() => {
        showToast('Usuário criado. Falha ao enviar e-mail de convite.')
      })
      setModalTipo(null)
    }
  }

  const handleDelete = (id) => {
    setUsuarios(prev => prev.filter(u => u.id !== id))
    setConfirmDeleteId(null); setModalTipo(null)
    showToast('Usuário removido.')
  }

  const handleBlock = (id) => {
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'bloqueado' ? 'ativo' : 'bloqueado' } : u))
    setActionMenu(null)
    const u = usuarios.find(x => x.id === id)
    showToast(u?.status === 'bloqueado' ? 'Usuário desbloqueado.' : 'Usuário bloqueado.')
  }

  const gerarSenha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
    const s = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setTempSenha(s)
  }

  const togglePerm = (modulo, acao) => {
    setFormPerms(p => ({ ...p, [modulo]: { ...p[modulo], [acao]: !p[modulo][acao] } }))
  }

  const marcarTudo = () => setFormPerms(Object.fromEntries(MODULOS.map(m => [m, Object.fromEntries(ACOES.map(a => [a, true]))])))
  const desmarcarTudo = () => setFormPerms(Object.fromEntries(MODULOS.map(m => [m, Object.fromEntries(ACOES.map(a => [a, false]))])))
  const aplicarPadrao = () => setFormPerms(defaultPerms(form.perfil))

  const filtered = usuarios.filter(u => {
    if (search && !u.nome.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    if (filtroEmp !== 'Todas' && !(u.empresaIds || []).includes(filtroEmp)) return false
    if (filtroPerfil !== 'Todos' && u.perfil !== filtroPerfil) return false
    if (filtroStatus !== 'Todos' && u.status !== filtroStatus) return false
    return true
  })

  const empNome = (id) => EMPRESAS.find(e => e.id === id)?.nome || id
  const empNomes = (ids) => (ids || []).map(id => empNome(id)).filter(Boolean)
  const masters = usuarios.filter(u => u.perfil === 'master').length
  const admins = usuarios.filter(u => u.perfil === 'admin').length
  const ativos = usuarios.filter(u => u.status === 'ativo').length
  const outros = usuarios.filter(u => u.perfil !== 'master' && u.perfil !== 'admin').length

  const selStyle = { background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '9px 12px', color: T.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%' }
  const labelStyle = { display: 'block', fontWeight: 600, fontSize: 12, color: T.sub, marginBottom: 5, textTransform: 'uppercase', letterSpacing: .4 }

  const FotoArea = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fotoRef.current?.click()}>
        {form.foto ? (
          <img src={form.foto} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${T.primary}` }} />
        ) : (
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: form.nome ? avatarCor(form.nome) : T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: form.nome ? '#fff' : T.muted, fontWeight: 800, fontSize: 26, border: `3px solid ${T.border}` }}>
            {form.nome ? initials(form.nome) : '👤'}
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: T.primary, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>📷</div>
      </div>
      <button type="button" onClick={() => fotoRef.current?.click()} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, color: T.sub, cursor: 'pointer', fontFamily: 'inherit' }}>
        Alterar foto
      </button>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: T.text }}>
      <input ref={fotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoChange} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Usuários</h1>
          <div style={{ color: T.sub, fontSize: 14 }}>Gerencie usuários, permissões e níveis de acesso.</div>
        </div>
        <Btn onClick={openAdd} icon="＋">Novo Usuário</Btn>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { icon: '👥', bg: T.blueL, label: 'Total de Usuários', value: usuarios.length, sub: `${ativos} ativo${ativos !== 1 ? 's' : ''}` },
          { icon: '👑', bg: '#7c3aed18', label: 'Master', value: masters, sub: `${Math.round(masters / Math.max(usuarios.length, 1) * 100)}% do total` },
          { icon: '🛡', bg: T.blueL, label: 'Administradores', value: admins, sub: `${Math.round(admins / Math.max(usuarios.length, 1) * 100)}% do total` },
          { icon: '👤', bg: T.orangeL, label: 'Outros Perfis', value: outros, sub: `${Math.round(outros / Math.max(usuarios.length, 1) * 100)}% do total` },
        ].map(k => (
          <Card key={k.label} style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: k.bg, borderRadius: 10, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{k.icon}</div>
              <div>
                <div style={{ color: T.sub, fontSize: 11 }}>{k.label}</div>
                <div style={{ fontWeight: 800, fontSize: 24 }}>{k.value}</div>
                <div style={{ color: T.muted, fontSize: 11 }}>{k.sub}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card style={{ padding: '14px 18px', marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted, fontSize: 14 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail..."
              style={{ width: '100%', padding: '8px 12px 8px 32px', border: `1.5px solid ${T.border}`, borderRadius: 8, background: T.white, color: T.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          {[
            { value: filtroEmp, set: setFiltroEmp, opts: [['Todas', 'Todas as empresas'], ...EMPRESAS.map(e => [e.id, e.nome])] },
            { value: filtroPerfil, set: setFiltroPerfil, opts: [['Todos', 'Todos os perfis'], ...PERFIS.map(p => [p.id, p.nome])] },
            { value: filtroStatus, set: setFiltroStatus, opts: [['Todos', 'Todos os status'], ['ativo', 'Ativo'], ['inativo', 'Inativo'], ['bloqueado', 'Bloqueado']] },
          ].map((f, i) => (
            <select key={i} value={f.value} onChange={e => f.set(e.target.value)}
              style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', color: T.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
              {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
        </div>
      </Card>

      {/* Tabela */}
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.bg }}>
                {['Usuário', 'Empresa', 'Cargo', 'Perfil', 'Status', 'Último acesso', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: T.sub, fontWeight: 600, borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: T.muted }}>Nenhum usuário encontrado.</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${T.borderLight}` }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {u.foto ? (
                        <img src={u.foto} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarCor(u.nome), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                          {initials(u.nome)}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.nome}</div>
                        <div style={{ color: T.muted, fontSize: 11 }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: T.sub, fontSize: 12 }}>
                    {u.empresaIds?.length > 0
                      ? u.empresaIds.length === 1
                        ? empNome(u.empresaIds[0])
                        : `${empNome(u.empresaIds[0])} +${u.empresaIds.length - 1}`
                      : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: T.sub, fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.cargo}</td>
                  <td style={{ padding: '12px 16px' }}><PerfilBadge perfil={u.perfil} /></td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={u.status} /></td>
                  <td style={{ padding: '12px 16px', color: T.muted, fontSize: 12 }}>{u.ultimoAcesso}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4, position: 'relative' }}>
                      <button onClick={() => { setViewUser(u); setModalTipo('view') }} title="Visualizar perfil"
                        style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 13, color: T.sub }}>👁</button>
                      <button onClick={() => openEdit(u)} title="Editar"
                        style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 13, color: T.sub }}>✏️</button>
                      <button onClick={() => { setSenhaUser(u); setTempSenha(''); setModalTipo('senha') }} title="Gerar senha temporária"
                        style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 13, color: T.sub }}>🔑</button>
                      <div style={{ position: 'relative' }}>
                        <button onClick={() => setActionMenu(actionMenu === u.id ? null : u.id)} title="Mais ações"
                          style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 13, color: T.sub }}>⋯</button>
                        {actionMenu === u.id && (
                          <>
                            <div onClick={() => setActionMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 299 }} />
                            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: T.shadowMd, zIndex: 300, minWidth: 190, overflow: 'hidden' }}>
                              <button onClick={() => { handleBlock(u.id) }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: u.status === 'bloqueado' ? T.green : '#d97706', textAlign: 'left', fontFamily: 'inherit' }}>
                                {u.status === 'bloqueado' ? '🔓 Desbloquear' : '🚫 Bloquear usuário'}
                              </button>
                              {u.id !== '1' && (
                                <button onClick={() => { setConfirmDeleteId(u.id); setActionMenu(null); setModalTipo('delete') }}
                                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#dc2626', textAlign: 'left', fontFamily: 'inherit' }}>
                                  🗑 Excluir usuário
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', color: T.muted, fontSize: 12, borderTop: `1px solid ${T.borderLight}` }}>
          Mostrando {filtered.length} de {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''}
        </div>
      </Card>

      {/* Perfis */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18 }}>
        <Card style={{ padding: 22 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Perfis e Permissões</div>
          <div style={{ color: T.sub, fontSize: 13, marginBottom: 20 }}>Entenda as permissões de cada perfil do sistema.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PERFIS.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', border: `1px solid ${T.border}`, borderRadius: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{p.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{p.nome}</span>
                    <span style={{ background: p.bg, color: p.cor, fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '2px 10px' }}>{p.nivel}</span>
                  </div>
                  <div style={{ color: T.sub, fontSize: 12, lineHeight: 1.5 }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card style={{ padding: 22 }}>
          <div style={{ fontSize: 36, marginBottom: 12, textAlign: 'center' }}>🔒</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, textAlign: 'center' }}>Segurança em primeiro lugar</div>
          <div style={{ color: T.sub, fontSize: 13, marginBottom: 18, textAlign: 'center', lineHeight: 1.5 }}>Todos os acessos são registrados e monitorados para garantir a segurança dos dados financeiros.</div>
          {['Log de auditoria completo', 'Controle de permissões detalhado', 'Sessões seguras e criptografadas', 'Conformidade com a LGPD'].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13, color: T.sub }}>
              <span style={{ color: T.green, fontWeight: 700 }}>✓</span> {item}
            </div>
          ))}
        </Card>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: toastOk ? T.sidebar : '#dc2626', color: '#fff', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: T.shadowMd, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          <span>{toastOk ? '✓' : '✕'}</span> {toast}
        </div>
      )}

      {/* ── MODAL: FORM (NOVO / EDITAR) ── */}
      {modalTipo === 'form' && (
        <Overlay onClose={() => setModalTipo(null)}>
          <div style={{ background: T.white, borderRadius: 16, width: '100%', maxWidth: 860, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

            {/* Modal header */}
            <div style={{ padding: '24px 32px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>{editId ? '✏️ Editar Usuário' : '＋ Novo Usuário'}</div>
                  <div style={{ color: T.sub, fontSize: 13, marginTop: 2 }}>{editId ? 'Atualize os dados e permissões do usuário.' : 'Preencha os dados para criar um novo usuário no sistema.'}</div>
                </div>
                <button onClick={() => setModalTipo(null)} style={{ width: 32, height: 32, borderRadius: '50%', background: T.bg, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: T.muted }}>✕</button>
              </div>

              {/* Foto + preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <FotoArea />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{form.nome || 'Nome do usuário'}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <PerfilBadge perfil={form.perfil} />
                    <StatusBadge status={form.status} />
                  </div>
                  {form.email && <div style={{ color: T.muted, fontSize: 12, marginTop: 4 }}>{form.email}</div>}
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, marginTop: 20, borderBottom: `2px solid ${T.border}` }}>
                {[['dados', '👤 Dados Pessoais'], ['perms', '🛡 Permissões']].map(([id, label]) => (
                  <button key={id} onClick={() => setActiveTab(id)} style={{ padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: activeTab === id ? 700 : 400, color: activeTab === id ? T.primary : T.sub, borderBottom: activeTab === id ? `2px solid ${T.primary}` : '2px solid transparent', marginBottom: -2 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal body */}
            <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>
              {activeTab === 'dados' ? (
                <div>
                  {/* Row 1: Nome + Email */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle}>Nome Completo *</label>
                      <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ana Beatriz Santos"
                        style={{ ...selStyle, border: `1.5px solid ${erros.nome ? '#dc2626' : T.border}`, fontSize: 14 }} />
                      {erros.nome && <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>{erros.nome}</div>}
                    </div>
                    <div>
                      <label style={labelStyle}>E-mail *</label>
                      <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ana@empresa.com.br"
                        style={{ ...selStyle, border: `1.5px solid ${erros.email ? '#dc2626' : T.border}`, fontSize: 14 }} />
                      {erros.email && <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>{erros.email}</div>}
                    </div>
                  </div>

                  {/* Row 2: Telefone + Cargo */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle}>Telefone</label>
                      <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(61) 99999-9999"
                        style={{ ...selStyle, fontSize: 14 }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Cargo</label>
                      <select value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} style={{ ...selStyle, fontSize: 14 }}>
                        {CARGOS.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Empresas vinculadas — multi-checkbox */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>
                        Empresas Vinculadas{form.perfil !== 'master' ? ' *' : ''}
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button"
                          onClick={() => setForm(f => ({ ...f, empresaIds: EMPRESAS.map(e => e.id) }))}
                          style={{ background: T.primaryLight, color: T.primary, border: `1px solid ${T.primary}44`, borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Selecionar todas
                        </button>
                        <button type="button"
                          onClick={() => setForm(f => ({ ...f, empresaIds: [] }))}
                          style={{ background: T.bg, color: T.sub, border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Desmarcar todas
                        </button>
                      </div>
                    </div>
                    <div style={{ border: `1.5px solid ${erros.empresaIds ? '#dc2626' : T.border}`, borderRadius: 10, overflow: 'hidden' }}>
                      {EMPRESAS.map((emp, i) => {
                        const checked = (form.empresaIds || []).includes(emp.id)
                        return (
                          <div key={emp.id}
                            onClick={() => setForm(f => ({
                              ...f,
                              empresaIds: checked
                                ? f.empresaIds.filter(id => id !== emp.id)
                                : [...(f.empresaIds || []), emp.id]
                            }))}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 12,
                              padding: '10px 14px', cursor: 'pointer',
                              background: checked ? `${emp.cor}10` : T.white,
                              borderBottom: i < EMPRESAS.length - 1 ? `1px solid ${T.borderLight}` : 'none',
                              transition: 'background .1s',
                              userSelect: 'none',
                            }}>
                            <div style={{
                              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                              border: `2px solid ${checked ? emp.cor : T.border}`,
                              background: checked ? emp.cor : T.white,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all .12s',
                            }}>
                              {checked && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                            </div>
                            <div style={{ width: 30, height: 30, borderRadius: 7, background: `${emp.cor}18`, border: `1px solid ${emp.cor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: emp.cor, fontSize: 11, flexShrink: 0 }}>
                              {emp.initials}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: checked ? emp.cor : T.text }}>{emp.nome}</div>
                              <div style={{ fontSize: 11, color: T.muted }}>{emp.setor}</div>
                            </div>
                            {checked && <span style={{ color: emp.cor, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>Vinculada</span>}
                          </div>
                        )
                      })}
                    </div>
                    {erros.empresaIds && <div style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>{erros.empresaIds}</div>}
                    {(form.empresaIds || []).length > 0 && (
                      <div style={{ fontSize: 11, color: T.sub, marginTop: 5 }}>
                        {form.empresaIds.length} empresa{form.empresaIds.length !== 1 ? 's' : ''} selecionada{form.empresaIds.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  {/* Perfil */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Perfil de Acesso</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {PERFIS.map(p => (
                        <div key={p.id} onClick={() => setForm(f => ({ ...f, perfil: p.id }))}
                          style={{ border: `2px solid ${form.perfil === p.id ? p.cor : T.border}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', background: form.perfil === p.id ? p.bg : T.white, transition: 'all .15s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 18 }}>{p.icon}</span>
                            <span style={{ fontWeight: 700, fontSize: 13, color: form.perfil === p.id ? p.cor : T.text }}>{p.nome}</span>
                            {form.perfil === p.id && <span style={{ marginLeft: 'auto', color: p.cor, fontWeight: 700 }}>✓</span>}
                          </div>
                          <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.4 }}>{p.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Status do Usuário</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {Object.entries(STATUS_INFO).map(([key, s]) => (
                        <div key={key} onClick={() => setForm(f => ({ ...f, status: key }))}
                          style={{ flex: 1, border: `2px solid ${form.status === key ? s.cor : T.border}`, borderRadius: 10, padding: '10px 14px', cursor: 'pointer', background: form.status === key ? s.bg : T.white, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.cor, flexShrink: 0 }} />
                          <span style={{ fontWeight: form.status === key ? 700 : 400, fontSize: 13, color: form.status === key ? s.cor : T.sub }}>{s.label}</span>
                          {form.status === key && <span style={{ marginLeft: 'auto', color: s.cor, fontWeight: 700, fontSize: 12 }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Senha temporária — apenas na criação */}
                  {!editId && (
                    <div style={{ marginBottom: 20 }}>
                      <label style={labelStyle}>Senha Temporária</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <input
                            value={tempSenha}
                            onChange={e => setTempSenha(e.target.value)}
                            placeholder="Digite ou gere uma senha..."
                            style={{ ...selStyle, fontSize: 14, fontFamily: tempSenha ? 'monospace' : 'inherit', letterSpacing: tempSenha ? 1 : 0, paddingRight: 36 }}
                          />
                          {tempSenha && (
                            <button onClick={() => navigator.clipboard?.writeText(tempSenha).then(() => showToast('Senha copiada!'))}
                              title="Copiar senha"
                              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.primary, fontSize: 14 }}>
                              📋
                            </button>
                          )}
                        </div>
                        <button onClick={gerarSenha}
                          style={{ background: T.primaryLight, color: T.primary, border: `1px solid ${T.primary}44`, borderRadius: 8, padding: '0 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          ⚡ Gerar
                        </button>
                      </div>
                      {tempSenha && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11, color: T.green }}>
                          <span>✓</span> Senha definida — será enviada por e-mail ao usuário
                        </div>
                      )}
                      {!tempSenha && (
                        <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>
                          Se não definida, o e-mail informará "(definida pelo administrador)"
                        </div>
                      )}
                    </div>
                  )}

                  {/* Opções extras */}
                  <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.mustChangePassword} onChange={e => setForm(f => ({ ...f, mustChangePassword: e.target.checked }))}
                        style={{ width: 16, height: 16, accentColor: T.primary }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>Exigir troca de senha no primeiro acesso</div>
                        <div style={{ color: T.muted, fontSize: 11 }}>O usuário será redirecionado para trocar a senha ao entrar.</div>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Ações rápidas */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                    <button onClick={marcarTudo} style={{ background: T.primaryLight, color: T.primary, border: `1px solid ${T.primary}44`, borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>✓ Marcar tudo</button>
                    <button onClick={desmarcarTudo} style={{ background: T.bg, color: T.sub, border: `1px solid ${T.border}`, borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>✕ Desmarcar tudo</button>
                    <button onClick={aplicarPadrao} style={{ background: T.bg, color: T.sub, border: `1px solid ${T.border}`, borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>↺ Aplicar padrão do perfil ({PERFIS.find(p => p.id === form.perfil)?.nome})</button>
                  </div>

                  {/* Tabela de permissões */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: T.bg }}>
                          <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 700, color: T.text, borderBottom: `2px solid ${T.border}` }}>Módulo</th>
                          {ACOES.map(a => (
                            <th key={a} style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, color: T.sub, borderBottom: `2px solid ${T.border}` }}>{a}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {MODULOS.map((modulo, i) => (
                          <tr key={modulo} style={{ background: i % 2 === 0 ? T.white : T.bg }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: T.text, borderBottom: `1px solid ${T.borderLight}` }}>{modulo}</td>
                            {ACOES.map(acao => (
                              <td key={acao} style={{ padding: '10px', textAlign: 'center', borderBottom: `1px solid ${T.borderLight}` }}>
                                <input type="checkbox" checked={formPerms[modulo]?.[acao] || false} onChange={() => togglePerm(modulo, acao)}
                                  style={{ width: 15, height: 15, cursor: 'pointer', accentColor: T.primary }} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ padding: '16px 32px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0, background: T.white, borderRadius: '0 0 16px 16px' }}>
              <Btn variant="ghost" onClick={() => setModalTipo(null)}>Cancelar</Btn>
              <Btn onClick={handleSave}>{editId ? '💾 Salvar Alterações' : '＋ Criar Usuário'}</Btn>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── MODAL: VISUALIZAR PERFIL ── */}
      {modalTipo === 'view' && viewUser && (
        <Overlay onClose={() => setModalTipo(null)}>
          <div style={{ background: T.white, borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            {/* Header com gradiente */}
            <div style={{ background: `linear-gradient(135deg, ${T.sidebar} 0%, #0d3320 100%)`, padding: '28px 28px 20px', borderRadius: '16px 16px 0 0', position: 'relative' }}>
              <button onClick={() => setModalTipo(null)} style={{ position: 'absolute', top: 16, right: 16, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                {viewUser.foto ? (
                  <img src={viewUser.foto} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.4)' }} />
                ) : (
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: avatarCor(viewUser.nome), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 28, border: '3px solid rgba(255,255,255,0.4)' }}>
                    {initials(viewUser.nome)}
                  </div>
                )}
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 20, marginBottom: 6 }}>{viewUser.nome}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <PerfilBadge perfil={viewUser.perfil} />
                    <StatusBadge status={viewUser.status} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: 28 }}>
              {/* Informações */}
              {[
                { icon: '✉', label: 'E-mail', val: viewUser.email },
                { icon: '📱', label: 'Telefone', val: viewUser.telefone || '—' },
                { icon: '💼', label: 'Cargo', val: viewUser.cargo },
                { icon: '🏢', label: 'Empresa(s)', val: empNomes(viewUser.empresaIds).join(', ') || '—' },
                { icon: '🕐', label: 'Último acesso', val: viewUser.ultimoAcesso },
                { icon: '📅', label: 'Data de cadastro', val: viewUser.criadoEm },
              ].map(({ icon, label, val }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: `1px solid ${T.borderLight}` }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: T.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .4 }}>{label}</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{val}</div>
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <Btn variant="ghost" sm full onClick={() => { setModalTipo(null); openEdit(viewUser) }}>✏️ Editar</Btn>
                <Btn sm full onClick={() => { setSenhaUser(viewUser); setTempSenha(''); setModalTipo('senha') }}>🔑 Gerar Senha</Btn>
              </div>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── MODAL: SENHA TEMPORÁRIA ── */}
      {modalTipo === 'senha' && senhaUser && (
        <Overlay onClose={() => setModalTipo(null)}>
          <div style={{ background: T.white, borderRadius: 16, padding: 32, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>🔑 Gerar Senha Temporária</div>
            <div style={{ color: T.sub, fontSize: 13, marginBottom: 24 }}>Para: <strong>{senhaUser.nome}</strong> · {senhaUser.email}</div>

            {!tempSenha ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
                <div style={{ color: T.sub, fontSize: 13, marginBottom: 20 }}>Gere uma senha temporária segura. O usuário poderá fazer login e será solicitado a alterar a senha.</div>
                <Btn onClick={gerarSenha}>Gerar senha temporária</Btn>
              </div>
            ) : (
              <div>
                <div style={{ background: T.bg, border: `2px solid ${T.primary}`, borderRadius: 10, padding: '16px 18px', marginBottom: 16, textAlign: 'center' }}>
                  <div style={{ color: T.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6 }}>Senha gerada</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: 2 }}>{tempSenha}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.yellowL || '#fef9c3', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#92400e' }}>
                  ⚠️ Copie e envie esta senha ao usuário. Ela não será exibida novamente.
                </div>
                <button onClick={() => navigator.clipboard?.writeText(tempSenha).then(() => showToast('Senha copiada!'))}
                  style={{ width: '100%', background: T.primaryLight, color: T.primary, border: `1px solid ${T.primary}44`, borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8 }}>
                  📋 Copiar senha
                </button>
                <button onClick={gerarSenha} style={{ width: '100%', background: 'none', color: T.muted, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ↺ Gerar outra senha
                </button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <Btn variant="ghost" onClick={() => setModalTipo(null)}>Fechar</Btn>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── MODAL: CONFIRMAR EXCLUSÃO ── */}
      {modalTipo === 'delete' && confirmDeleteId && (
        <Overlay onClose={() => setModalTipo(null)}>
          <div style={{ background: T.white, borderRadius: 16, padding: 32, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗑</div>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Excluir usuário?</div>
            <div style={{ color: T.sub, fontSize: 13, marginBottom: 28 }}>
              Esta ação não pode ser desfeita. O usuário perderá todo o acesso ao sistema.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Btn variant="ghost" onClick={() => setModalTipo(null)}>Cancelar</Btn>
              <Btn variant="danger" onClick={() => handleDelete(confirmDeleteId)}>Sim, excluir</Btn>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  )
}
