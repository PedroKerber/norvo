import { useState, useEffect, useRef, useCallback } from 'react'
import emailjs from '@emailjs/browser'
import { T } from '../theme'
import { Card, Btn } from '../components/ui'
import { EMPRESAS } from '../data'
import { supabase } from '../supabase'
import { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } from '../config/emailjs'
import { useMobile } from '../context/MobileContext'

const MODULOS = ['Dashboard', 'Transações', 'Receitas', 'Despesas', 'Fluxo de Caixa', 'Contas a Pagar', 'Contas a Receber', 'Relatórios', 'Fechamento Mensal', 'Empresas', 'Categorias', 'Centro de Custos', 'Metas Financeiras', 'Usuários', 'Configurações', 'Logs do Sistema']
const ACOES = ['Visualizar', 'Criar', 'Editar', 'Excluir', 'Exportar']
const CARGOS = ['CEO / Administrador Master', 'Proprietário', 'Diretor', 'Gerente Financeiro', 'Contador', 'Analista Financeiro', 'Assistente Administrativo', 'Outro']

const PERFIS = [
  { id: 'master', nome: 'Master', icon: '👑', cor: '#7c3aed', bg: '#7c3aed18', nivel: 'Acesso total', desc: 'Acesso total. Gerencia empresas, usuários e configurações.' },
  { id: 'admin', nome: 'Administrador', icon: '🛡', cor: '#2563eb', bg: '#2563eb18', nivel: 'Alto acesso', desc: 'Operações financeiras, usuários (exceto Masters) e relatórios.' },
  { id: 'gerente', nome: 'Gerente Financeiro', icon: '📊', cor: '#16a34a', bg: '#16a34a18', nivel: 'Acesso médio', desc: 'Receitas, despesas, fluxo de caixa e relatórios financeiros.' },
  { id: 'contador', nome: 'Contador', icon: '🧾', cor: '#ea580c', bg: '#ea580c18', nivel: 'Acesso restrito', desc: 'Visualizar e gerar relatórios contábeis, exportar dados.' },
  { id: 'visualizador', nome: 'Visualizador', icon: '👁', cor: '#0891b2', bg: '#0891b218', nivel: 'Somente leitura', desc: 'Apenas visualização de dashboards e relatórios. Sem alterações.' },
]

const STATUS_INFO = {
  ativo: { label: 'Ativo', cor: T.green, bg: '#dcfce7' },
  inativo: { label: 'Inativo', cor: '#6b7280', bg: '#f3f4f6' },
  bloqueado: { label: 'Bloqueado', cor: '#dc2626', bg: '#fee2e2' },
  pendente: { label: 'Convite pendente', cor: '#d97706', bg: '#fef3c7' },
  expirado: { label: 'Convite expirado', cor: '#7c3aed', bg: '#ede9fe' },
}

const AUDIT_LABELS = {
  usuario_criado: 'Usuário criado',
  usuario_editado: 'Usuário editado',
  usuario_excluido: 'Usuário excluído',
  usuario_bloqueado: 'Usuário bloqueado',
  usuario_desbloqueado: 'Usuário desbloqueado',
  usuario_desativado: 'Usuário desativado',
  usuario_reativado: 'Usuário reativado',
  convite_enviado: 'Convite enviado',
  convite_cancelado: 'Convite cancelado',
  permissoes_alteradas: 'Permissões alteradas',
}

const getStatusConvite = (u) => {
  if (!u.emailConfirmado) {
    const msDesde = Date.now() - new Date(u.criadoEmRaw || u.criadoEm).getTime()
    return msDesde > 86400000 ? 'expirado' : 'pendente'
  }
  return u.status || 'ativo'
}

const defaultPerms = (perfil) => {
  const full = Object.fromEntries(MODULOS.map(m => [m, Object.fromEntries(ACOES.map(a => [a, true]))]))
  if (perfil === 'master' || perfil === 'admin') return full
  if (perfil === 'gerente') {
    const fin = new Set(['Dashboard', 'Receitas', 'Despesas', 'Fluxo de Caixa', 'Contas a Pagar', 'Contas a Receber', 'Relatórios', 'Categorias', 'Centro de Custos', 'Metas Financeiras'])
    return Object.fromEntries(MODULOS.map(m => [m, Object.fromEntries(ACOES.map(a => [a, fin.has(m) && a !== 'Excluir']))]))
  }
  if (perfil === 'contador') {
    const visExp = new Set(['Dashboard', 'Relatórios', 'Receitas', 'Despesas', 'Fluxo de Caixa'])
    return Object.fromEntries(MODULOS.map(m => [m, Object.fromEntries(ACOES.map(a => [a, visExp.has(m) && (a === 'Visualizar' || a === 'Exportar')]))]))
  }
  // visualizador
  const visOnly = new Set(['Dashboard', 'Relatórios'])
  return Object.fromEntries(MODULOS.map(m => [m, Object.fromEntries(ACOES.map(a => [a, visOnly.has(m) && a === 'Visualizar']))]))
}

const initials = (nome) => (nome || 'U').split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'U'
const CORES_AV = ['#16a34a', '#2563eb', '#7c3aed', '#ea580c', '#dc2626', '#0891b2', '#ca8a04']
const avatarCor = (nome) => CORES_AV[(nome || 'U').charCodeAt(0) % CORES_AV.length]

const EMPTY = { nome: '', email: '', telefone: '', empresaIds: ['kz'], cargo: 'Analista Financeiro', perfil: 'gerente', status: 'ativo', mustChangePassword: false, foto: '' }

const getLocal = () => { try { return JSON.parse(localStorage.getItem('x8_usuarios_v2') || '[]') } catch { return [] } }

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

const StatusBdg = ({ status }) => {
  const s = STATUS_INFO[status] || STATUS_INFO.ativo
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: s.cor, fontWeight: 600, fontSize: 12 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.cor, display: 'inline-block' }} />{s.label}
    </span>
  )
}

export default function Usuarios({ usuario }) {
  const isMobile = useMobile()
  const fotoRef = useRef(null)

  const [usuarios, setUsuarios] = useState([])
  const [supabaseLoading, setSupabaseLoading] = useState(true)
  const [auditLog, setAuditLog] = useState([])
  const [pageTab, setPageTab] = useState('usuarios')

  const [search, setSearch] = useState('')
  const [filtroEmp, setFiltroEmp] = useState('Todas')
  const [filtroPerfil, setFiltroPerfil] = useState('Todos')
  const [filtroStatus, setFiltroStatus] = useState('Todos')

  const [modalTipo, setModalTipo] = useState(null)
  const [editId, setEditId] = useState(null)
  const [viewUser, setViewUser] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [confirmCancelId, setConfirmCancelId] = useState(null)
  const [senhaUser, setSenhaUser] = useState(null)
  const [tempSenha, setTempSenha] = useState('')
  const [senhaAplicando, setSenhaAplicando] = useState(false)
  const [senhaAplicada, setSenhaAplicada] = useState(false)
  const [inviteLinkModal, setInviteLinkModal] = useState(null)
  const [linkCopiado, setLinkCopiado] = useState(false)

  const [form, setForm] = useState(EMPTY)
  const [formPerms, setFormPerms] = useState(() => defaultPerms('gerente'))
  const [activeTab, setActiveTab] = useState('dados')
  const [erros, setErros] = useState({})
  const [saving, setSaving] = useState(false)

  const [toast, setToast] = useState('')
  const [toastOk, setToastOk] = useState(true)
  const [actionMenu, setActionMenu] = useState(null)
  const [inviteLoading, setInviteLoading] = useState(null)

  const showToast = (msg, ok = true) => {
    setToast(msg); setToastOk(ok)
    setTimeout(() => setToast(''), 3500)
  }

  const logAudit = useCallback(async (acao, detalhes = {}) => {
    try {
      await supabase.from('audit_log').insert({ user_id: usuario?.id, user_email: usuario?.email, acao, detalhes })
    } catch {}
  }, [usuario])

  const loadAuditLog = useCallback(async () => {
    try {
      const { data } = await supabase.from('audit_log').select('*').order('criado_em', { ascending: false }).limit(200)
      setAuditLog(data || [])
    } catch {}
  }, [])

  const loadSupabaseUsers = useCallback(async () => {
    setSupabaseLoading(true)
    try {
      const res = await fetch('/api/list-users')
      if (!res.ok) throw new Error('API error')
      const { users } = await res.json()
      const localMap = getLocal()
      const merged = (users || []).map(su => {
        const local = localMap.find(l => l.email === su.email) || {}
        return {
          id: su.id,
          email: su.email,
          nome: local.nome || su.nome,
          telefone: local.telefone || '',
          foto: local.foto || '',
          // prefer local (editable by admin) → supabase metadata → default
          cargo: local.cargo || su.cargo || 'Analista Financeiro',
          perfil: local.perfil || su.perfil || (su.email === usuario?.email ? 'master' : 'gerente'),
          status: local.status || 'ativo',
          mustChangePassword: local.mustChangePassword || false,
          ultimoAcesso: su.ultimoAcesso ? new Date(su.ultimoAcesso).toLocaleDateString('pt-BR') : '—',
          criadoEm: su.criadoEm ? new Date(su.criadoEm).toLocaleDateString('pt-BR') : '—',
          criadoEmRaw: su.criadoEm || null,
          emailConfirmado: su.email === usuario?.email ? true : (su.emailConfirmado || false),
          empresaIds: su.email === usuario?.email ? EMPRESAS.map(e => e.id) : (su.empresaIds || []),
        }
      })
      setUsuarios(merged)
      localStorage.setItem('x8_usuarios_v2', JSON.stringify(
        merged.map(u => ({ id: u.id, email: u.email, nome: u.nome, telefone: u.telefone, foto: u.foto, cargo: u.cargo, perfil: u.perfil, status: u.status, mustChangePassword: u.mustChangePassword, empresaIds: u.empresaIds }))
      ))
    } catch {
      setUsuarios(getLocal())
    } finally {
      setSupabaseLoading(false)
    }
  }, [usuario])

  const syncPermissions = useCallback(async (collaboratorUserId, empresaIds, perfil) => {
    if (!usuario?.id || !collaboratorUserId || collaboratorUserId === usuario.id) return
    try {
      await fetch('/api/set-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerUserId: usuario.id, collaboratorUserId, empresaIds: empresaIds || [], role: perfil || 'viewer' }),
      })
    } catch {}
  }, [usuario])

  useEffect(() => { if (usuario?.id) loadSupabaseUsers() }, [usuario, loadSupabaseUsers])
  useEffect(() => { if (pageTab === 'auditoria') loadAuditLog() }, [pageTab, loadAuditLog])

  const openAdd = () => { setForm(EMPTY); setFormPerms(defaultPerms('gerente')); setActiveTab('dados'); setErros({}); setEditId(null); setTempSenha(''); setModalTipo('form') }

  const openEdit = (u) => {
    const saved = JSON.parse(localStorage.getItem(`x8_perms_${u.id}`) || 'null')
    setForm({ ...u }); setFormPerms(saved || defaultPerms(u.perfil)); setActiveTab('dados'); setErros({}); setEditId(u.id); setModalTipo('form')
  }

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setForm(f => ({ ...f, foto: ev.target.result }))
    reader.readAsDataURL(file)
  }

  const validar = () => {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    if (!form.email.trim()) e.email = 'E-mail é obrigatório'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido'
    if (form.perfil !== 'master' && (!form.empresaIds || form.empresaIds.length === 0)) e.empresaIds = 'Selecione ao menos uma empresa'
    setErros(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validar() || saving) return
    setSaving(true)
    try {
      if (editId) {
        const prev = usuarios.find(u => u.id === editId)
        setUsuarios(p => p.map(u => u.id === editId ? { ...form, id: editId } : u))
        try {
          const saved = JSON.parse(localStorage.getItem('x8_usuarios_v2') || '[]')
          localStorage.setItem('x8_usuarios_v2', JSON.stringify(
            saved.map(u => u.id === editId
              ? { ...u, nome: form.nome, cargo: form.cargo, perfil: form.perfil, status: form.status, empresaIds: form.empresaIds, telefone: form.telefone, foto: form.foto, mustChangePassword: form.mustChangePassword }
              : u
            )
          ))
          localStorage.setItem(`x8_perms_${editId}`, JSON.stringify(formPerms))
        } catch {}
        fetch('/api/update-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: editId, nome: form.nome, cargo: form.cargo, perfil: form.perfil }),
        }).catch(() => {})
        await syncPermissions(editId, form.empresaIds, form.perfil)
        await logAudit('usuario_editado', { userId: editId, email: form.email, empresasAnteriores: prev?.empresaIds || [], empresasNovas: form.empresaIds, perfil: form.perfil })
        showToast('Usuário atualizado com sucesso!')
        setModalTipo(null)
      } else {
        setModalTipo(null)
        const inviteRes = await fetch('/api/invite-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, nome: form.nome, perfil: form.perfil, cargo: form.cargo }),
        })
        const inviteJson = await inviteRes.json()
        if (!inviteRes.ok) throw new Error(inviteJson.error || 'Erro ao criar usuário')

        const newUserId   = inviteJson.userId
        const inviteLink  = inviteJson.inviteLink

        if (newUserId) {
          await syncPermissions(newUserId, form.empresaIds, form.perfil)
          const newUser = { ...form, id: newUserId, emailConfirmado: false, ultimoAcesso: '—', criadoEm: new Date().toLocaleDateString('pt-BR') }
          setUsuarios(p => [...p.filter(u => u.email !== form.email), newUser])
          localStorage.setItem(`x8_perms_${newUserId}`, JSON.stringify(formPerms))
        }

        await logAudit('usuario_criado', { email: form.email, perfil: form.perfil, empresas: form.empresaIds })

        // Try EmailJS with the real invite link
        if (EMAILJS_SERVICE_ID && inviteLink) {
          const empresasNome = form.empresaIds.map(id => EMPRESAS.find(e => e.id === id)?.nome).filter(Boolean).join(', ')
          emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            to_name: form.nome, to_email: form.email,
            empresa: empresasNome || '', cargo: form.cargo,
            link: inviteLink,
          }, EMAILJS_PUBLIC_KEY)
            .then(() => showToast('E-mail de convite enviado!'))
            .catch(err => { console.error('EmailJS error:', err); showToast('Convite criado! E-mail não enviado — use o link abaixo.', false) })
        }

        if (inviteLink) {
          setInviteLinkModal({ email: form.email, nome: form.nome, link: inviteLink })
        } else {
          showToast(`Usuário criado! Configure o envio de e-mail nas configurações.`)
        }
      }
    } catch (e) {
      showToast(`Erro: ${e.message}`, false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    const u = usuarios.find(x => x.id === id)
    const isMasterUser = u?.perfil === 'master'
    const masterCount = usuarios.filter(x => x.perfil === 'master').length
    if (isMasterUser && masterCount <= 1) {
      showToast('Não é possível excluir o único usuário Master.', false)
      setConfirmDeleteId(null); setModalTipo(null)
      return
    }
    setUsuarios(p => p.filter(x => x.id !== id))
    setConfirmDeleteId(null); setModalTipo(null)
    try {
      const saved = JSON.parse(localStorage.getItem('x8_usuarios_v2') || '[]')
      localStorage.setItem('x8_usuarios_v2', JSON.stringify(saved.filter(x => x.id !== id)))
      localStorage.removeItem(`x8_perms_${id}`)
    } catch {}
    try {
      await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      })
    } catch {}
    await logAudit('usuario_excluido', { userId: id, email: u?.email })
    showToast('Usuário excluído permanentemente.')
  }

  const handleBlock = async (id) => {
    const u = usuarios.find(x => x.id === id)
    const novo = u?.status === 'bloqueado' ? 'ativo' : 'bloqueado'
    setUsuarios(p => p.map(x => x.id === id ? { ...x, status: novo } : x))
    setActionMenu(null)
    await logAudit(novo === 'bloqueado' ? 'usuario_bloqueado' : 'usuario_desbloqueado', { userId: id, email: u?.email })
    showToast(novo === 'bloqueado' ? 'Usuário bloqueado.' : 'Usuário desbloqueado.')
  }

  const handleDeactivate = async (id) => {
    const u = usuarios.find(x => x.id === id)
    setUsuarios(p => p.map(x => x.id === id ? { ...x, status: 'inativo' } : x))
    setActionMenu(null)
    await logAudit('usuario_desativado', { userId: id, email: u?.email })
    showToast('Usuário desativado.')
  }

  const handleReactivate = async (id) => {
    const u = usuarios.find(x => x.id === id)
    setUsuarios(p => p.map(x => x.id === id ? { ...x, status: 'ativo' } : x))
    setActionMenu(null)
    await logAudit('usuario_reativado', { userId: id, email: u?.email })
    showToast('Usuário reativado.')
  }

  const handleCancelInvite = async (id) => {
    const u = usuarios.find(x => x.id === id)
    setConfirmCancelId(null)
    try {
      const res = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      })
      const json = await res.json()
      if (!res.ok) { showToast(`Erro: ${json.error}`, false); return }
      setUsuarios(p => p.filter(x => x.id !== id))
      await logAudit('convite_cancelado', { userId: id, email: u?.email })
      showToast('Convite cancelado e usuário removido.')
    } catch (e) {
      showToast(`Erro: ${e.message}`, false)
    }
  }

  const handleInvite = async (u) => {
    setInviteLoading(u.id); setActionMenu(null)
    try {
      const res  = await fetch('/api/resend-invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: u.email, nome: u.nome }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao gerar convite')
      await logAudit('convite_enviado', { email: u.email })

      const inviteLink = json.inviteLink
      if (inviteLink) {
        // Try EmailJS (non-blocking)
        if (EMAILJS_SERVICE_ID) {
          emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            to_name: u.nome, to_email: u.email,
            empresa: empNomes(u.empresaIds).join(', '),
            cargo: u.cargo || '', link: inviteLink,
          }, EMAILJS_PUBLIC_KEY)
            .then(() => showToast('E-mail de convite enviado!'))
            .catch(err => console.error('EmailJS error:', err))
        }
        setInviteLinkModal({ email: u.email, nome: u.nome, link: inviteLink })
      } else {
        showToast(`Convite reenviado para ${u.email}!`)
      }
    } catch (e) {
      showToast(`Erro: ${e.message}`, false)
    } finally {
      setInviteLoading(null)
    }
  }

  const gerarSenha = () => {
    const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
    setTempSenha(Array.from({ length: 10 }, () => c[Math.floor(Math.random() * c.length)]).join(''))
    setSenhaAplicada(false)
  }

  const aplicarSenha = async () => {
    if (!senhaUser?.id || !tempSenha) return
    setSenhaAplicando(true)
    try {
      const res = await fetch('/api/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: senhaUser.id, password: tempSenha }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao aplicar senha')
      setSenhaAplicada(true)
      showToast(`Senha aplicada! ${senhaUser.nome} já pode entrar com essa senha.`)
    } catch (e) {
      showToast(`Erro: ${e.message}`, false)
    } finally {
      setSenhaAplicando(false)
    }
  }

  const togglePerm = (m, a) => setFormPerms(p => ({ ...p, [m]: { ...p[m], [a]: !p[m][a] } }))
  const marcarTudo = () => setFormPerms(Object.fromEntries(MODULOS.map(m => [m, Object.fromEntries(ACOES.map(a => [a, true]))])))
  const desmarcarTudo = () => setFormPerms(Object.fromEntries(MODULOS.map(m => [m, Object.fromEntries(ACOES.map(a => [a, false]))])))
  const aplicarPadrao = () => setFormPerms(defaultPerms(form.perfil))

  const filtered = usuarios.filter(u => {
    if (search && !u.nome?.toLowerCase().includes(search.toLowerCase()) && !u.email?.toLowerCase().includes(search.toLowerCase())) return false
    if (filtroEmp !== 'Todas' && !(u.empresaIds || []).includes(filtroEmp)) return false
    if (filtroPerfil !== 'Todos' && u.perfil !== filtroPerfil) return false
    if (filtroStatus !== 'Todos' && getStatusConvite(u) !== filtroStatus) return false
    return true
  })

  const empNome = (id) => EMPRESAS.find(e => e.id === id)?.nome || id
  const empNomes = (ids) => (ids || []).map(id => empNome(id)).filter(Boolean)
  const masters = usuarios.filter(u => u.perfil === 'master').length
  const admins = usuarios.filter(u => u.perfil === 'admin').length
  const ativos = usuarios.filter(u => u.status === 'ativo').length
  const outros = usuarios.filter(u => u.perfil !== 'master' && u.perfil !== 'admin').length

  const selSt = { background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '9px 12px', color: T.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%' }
  const lblSt = { display: 'block', fontWeight: 600, fontSize: 12, color: T.sub, marginBottom: 5, textTransform: 'uppercase', letterSpacing: .4 }

  const FotoArea = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fotoRef.current?.click()}>
        {form.foto
          ? <img src={form.foto} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${T.primary}` }} />
          : <div style={{ width: 72, height: 72, borderRadius: '50%', background: form.nome ? avatarCor(form.nome) : T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: form.nome ? '#fff' : T.muted, fontWeight: 800, fontSize: 26, border: `3px solid ${T.border}` }}>{form.nome ? initials(form.nome) : '👤'}</div>
        }
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: T.primary, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>📷</div>
      </div>
      <button type="button" onClick={() => fotoRef.current?.click()} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, color: T.sub, cursor: 'pointer', fontFamily: 'inherit' }}>Alterar foto</button>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: T.text }}>
      <input ref={fotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoChange} />

      {/* Header */}
      <div className="page-hd">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Usuários & Permissões</h1>
          <div style={{ color: T.sub, fontSize: 14 }}>Gerencie usuários, empresas liberadas e níveis de acesso — tudo sem sair do Norvo.</div>
        </div>
        <Btn onClick={openAdd}>＋ Novo Usuário</Btn>
      </div>

      {/* Page tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: `2px solid ${T.border}` }}>
        {[['usuarios', '👥 Usuários'], ['auditoria', '📋 Auditoria']].map(([id, label]) => (
          <button key={id} onClick={() => setPageTab(id)}
            style={{ padding: '10px 22px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: pageTab === id ? 700 : 400, color: pageTab === id ? T.primary : T.sub, borderBottom: pageTab === id ? `2px solid ${T.primary}` : '2px solid transparent', marginBottom: -2 }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── ABA USUÁRIOS ── */}
      {pageTab === 'usuarios' && (
        <>
          {/* KPIs */}
          <div className="g-4">
            {[
              { svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, cor: '#2563eb', bg: '#dbeafe', label: 'Total de Usuários', value: supabaseLoading ? '…' : usuarios.length, sub: `${ativos} ativo${ativos !== 1 ? 's' : ''}` },
              { svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, cor: '#7c3aed', bg: '#7c3aed14', label: 'Master', value: supabaseLoading ? '…' : masters, sub: `${Math.round(masters / Math.max(usuarios.length, 1) * 100)}% do total` },
              { svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, cor: '#2563eb', bg: '#dbeafe', label: 'Administradores', value: supabaseLoading ? '…' : admins, sub: `${Math.round(admins / Math.max(usuarios.length, 1) * 100)}% do total` },
              { svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, cor: '#ea580c', bg: '#fed7aa', label: 'Outros Perfis', value: supabaseLoading ? '…' : outros, sub: `${Math.round(outros / Math.max(usuarios.length, 1) * 100)}% do total` },
            ].map(k => (
              <Card key={k.label} style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ background: k.bg, borderRadius: 12, width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.cor, flexShrink: 0 }}>{k.svg}</div>
                  <div>
                    <div style={{ color: T.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>{k.label}</div>
                    <div style={{ fontWeight: 800, fontSize: 26, lineHeight: 1.1, marginTop: 2 }}>{k.value}</div>
                    <div style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>{k.sub}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Filtros */}
          <Card style={{ padding: '14px 18px', marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted, fontSize: 14 }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail..."
                  style={{ width: '100%', padding: '8px 12px 8px 32px', border: `1.5px solid ${T.border}`, borderRadius: 8, background: T.white, color: T.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <button onClick={loadSupabaseUsers} disabled={supabaseLoading}
                style={{ background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 12, color: T.sub, cursor: supabaseLoading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: supabaseLoading ? .6 : 1, whiteSpace: 'nowrap' }}>
                {supabaseLoading ? 'Carregando…' : '↺ Atualizar'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
              {[
                { value: filtroEmp, set: setFiltroEmp, opts: [['Todas', 'Todas as empresas'], ...EMPRESAS.map(e => [e.id, e.nome])] },
                { value: filtroPerfil, set: setFiltroPerfil, opts: [['Todos', 'Todos os perfis'], ...PERFIS.map(p => [p.id, p.nome])] },
                { value: filtroStatus, set: setFiltroStatus, opts: [['Todos', 'Todos os status'], ['ativo', 'Ativo'], ['inativo', 'Inativo'], ['bloqueado', 'Bloqueado'], ['pendente', 'Convite pendente'], ['expirado', 'Convite expirado']] },
              ].map((f, i) => (
                <select key={i} value={f.value} onChange={e => f.set(e.target.value)}
                  style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', color: T.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%' }}>
                  {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ))}
            </div>
          </Card>

          {/* Tabela / Cards */}
          {supabaseLoading ? (
            <Card style={{ padding: '48px 16px', textAlign: 'center', color: T.muted, fontSize: 14, marginBottom: 24 }}>Carregando usuários do Supabase…</Card>
          ) : isMobile ? (
            /* ── MOBILE CARDS ── */
            <div style={{ marginBottom: 24 }}>
              {filtered.length === 0 ? (
                <Card style={{ padding: '48px 16px', textAlign: 'center', color: T.muted, fontSize: 14 }}>Nenhum usuário encontrado.</Card>
              ) : filtered.map((u, idx) => {
                const st = getStatusConvite(u)
                const isPendente = st === 'pendente' || st === 'expirado'
                const mnu = { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left', fontFamily: 'inherit' }
                return (
                  <Card key={u.id} style={{ padding: '16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {u.foto
                          ? <img src={u.foto} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                          : <div style={{ width: 44, height: 44, borderRadius: '50%', background: avatarCor(u.nome), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>{initials(u.nome)}</div>
                        }
                        <span style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: st === 'ativo' ? T.green : st === 'bloqueado' ? '#dc2626' : st === 'pendente' ? '#d97706' : '#9ca3af', border: '2px solid white' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nome}</div>
                        <div style={{ color: T.muted, fontSize: 12, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                          <PerfilBadge perfil={u.perfil} />
                          <StatusBdg status={st} />
                        </div>
                        {u.empresaIds?.length > 0 && (
                          <div style={{ fontSize: 12, color: T.sub, marginTop: 6 }}>
                            {u.empresaIds.length === 1 ? empNome(u.empresaIds[0]) : `${empNome(u.empresaIds[0])} +${u.empresaIds.length - 1}`} · {u.cargo}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {!u.emailConfirmado && (
                        <button onClick={() => handleInvite(u)} disabled={inviteLoading === u.id}
                          style={{ background: '#fff7ed', color: T.primary, border: `1px solid ${T.primary}44`, borderRadius: 7, padding: '6px 10px', cursor: inviteLoading === u.id ? 'default' : 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', opacity: inviteLoading === u.id ? .6 : 1 }}>
                          {inviteLoading === u.id ? 'Enviando…' : 'Reenviar convite'}
                        </button>
                      )}
                      <button onClick={() => openEdit(u)} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: T.sub, fontFamily: 'inherit' }}>Editar</button>
                      <button onClick={() => { setViewUser(u); setModalTipo('view') }} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: T.sub, fontFamily: 'inherit' }}>Ver perfil</button>
                      <div style={{ position: 'relative' }}>
                        <button onClick={() => setActionMenu(actionMenu === u.id ? null : u.id)} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 12, color: T.sub, fontFamily: 'inherit' }}>⋯ Mais</button>
                        {actionMenu === u.id && (
                          <>
                            <div onClick={() => setActionMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 299 }} />
                            <div style={{ position: 'absolute', left: 0, bottom: '100%', marginBottom: 4, background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: T.shadowMd, zIndex: 300, minWidth: 200, overflow: 'hidden' }}>
                              {isPendente ? (
                                <>
                                  <button onClick={() => handleInvite(u)} style={{ ...mnu, color: T.primary }}>✉ Reenviar convite</button>
                                  <div style={{ height: 1, background: T.border, margin: '0 14px' }} />
                                  {u.email !== usuario?.email && <button onClick={() => { setConfirmCancelId(u.id); setActionMenu(null) }} style={{ ...mnu, color: '#dc2626' }}>✕ Cancelar convite</button>}
                                </>
                              ) : (
                                <>
                                  <button onClick={() => { setSenhaUser(u); setTempSenha(''); setModalTipo('senha'); setActionMenu(null) }} style={{ ...mnu, color: T.text }}>🔑 Gerar senha temporária</button>
                                  <div style={{ height: 1, background: T.border, margin: '0 14px' }} />
                                  {st === 'ativo' && <button onClick={() => handleDeactivate(u.id)} style={{ ...mnu, color: '#d97706' }}>⏸ Desativar</button>}
                                  {st === 'inativo' && <button onClick={() => handleReactivate(u.id)} style={{ ...mnu, color: T.green }}>▶ Reativar</button>}
                                  <button onClick={() => handleBlock(u.id)} style={{ ...mnu, color: st === 'bloqueado' ? T.green : '#dc2626' }}>{st === 'bloqueado' ? '🔓 Desbloquear' : '🚫 Bloquear'}</button>
                                  {u.email !== usuario?.email && (
                                    <>
                                      <div style={{ height: 1, background: T.border, margin: '0 14px' }} />
                                      <button onClick={() => { setConfirmDeleteId(u.id); setActionMenu(null); setModalTipo('delete') }} style={{ ...mnu, color: '#dc2626' }}>🗑 Excluir</button>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="tbl-wrap" style={{ marginBottom: 24 }}>
              <Card style={{ padding: 0, minWidth: 680 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 120px 100px 210px', background: T.bg, borderBottom: `1px solid ${T.border}`, borderRadius: '11px 11px 0 0' }}>
                  {[['Usuário', 20], ['Empresa / Cargo', 16], ['Perfil', 16], ['Status', 16], ['Ações', 16]].map(([h, pl]) => (
                    <div key={h} style={{ padding: `11px ${pl}px`, fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: .5 }}>{h}</div>
                  ))}
                </div>

                {filtered.length === 0 ? (
                  <div style={{ padding: '48px 16px', textAlign: 'center', color: T.muted, fontSize: 14 }}>Nenhum usuário encontrado.</div>
                ) : filtered.map((u, idx) => (
                  <div key={u.id}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 120px 100px 210px', alignItems: 'center', borderBottom: idx < filtered.length - 1 ? `1px solid ${T.borderLight}` : 'none', transition: 'background .12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                    <div style={{ padding: '14px 16px 14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {u.foto
                          ? <img src={u.foto} alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
                          : <div style={{ width: 42, height: 42, borderRadius: '50%', background: avatarCor(u.nome), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>{initials(u.nome)}</div>
                        }
                        <span style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: getStatusConvite(u) === 'ativo' ? T.green : getStatusConvite(u) === 'bloqueado' ? '#dc2626' : getStatusConvite(u) === 'pendente' ? '#d97706' : '#9ca3af', border: '2px solid white' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{u.nome}</div>
                        <div style={{ color: T.muted, fontSize: 12, marginTop: 1 }}>{u.email}</div>
                      </div>
                    </div>

                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {u.empresaIds?.length > 0 ? (u.empresaIds.length === 1 ? empNome(u.empresaIds[0]) : `${empNome(u.empresaIds[0])} +${u.empresaIds.length - 1}`) : '—'}
                      </div>
                      <div style={{ color: T.muted, fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.cargo}</div>
                    </div>

                    <div style={{ padding: '14px 16px' }}><PerfilBadge perfil={u.perfil} /></div>
                    <div style={{ padding: '14px 16px' }}><StatusBdg status={getStatusConvite(u)} /></div>

                    <div style={{ padding: '14px 16px', display: 'flex', gap: 6, alignItems: 'center' }}>
                      {!u.emailConfirmado && (
                        <button onClick={() => handleInvite(u)} disabled={inviteLoading === u.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff7ed', color: T.primary, border: `1px solid ${T.primary}44`, borderRadius: 7, padding: '5px 10px', cursor: inviteLoading === u.id ? 'default' : 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', opacity: inviteLoading === u.id ? .6 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {inviteLoading === u.id ? 'Enviando…' : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>Reenviar</>}
                        </button>
                      )}
                      <button onClick={() => openEdit(u)} title="Editar" style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 7, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.sub, flexShrink: 0 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => { setViewUser(u); setModalTipo('view') }} title="Ver perfil" style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 7, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.sub, flexShrink: 0 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button onClick={() => setActionMenu(actionMenu === u.id ? null : u.id)} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 7, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.sub }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                        {actionMenu === u.id && (() => {
                          const st = getStatusConvite(u)
                          const isPendente = st === 'pendente' || st === 'expirado'
                          const mnu = { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left', fontFamily: 'inherit' }
                          return (
                            <>
                              <div onClick={() => setActionMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 299 }} />
                              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: T.shadowMd, zIndex: 300, minWidth: 200, overflow: 'hidden' }}>
                                {isPendente ? (
                                  <>
                                    <button onClick={() => handleInvite(u)} style={{ ...mnu, color: T.primary }}>✉ Reenviar convite</button>
                                    <div style={{ height: 1, background: T.border, margin: '0 14px' }} />
                                    {u.email !== usuario?.email && (
                                      <button onClick={() => { setConfirmCancelId(u.id); setActionMenu(null) }} style={{ ...mnu, color: '#dc2626' }}>✕ Cancelar convite</button>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => { setSenhaUser(u); setTempSenha(''); setModalTipo('senha'); setActionMenu(null) }} style={{ ...mnu, color: T.text }}>🔑 Gerar senha temporária</button>
                                    <div style={{ height: 1, background: T.border, margin: '0 14px' }} />
                                    {st === 'ativo' && <button onClick={() => handleDeactivate(u.id)} style={{ ...mnu, color: '#d97706' }}>⏸ Desativar usuário</button>}
                                    {st === 'inativo' && <button onClick={() => handleReactivate(u.id)} style={{ ...mnu, color: T.green }}>▶ Reativar usuário</button>}
                                    <button onClick={() => handleBlock(u.id)} style={{ ...mnu, color: st === 'bloqueado' ? T.green : '#dc2626' }}>
                                      {st === 'bloqueado' ? '🔓 Desbloquear' : '🚫 Bloquear'}
                                    </button>
                                    {u.email !== usuario?.email && (
                                      <>
                                        <div style={{ height: 1, background: T.border, margin: '0 14px' }} />
                                        <button onClick={() => { setConfirmDeleteId(u.id); setActionMenu(null); setModalTipo('delete') }} style={{ ...mnu, color: '#dc2626' }}>🗑 Excluir usuário</button>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                ))}

                <div style={{ padding: '10px 20px', color: T.muted, fontSize: 12, borderTop: `1px solid ${T.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Mostrando {filtered.length} de {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''}</span>
                  {!supabaseLoading && <span style={{ color: T.green, fontWeight: 600, fontSize: 11 }}>● Sincronizado com Supabase</span>}
                </div>
              </Card>
            </div>
          )}

          {/* Perfis + Segurança */}
          <div className="g-side">
            <Card style={{ padding: 22 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Perfis e Níveis de Acesso</div>
              <div style={{ color: T.sub, fontSize: 13, marginBottom: 20 }}>Cada perfil define o que o usuário pode ver e fazer.</div>
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
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, textAlign: 'center' }}>Segurança em camadas</div>
              <div style={{ color: T.sub, fontSize: 13, marginBottom: 18, textAlign: 'center', lineHeight: 1.5 }}>Nenhuma configuração manual no Supabase — tudo gerenciado pelo Norvo.</div>
              {['Isolamento por empresa via RLS do Supabase', 'Convite por e-mail com link seguro', 'Permissões definidas no momento do convite', 'Log de auditoria de todas as ações', 'Controle de permissões por módulo', 'Conformidade com a LGPD'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13, color: T.sub }}>
                  <span style={{ color: T.green, fontWeight: 700 }}>✓</span> {item}
                </div>
              ))}
            </Card>
          </div>
        </>
      )}

      {/* ── ABA AUDITORIA ── */}
      {pageTab === 'auditoria' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ color: T.sub, fontSize: 14 }}>Histórico de todas as ações realizadas na gestão de usuários.</div>
            <button onClick={loadAuditLog} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 14px', fontSize: 12, color: T.sub, cursor: 'pointer', fontFamily: 'inherit' }}>↺ Atualizar</button>
          </div>
          <Card style={{ padding: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr 1fr', background: T.bg, borderBottom: `1px solid ${T.border}`, borderRadius: '11px 11px 0 0' }}>
              {['Data / Hora', 'Responsável', 'Ação', 'Detalhes'].map(h => (
                <div key={h} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: .5 }}>{h}</div>
              ))}
            </div>
            {auditLog.length === 0 ? (
              <div style={{ padding: '48px 16px', textAlign: 'center', color: T.muted, fontSize: 14 }}>Nenhum registro encontrado. As ações serão registradas automaticamente.</div>
            ) : auditLog.map((log, idx) => {
              const dt = new Date(log.criado_em)
              const dateStr = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              const label = AUDIT_LABELS[log.acao] || log.acao
              const cor = log.acao.includes('criado') ? T.green : log.acao.includes('excluido') || log.acao.includes('bloqueado') ? '#dc2626' : T.primary
              return (
                <div key={log.id}
                  style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr 1fr', alignItems: 'center', borderBottom: idx < auditLog.length - 1 ? `1px solid ${T.borderLight}` : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ padding: '12px 16px', fontSize: 12, color: T.muted, fontFamily: 'monospace' }}>{dateStr}</div>
                  <div style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.user_email}</div>
                  <div style={{ padding: '12px 16px' }}>
                    <span style={{ background: `${cor}14`, color: cor, fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '3px 8px' }}>{label}</span>
                  </div>
                  <div style={{ padding: '12px 16px', fontSize: 12, color: T.muted }}>
                    {log.detalhes?.email && <span>{log.detalhes.email}</span>}
                    {log.detalhes?.perfil && <span style={{ marginLeft: 8, background: T.bg, borderRadius: 4, padding: '2px 6px' }}>{log.detalhes.perfil}</span>}
                    {log.detalhes?.empresasNovas?.length > 0 && <span> → {log.detalhes.empresasNovas.length} empresa(s)</span>}
                  </div>
                </div>
              )
            })}
            <div style={{ padding: '10px 16px', color: T.muted, fontSize: 12, borderTop: `1px solid ${T.borderLight}` }}>{auditLog.length} registro{auditLog.length !== 1 ? 's' : ''}</div>
          </Card>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: toastOk ? T.sidebar : '#dc2626', color: '#fff', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: T.shadowMd, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          <span>{toastOk ? '✓' : '✕'}</span> {toast}
        </div>
      )}

      {/* ── MODAL FORM ── */}
      {modalTipo === 'form' && (
        <Overlay onClose={() => setModalTipo(null)}>
          <div style={{ background: T.white, borderRadius: 16, width: '100%', maxWidth: 860, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '24px 32px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>{editId ? '✏️ Editar Usuário' : '＋ Novo Usuário'}</div>
                  <div style={{ color: T.sub, fontSize: 13, marginTop: 2 }}>{editId ? 'Atualize dados, empresas e permissões.' : 'Crie o usuário — o convite e os acessos são configurados aqui.'}</div>
                </div>
                <button onClick={() => setModalTipo(null)} style={{ width: 32, height: 32, borderRadius: '50%', background: T.bg, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: T.muted }}>✕</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <FotoArea />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{form.nome || 'Nome do usuário'}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <PerfilBadge perfil={form.perfil} />
                    <StatusBdg status={form.status} />
                  </div>
                  {form.email && <div style={{ color: T.muted, fontSize: 12, marginTop: 4 }}>{form.email}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 0, marginTop: 20, borderBottom: `2px solid ${T.border}` }}>
                {[['dados', '👤 Dados & Empresas'], ['perms', '🛡 Permissões por Módulo']].map(([id, label]) => (
                  <button key={id} onClick={() => setActiveTab(id)} style={{ padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: activeTab === id ? 700 : 400, color: activeTab === id ? T.primary : T.sub, borderBottom: activeTab === id ? `2px solid ${T.primary}` : '2px solid transparent', marginBottom: -2 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>
              {activeTab === 'dados' ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={lblSt}>Nome Completo *</label>
                      <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ana Beatriz Santos"
                        style={{ ...selSt, border: `1.5px solid ${erros.nome ? '#dc2626' : T.border}`, fontSize: 14 }} />
                      {erros.nome && <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>{erros.nome}</div>}
                    </div>
                    <div>
                      <label style={lblSt}>E-mail *</label>
                      <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ana@empresa.com.br"
                        disabled={!!editId}
                        style={{ ...selSt, border: `1.5px solid ${erros.email ? '#dc2626' : T.border}`, fontSize: 14, opacity: editId ? .7 : 1 }} />
                      {erros.email && <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>{erros.email}</div>}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <label style={lblSt}>Telefone</label>
                      <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(61) 99999-9999" style={{ ...selSt, fontSize: 14 }} />
                    </div>
                    <div>
                      <label style={lblSt}>Cargo</label>
                      <select value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} style={{ ...selSt, fontSize: 14 }}>
                        {CARGOS.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Empresas */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <label style={{ ...lblSt, marginBottom: 0 }}>
                        Empresas com Acesso{form.perfil !== 'master' ? ' *' : ''}
                        <span style={{ fontWeight: 400, color: T.green, fontSize: 11, marginLeft: 8 }}>→ sincroniza automaticamente com Supabase</span>
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" onClick={() => setForm(f => ({ ...f, empresaIds: EMPRESAS.map(e => e.id) }))}
                          style={{ background: '#fff7ed', color: T.primary, border: `1px solid ${T.primary}44`, borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Todas</button>
                        <button type="button" onClick={() => setForm(f => ({ ...f, empresaIds: [] }))}
                          style={{ background: T.bg, color: T.sub, border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Nenhuma</button>
                      </div>
                    </div>
                    <div style={{ border: `1.5px solid ${erros.empresaIds ? '#dc2626' : T.border}`, borderRadius: 10, overflow: 'hidden' }}>
                      {EMPRESAS.map((emp, i) => {
                        const checked = (form.empresaIds || []).includes(emp.id)
                        return (
                          <div key={emp.id}
                            onClick={() => setForm(f => ({ ...f, empresaIds: checked ? f.empresaIds.filter(id => id !== emp.id) : [...(f.empresaIds || []), emp.id] }))}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer', background: checked ? `${emp.cor}10` : T.white, borderBottom: i < EMPRESAS.length - 1 ? `1px solid ${T.borderLight}` : 'none', userSelect: 'none' }}>
                            <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, border: `2px solid ${checked ? emp.cor : T.border}`, background: checked ? emp.cor : T.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {checked && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                            </div>
                            <div style={{ width: 30, height: 30, borderRadius: 7, background: `${emp.cor}18`, border: `1px solid ${emp.cor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: emp.cor, fontSize: 11, flexShrink: 0 }}>{emp.initials}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: checked ? emp.cor : T.text }}>{emp.nome}</div>
                              <div style={{ fontSize: 11, color: T.muted }}>{emp.setor}</div>
                            </div>
                            {checked && <span style={{ color: emp.cor, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>✓ Acesso</span>}
                          </div>
                        )
                      })}
                    </div>
                    {erros.empresaIds && <div style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>{erros.empresaIds}</div>}
                    {(form.empresaIds || []).length > 0 && <div style={{ fontSize: 11, color: T.sub, marginTop: 5 }}>{form.empresaIds.length} empresa{form.empresaIds.length !== 1 ? 's' : ''} selecionada{form.empresaIds.length !== 1 ? 's' : ''}</div>}
                  </div>

                  {/* Perfil */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={lblSt}>Perfil de Acesso</label>
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
                    <label style={lblSt}>Status</label>
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

                  {!editId && (
                    <div style={{ marginBottom: 20 }}>
                      <label style={lblSt}>Senha Temporária</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <input value={tempSenha} onChange={e => setTempSenha(e.target.value)} placeholder="Digite ou gere uma senha…"
                            style={{ ...selSt, fontSize: 14, fontFamily: tempSenha ? 'monospace' : 'inherit', paddingRight: 36 }} />
                          {tempSenha && (
                            <button onClick={() => navigator.clipboard?.writeText(tempSenha).then(() => showToast('Senha copiada!'))}
                              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.primary, fontSize: 14 }}>📋</button>
                          )}
                        </div>
                        <button onClick={gerarSenha}
                          style={{ background: '#fff7ed', color: T.primary, border: `1px solid ${T.primary}44`, borderRadius: 8, padding: '0 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>⚡ Gerar</button>
                      </div>
                      {tempSenha && <div style={{ fontSize: 11, color: T.green, marginTop: 5 }}>✓ Senha será incluída no e-mail de convite</div>}
                    </div>
                  )}

                  <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.mustChangePassword} onChange={e => setForm(f => ({ ...f, mustChangePassword: e.target.checked }))} style={{ width: 16, height: 16, accentColor: T.primary }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>Exigir troca de senha no primeiro acesso</div>
                        <div style={{ color: T.muted, fontSize: 11 }}>O usuário será solicitado a trocar a senha ao entrar.</div>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                    <button onClick={marcarTudo} style={{ background: '#fff7ed', color: T.primary, border: `1px solid ${T.primary}44`, borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>✓ Marcar tudo</button>
                    <button onClick={desmarcarTudo} style={{ background: T.bg, color: T.sub, border: `1px solid ${T.border}`, borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>✕ Desmarcar tudo</button>
                    <button onClick={aplicarPadrao} style={{ background: T.bg, color: T.sub, border: `1px solid ${T.border}`, borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>↺ Padrão do perfil ({PERFIS.find(p => p.id === form.perfil)?.nome})</button>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: T.bg }}>
                          <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 700, color: T.text, borderBottom: `2px solid ${T.border}` }}>Módulo</th>
                          {ACOES.map(a => <th key={a} style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, color: T.sub, borderBottom: `2px solid ${T.border}` }}>{a}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {MODULOS.map((modulo, i) => (
                          <tr key={modulo} style={{ background: i % 2 === 0 ? T.white : T.bg }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: T.text, borderBottom: `1px solid ${T.borderLight}` }}>{modulo}</td>
                            {ACOES.map(acao => (
                              <td key={acao} style={{ padding: '10px', textAlign: 'center', borderBottom: `1px solid ${T.borderLight}` }}>
                                <input type="checkbox" checked={formPerms[modulo]?.[acao] || false} onChange={() => togglePerm(modulo, acao)} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: T.primary }} />
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

            <div style={{ padding: '16px 32px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0, background: T.white, borderRadius: '0 0 16px 16px' }}>
              <Btn variant="ghost" onClick={() => setModalTipo(null)}>Cancelar</Btn>
              <Btn onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : editId ? '💾 Salvar Alterações' : '＋ Criar e Convidar'}</Btn>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── MODAL: VER PERFIL ── */}
      {modalTipo === 'view' && viewUser && (
        <Overlay onClose={() => setModalTipo(null)}>
          <div style={{ background: T.white, borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ background: `linear-gradient(135deg, ${T.sidebar} 0%, #0d3320 100%)`, padding: '28px 28px 20px', borderRadius: '16px 16px 0 0', position: 'relative' }}>
              <button onClick={() => setModalTipo(null)} style={{ position: 'absolute', top: 16, right: 16, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                {viewUser.foto
                  ? <img src={viewUser.foto} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.4)' }} />
                  : <div style={{ width: 72, height: 72, borderRadius: '50%', background: avatarCor(viewUser.nome), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 28, border: '3px solid rgba(255,255,255,0.4)' }}>{initials(viewUser.nome)}</div>
                }
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 20, marginBottom: 6 }}>{viewUser.nome}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <PerfilBadge perfil={viewUser.perfil} />
                    <StatusBdg status={viewUser.status} />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: 28 }}>
              {[
                { icon: '✉', label: 'E-mail', val: viewUser.email },
                { icon: '📱', label: 'Telefone', val: viewUser.telefone || '—' },
                { icon: '💼', label: 'Cargo', val: viewUser.cargo },
                { icon: '🏢', label: 'Empresas com Acesso', val: empNomes(viewUser.empresaIds).join(', ') || '—' },
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

      {/* ── MODAL: LINK DE CONVITE ── */}
      {inviteLinkModal && (
        <Overlay onClose={() => { setInviteLinkModal(null); setLinkCopiado(false) }}>
          <div style={{ background: T.white, borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>✅</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Convite gerado!</div>
                <div style={{ color: T.sub, fontSize: 13 }}>Para: <strong>{inviteLinkModal.nome}</strong> · {inviteLinkModal.email}</div>
              </div>
            </div>

            <div style={{ height: 1, background: T.border, margin: '18px 0' }} />

            <div style={{ fontSize: 13, color: T.sub, marginBottom: 10, fontWeight: 500 }}>Link de ativação (válido por 7 dias):</div>
            <div style={{ background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 9, padding: '11px 14px', marginBottom: 14, fontSize: 11, fontFamily: 'monospace', color: T.text, wordBreak: 'break-all', lineHeight: 1.5, userSelect: 'all', cursor: 'text' }}>
              {inviteLinkModal.link}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => {
                navigator.clipboard?.writeText(inviteLinkModal.link).then(() => {
                  setLinkCopiado(true); setTimeout(() => setLinkCopiado(false), 2000)
                })
              }} style={{ flex: 1, background: linkCopiado ? '#f0fdf4' : T.white, border: `1.5px solid ${linkCopiado ? '#16a34a' : T.border}`, borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: linkCopiado ? '#16a34a' : T.text, fontFamily: 'inherit' }}>
                {linkCopiado ? '✓ Copiado!' : '📋 Copiar link'}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Olá, ${inviteLinkModal.nome}! Segue seu link de acesso ao Norvo:\n${inviteLinkModal.link}`)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1, background: '#25D366', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#fff', textDecoration: 'none' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>
            </div>

            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', lineHeight: 1.55, marginBottom: 20 }}>
              <strong>Como funciona:</strong> Ao clicar no link, {inviteLinkModal.nome} definirá uma senha e terá acesso imediato às empresas liberadas. O link expira em <strong>7 dias</strong>.
            </div>

            <Btn onClick={() => { setInviteLinkModal(null); setLinkCopiado(false) }}>Fechar</Btn>
          </div>
        </Overlay>
      )}

      {/* ── MODAL: SENHA ── */}
      {modalTipo === 'senha' && senhaUser && (
        <Overlay onClose={() => { setModalTipo(null); setSenhaAplicada(false); setTempSenha('') }}>
          <div style={{ background: T.white, borderRadius: 16, padding: 32, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>🔑 Definir Senha Temporária</div>
            <div style={{ color: T.sub, fontSize: 13, marginBottom: 24 }}>Para: <strong>{senhaUser.nome}</strong> · {senhaUser.email}</div>
            {!tempSenha ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
                <Btn onClick={gerarSenha}>Gerar senha temporária</Btn>
              </div>
            ) : (
              <div>
                <div style={{ background: T.bg, border: `2px solid ${senhaAplicada ? '#16a34a' : T.primary}`, borderRadius: 10, padding: '16px 18px', marginBottom: 16, textAlign: 'center' }}>
                  <div style={{ color: T.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6 }}>Senha gerada</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: 2 }}>{tempSenha}</div>
                </div>
                {senhaAplicada ? (
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#15803d', fontWeight: 600, textAlign: 'center' }}>
                    Senha aplicada com sucesso! Jefferson pode entrar agora.
                  </div>
                ) : (
                  <div style={{ background: '#fef9c3', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
                    Clique em "Aplicar Senha" para definir essa senha no sistema. Depois copie e envie ao usuário.
                  </div>
                )}
                <button onClick={aplicarSenha} disabled={senhaAplicando || senhaAplicada}
                  style={{ width: '100%', background: senhaAplicada ? '#16a34a' : T.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 13, fontWeight: 700, cursor: senhaAplicando || senhaAplicada ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginBottom: 8, opacity: senhaAplicando ? 0.7 : 1 }}>
                  {senhaAplicando ? 'Aplicando...' : senhaAplicada ? 'Senha aplicada' : 'Aplicar Senha no Sistema'}
                </button>
                <button onClick={() => navigator.clipboard?.writeText(tempSenha).then(() => showToast('Senha copiada!'))}
                  style={{ width: '100%', background: '#fff7ed', color: T.primary, border: `1px solid ${T.primary}44`, borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8 }}>📋 Copiar senha</button>
                <button onClick={gerarSenha} style={{ width: '100%', background: 'none', color: T.muted, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>↺ Gerar outra senha</button>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <Btn variant="ghost" onClick={() => { setModalTipo(null); setSenhaAplicada(false); setTempSenha('') }}>Fechar</Btn>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── MODAL: CANCELAR CONVITE ── */}
      {confirmCancelId && (
        <Overlay onClose={() => setConfirmCancelId(null)}>
          <div style={{ background: T.white, borderRadius: 16, padding: 32, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✕</div>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Cancelar convite?</div>
            <div style={{ color: T.sub, fontSize: 13, marginBottom: 28 }}>
              O usuário <strong>{usuarios.find(u => u.id === confirmCancelId)?.email}</strong> será removido do sistema. Esta ação não pode ser desfeita.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Btn variant="ghost" onClick={() => setConfirmCancelId(null)}>Cancelar</Btn>
              <Btn variant="danger" onClick={() => handleCancelInvite(confirmCancelId)}>Sim, cancelar convite</Btn>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── MODAL: EXCLUIR ── */}
      {modalTipo === 'delete' && confirmDeleteId && (
        <Overlay onClose={() => setModalTipo(null)}>
          <div style={{ background: T.white, borderRadius: 16, padding: 32, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗑</div>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Excluir usuário permanentemente?</div>
            <div style={{ color: T.sub, fontSize: 13, marginBottom: 28 }}>O usuário será removido do sistema, incluindo o acesso de login. Esta ação não pode ser desfeita.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Btn variant="ghost" onClick={() => setModalTipo(null)}>Cancelar</Btn>
              <Btn variant="danger" onClick={() => handleDelete(confirmDeleteId)}>Sim, excluir permanentemente</Btn>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  )
}
