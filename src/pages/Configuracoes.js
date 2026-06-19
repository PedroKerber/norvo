import { useState, useRef } from 'react'
import { T } from '../theme'
import { Card, Btn, Input } from '../components/ui'
import { EMPRESAS } from '../data'
import { supabase } from '../supabase'
import { useNotif } from '../context/NotifContext'

const CARGOS = ['CEO / Administrador Master', 'Proprietário', 'Diretor', 'Gerente Financeiro', 'Contador', 'Analista', 'Assistente']
const PERMISSOES_LISTA = ['Dashboard', 'Empresas', 'Receitas', 'Despesas', 'Metas Financeiras', 'Relatórios', 'Categorias', 'Centro de Custos', 'Usuários', 'Configurações', 'Logs do Sistema']
const ACOES_PERM = ['Visualizar', 'Criar', 'Editar', 'Excluir', 'Exportar']
const TIPOS_HIST = ['Login', 'Logout', 'Financeiro', 'Relatório', 'Usuário', 'Segurança', 'Permissões', 'Empresa', 'Perfil']

const ATIVIDADES = [
  { cor: T.green, bg: T.greenL, icon: '＋', titulo: 'Cadastro de despesa', desc: 'Despesa de material de escritório', data: 'Hoje', hora: '14:12' },
  { cor: T.blue, bg: T.blueL, icon: '↑', titulo: 'Aprovação de receita', desc: 'Receita de aluguel - Sala 101', data: 'Hoje', hora: '11:43' },
  { cor: T.purple, bg: T.purpleL, icon: '≡', titulo: 'Geração de relatório financeiro', desc: 'Relatório Mensal - Mai/2026', data: 'Ontem', hora: '17:58' },
  { cor: T.orange, bg: T.orangeL, icon: '👤', titulo: 'Cadastro de usuário', desc: 'Novo usuário: Ana Beatriz', data: 'Ontem', hora: '16:22' },
]

const HIST_COMPLETO = [
  { cor: T.green, bg: T.greenL, icon: '🔑', tipo: 'Login', desc: 'Login realizado', empresa: 'Sistema', data: '16/06/2026', hora: '14:37' },
  { cor: T.blue, bg: T.blueL, icon: '＋', tipo: 'Financeiro', desc: 'Cadastro de despesa: Material de escritório', empresa: 'Kazole Imobiliária', data: '16/06/2026', hora: '14:12' },
  { cor: T.blue, bg: T.blueL, icon: '↑', tipo: 'Financeiro', desc: 'Aprovação de receita: Aluguel Sala 101', empresa: 'Kazole Imobiliária', data: '16/06/2026', hora: '11:43' },
  { cor: T.purple, bg: T.purpleL, icon: '≡', tipo: 'Relatório', desc: 'Geração de relatório: Mensal - Mai/2026', empresa: 'Kazole Imobiliária', data: '15/06/2026', hora: '17:58' },
  { cor: T.orange, bg: T.orangeL, icon: '👤', tipo: 'Usuário', desc: 'Cadastro de usuário: Ana Beatriz', empresa: 'AxionZ Marketing', data: '15/06/2026', hora: '16:22' },
  { cor: T.red, bg: T.redL, icon: '🔒', tipo: 'Segurança', desc: 'Alteração de senha realizada', empresa: 'Sistema', data: '15/06/2026', hora: '10:05' },
  { cor: T.purple, bg: T.purpleL, icon: '🛡', tipo: 'Permissões', desc: 'Permissões de acesso atualizadas', empresa: 'Sistema', data: '14/06/2026', hora: '15:30' },
  { cor: T.blue, bg: T.blueL, icon: '🏢', tipo: 'Empresa', desc: 'Empresa vinculada: K2 Imob', empresa: 'Sistema', data: '14/06/2026', hora: '09:15' },
  { cor: T.green, bg: T.greenL, icon: '📷', tipo: 'Perfil', desc: 'Foto de perfil atualizada', empresa: 'Sistema', data: '13/06/2026', hora: '16:45' },
  { cor: T.red, bg: T.redL, icon: '🚪', tipo: 'Logout', desc: 'Logout realizado', empresa: 'Sistema', data: '13/06/2026', hora: '18:00' },
  { cor: T.green, bg: T.greenL, icon: '🔑', tipo: 'Login', desc: 'Login realizado', empresa: 'Sistema', data: '13/06/2026', hora: '09:00' },
  { cor: T.blue, bg: T.blueL, icon: '↓', tipo: 'Financeiro', desc: 'Lançamento de despesa: Aluguel Escritório', empresa: 'Kazole Imobiliária', data: '12/06/2026', hora: '11:20' },
]

const masterPerms = () => Object.fromEntries(
  PERMISSOES_LISTA.map(m => [m, Object.fromEntries(ACOES_PERM.map(a => [a, true]))])
)

const SectionTitle = ({ icon, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${T.border}` }}>
    <div style={{ width: 32, height: 32, borderRadius: 8, background: T.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: T.primary }}>{icon}</div>
    <span style={{ fontWeight: 700, fontSize: 16, color: T.text }}>{title}</span>
  </div>
)

const InfoRow = ({ icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: `1px solid ${T.borderLight}` }}>
    <div style={{ width: 36, height: 36, borderRadius: 10, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <div style={{ color: T.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{value || '—'}</div>
    </div>
  </div>
)

const Overlay = ({ children, onClose }) => (
  <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    {children}
  </div>
)

export default function Configuracoes({ usuario, onLogout, empresa, onPerfilUpdate, setPage, onReset }) {
  const fotoRef = useRef(null)
  const { limparTudo } = useNotif()
  const perfilKey = usuario?.id ? `x8_perfil_${usuario.id}` : 'x8_perfil'
  const savedPerfil = JSON.parse(localStorage.getItem(perfilKey) || '{}')

  const [foto, setFoto] = useState(localStorage.getItem(usuario?.id ? `x8_foto_${usuario.id}` : '') || '')
  const [nome, setNome] = useState(savedPerfil.nome || usuario?.nome || '')
  const [cargo, setCargo] = useState(savedPerfil.cargo || usuario?.cargo || '')
  const [telefone, setTelefone] = useState(savedPerfil.telefone || '')
  const [cpf, setCpf] = useState(savedPerfil.cpf || '')
  const [showCpf, setShowCpf] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  const [toast, setToast] = useState('')
  const [toastOk, setToastOk] = useState(true)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const wasReset = localStorage.getItem('x8_data_reset') === '1'

  const [senhaModal, setSenhaModal] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [senhaConfirm, setSenhaConfirm] = useState('')
  const [showSenha, setShowSenha] = useState({ atual: false, nova: false, confirm: false })
  const [senhaLoading, setSenhaLoading] = useState(false)
  const [senhaErro, setSenhaErro] = useState('')

  const [permModal, setPermModal] = useState(false)
  const [perms, setPerms] = useState(() => {
    const s = localStorage.getItem('x8_perms')
    return s ? JSON.parse(s) : masterPerms()
  })

  const [empModal, setEmpModal] = useState(false)
  const [empSearch, setEmpSearch] = useState('')
  const [empSelecionadas, setEmpSelecionadas] = useState(() => {
    const s = localStorage.getItem('x8_emp_sel')
    return s ? JSON.parse(s) : EMPRESAS.map(e => e.id)
  })
  const [empPrincipal, setEmpPrincipal] = useState(() =>
    localStorage.getItem('x8_emp_principal') || (EMPRESAS[0]?.id || '')
  )

  const [histModal, setHistModal] = useState(false)
  const [histFiltro, setHistFiltro] = useState({ tipo: 'Todos', empresa: 'Todas' })

  const showToast = (msg, ok = true) => {
    setToast(msg); setToastOk(ok)
    setTimeout(() => setToast(''), 3500)
  }

  const handleResetClick = async () => {
    setResetLoading(true)
    try {
      if (onReset) await onReset()
      limparTudo()
      setConfirmReset(false)
      showToast('Sistema limpo! Pronto para dados reais.')
    } catch {
      showToast('Erro ao resetar. Tente novamente.', false)
    } finally {
      setResetLoading(false)
    }
  }

  const handleFoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const b64 = ev.target.result
      setFoto(b64)
      if (usuario?.id) localStorage.setItem(`x8_foto_${usuario.id}`, b64)
      onPerfilUpdate && onPerfilUpdate()
      showToast('Foto atualizada com sucesso!')
    }
    reader.onerror = () => showToast('Não foi possível atualizar a foto', false)
    reader.readAsDataURL(file)
  }

  const salvar = async () => {
    if (!nome.trim()) return showToast('Nome é obrigatório', false)
    setSaving(true)
    localStorage.setItem(perfilKey, JSON.stringify({ nome, cargo, telefone, cpf }))
    try { await supabase.auth.updateUser({ data: { nome: nome.trim(), cargo } }) } catch {}
    onPerfilUpdate && onPerfilUpdate()
    await new Promise(r => setTimeout(r, 700))
    setSaving(false)
    showToast('Perfil atualizado com sucesso!')
    setTimeout(() => setPage && setPage('dashboard'), 1500)
  }

  const alterarSenha = async () => {
    setSenhaErro('')
    if (!senhaAtual) return setSenhaErro('Informe a senha atual')
    if (senhaNova.length < 8) return setSenhaErro('A nova senha precisa ter no mínimo 8 caracteres')
    if (senhaNova !== senhaConfirm) return setSenhaErro('As senhas não coincidem')
    setSenhaLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: senhaNova })
      if (error) throw error
      setSenhaModal(false)
      setSenhaAtual(''); setSenhaNova(''); setSenhaConfirm('')
      showToast('Senha alterada com sucesso!')
    } catch {
      setSenhaErro('Não foi possível alterar a senha. Tente novamente.')
    } finally {
      setSenhaLoading(false)
    }
  }

  const fecharSenhaModal = () => {
    setSenhaModal(false); setSenhaErro('')
    setSenhaAtual(''); setSenhaNova(''); setSenhaConfirm('')
  }

  const salvarPerms = () => {
    localStorage.setItem('x8_perms', JSON.stringify(perms))
    setPermModal(false)
    showToast('Permissões atualizadas com sucesso!')
  }

  const togglePerm = (modulo, acao) => {
    setPerms(p => ({ ...p, [modulo]: { ...p[modulo], [acao]: !p[modulo][acao] } }))
  }

  const salvarEmpresas = () => {
    localStorage.setItem('x8_emp_sel', JSON.stringify(empSelecionadas))
    localStorage.setItem('x8_emp_principal', empPrincipal)
    setEmpModal(false)
    showToast('Empresas vinculadas com sucesso!')
  }

  const toggleEmp = (id) => {
    if (id === empPrincipal) return
    setEmpSelecionadas(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])
  }

  const email = usuario?.email || 'pedro@norvo.com.br'
  const inicial = (nome || 'P')[0].toUpperCase()
  const empAtual = empresa?.nome || 'Kazole Imobiliária'
  const isMaster = cargo === 'CEO / Administrador Master'
  const empVinculadas = EMPRESAS.filter(e => empSelecionadas.includes(e.id))
  const empresasFiltradas = EMPRESAS.filter(e => e.nome.toLowerCase().includes(empSearch.toLowerCase()))
  const atividades = wasReset ? [] : ATIVIDADES
  const histFiltrado = (wasReset ? [] : HIST_COMPLETO).filter(a => {
    if (histFiltro.tipo !== 'Todos' && a.tipo !== histFiltro.tipo) return false
    if (histFiltro.empresa !== 'Todas' && a.empresa !== histFiltro.empresa) return false
    return true
  })

  const PwInput = ({ label, val, setVal, campo }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: T.text, marginBottom: 5 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={showSenha[campo] ? 'text' : 'password'}
          value={val} onChange={e => setVal(e.target.value)}
          style={{ width: '100%', border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '9px 40px 9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', color: T.text, background: T.white, boxSizing: 'border-box' }}
        />
        <button type="button" onClick={() => setShowSenha(s => ({ ...s, [campo]: !s[campo] }))}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 16 }}>
          {showSenha[campo] ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: T.text, maxWidth: 900 }}>
      <input ref={fotoRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFoto} />

      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Meu Perfil</h1>
          <div style={{ color: T.sub, fontSize: 14 }}>Gerencie suas informações pessoais e permissões de acesso.</div>
        </div>
        <button
          onClick={() => setPage && setPage('dashboard')}
          title="Fechar e voltar ao Dashboard"
          style={{ width: 36, height: 36, borderRadius: '50%', background: T.bg, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer', color: T.muted, flexShrink: 0, marginTop: 4 }}
          onMouseEnter={e => { e.currentTarget.style.background = T.border }}
          onMouseLeave={e => { e.currentTarget.style.background = T.bg }}
        >✕</button>
      </div>

      {/* Card principal */}
      <Card style={{ padding: '28px 32px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }} onClick={() => fotoRef.current?.click()}>
            {foto ? (
              <img src={foto} alt="Perfil" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', boxShadow: `0 6px 20px ${T.primary}44` }} />
            ) : (
              <div style={{ width: 96, height: 96, borderRadius: '50%', background: `linear-gradient(135deg, ${T.primary}, #0d5c2e)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 38, boxShadow: `0 6px 20px ${T.primary}44` }}>
                {inicial}
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: '50%', background: T.primary, border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff' }}>
              📷
            </div>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 6 }}>{nome}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ background: T.purpleL, color: T.purple, fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '3px 12px' }}>👑 Master Administrator</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: T.green, fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.green, display: 'inline-block' }} /> Ativo
              </span>
            </div>
            <div style={{ color: T.sub, fontSize: 13 }}>🏢 Empresa atual: <strong style={{ color: T.text }}>{empAtual}</strong></div>
          </div>

          {/* Meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 180 }}>
            {[{ icon: '🕐', label: 'Último acesso', val: '16/06/2026 · 14:37' }, { icon: '📅', label: 'Data de cadastro', val: '10/06/2026' }, { icon: '✉', label: 'E-mail', val: email }].map(({ icon, label, val }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <div>
                  <div style={{ color: T.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            <Btn onClick={() => setEditMode(e => !e)}>
              {editMode ? '✓ Modo edição ativo' : '✏ Editar Perfil'}
            </Btn>
            <Btn variant="ghost" sm onClick={() => setSenhaModal(true)}>🔒 Alterar Senha</Btn>
          </div>
        </div>
      </Card>

      {/* Grid principal */}
      <div className="g-2">

        {/* Informações Pessoais */}
        <Card style={{ padding: '24px 28px' }}>
          <SectionTitle icon="👤" title="Informações Pessoais" />
          {editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Input label="Nome Completo" value={nome} onChange={e => setNome(e.target.value)} placeholder="Pedro Kerber" />
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: T.text, marginBottom: 5 }}>Cargo</label>
                <select value={cargo} onChange={e => setCargo(e.target.value)} style={{ width: '100%', background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '9px 12px', color: T.text, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}>
                  {CARGOS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <Input label="Telefone" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(61) 99999-9999" />
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: T.text, marginBottom: 5 }}>CPF</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={showCpf ? cpf : '•••.•••.•••-••'}
                    onChange={e => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    readOnly={!showCpf}
                    style={{ width: '100%', border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '9px 40px 9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', color: T.text, background: showCpf ? T.white : T.bg, boxSizing: 'border-box', cursor: showCpf ? 'text' : 'default' }}
                  />
                  <button type="button" onClick={() => setShowCpf(s => !s)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 16 }}>
                    {showCpf ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: T.text, marginBottom: 5, marginTop: 4 }}>E-mail</label>
              <input value={email} readOnly style={{ width: '100%', background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '9px 12px', color: T.muted, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', cursor: 'not-allowed' }} />
            </div>
          ) : (
            <div>
              <InfoRow icon="👤" label="Nome Completo" value={nome} />
              <InfoRow icon="✉" label="E-mail" value={email} />
              <InfoRow icon="📱" label="Telefone" value={telefone} />
              <InfoRow icon="💼" label="Cargo" value={cargo} />
              {/* CPF com toggle de visibilidade */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: `1px solid ${T.borderLight}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🪪</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: T.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 2 }}>CPF</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{showCpf ? (cpf || '—') : '•••.•••.•••-••'}</div>
                </div>
                <button onClick={() => setShowCpf(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 16, padding: 4, flexShrink: 0 }}>
                  {showCpf ? '🙈' : '👁'}
                </button>
              </div>
              <InfoRow icon="📅" label="Data de Cadastro" value="10/06/2026" />
            </div>
          )}
        </Card>

        {/* Permissões */}
        <Card style={{ padding: '24px 28px' }}>
          <SectionTitle icon="🛡" title="Permissões de Acesso" />
          <div style={{ background: `linear-gradient(135deg, ${T.purpleL}, #ede9fe)`, borderRadius: 12, padding: '14px 18px', marginBottom: 18, border: `1px solid ${T.purple}22` }}>
            <div style={{ color: T.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 2 }}>Nível de Acesso</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: T.purple, marginBottom: 2 }}>{isMaster ? 'MASTER' : 'PERSONALIZADO'}</div>
            <div style={{ color: T.sub, fontSize: 12 }}>{isMaster ? 'Possui acesso total ao sistema.' : 'Permissões configuradas manualmente.'}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px', marginBottom: 18 }}>
            {PERMISSOES_LISTA.map(p => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
                <span style={{ color: T.green, fontWeight: 700 }}>✓</span>
                <span style={{ color: T.text }}>{p}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setPermModal(true)} style={{ background: 'none', border: 'none', color: T.primary, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            Gerenciar permissões avançadas →
          </button>
        </Card>
      </div>

      {/* Grid secundário */}
      <div className="g-2">

        {/* Empresas Vinculadas */}
        <Card style={{ padding: '24px 28px' }}>
          <SectionTitle icon="🏢" title="Empresas Vinculadas" />
          <div style={{ color: T.sub, fontSize: 12, marginTop: -12, marginBottom: 14 }}>Empresas que você gerencia no sistema.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {empVinculadas.map((emp, i) => (
              <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: emp.cor + '22', border: `1.5px solid ${emp.cor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: emp.cor, fontSize: 11, flexShrink: 0 }}>{emp.initials}</div>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: T.text }}>{emp.nome}</span>
                {emp.id === empPrincipal && <span style={{ background: T.yellowL, color: T.yellow, fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '2px 8px' }}>⭐ Principal</span>}
                {i === 0 && emp.id !== empPrincipal && <span style={{ background: T.yellowL, color: T.yellow, fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '2px 8px' }}>⭐ Principal</span>}
              </div>
            ))}
          </div>
          <button onClick={() => setEmpModal(true)} style={{ width: '100%', border: `1.5px dashed ${T.border}`, borderRadius: 10, padding: 10, background: 'transparent', color: T.primary, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Vincular Empresa
          </button>
        </Card>

        {/* Segurança */}
        <Card style={{ padding: '24px 28px' }}>
          <SectionTitle icon="🔒" title="Segurança da Conta" />
          {[
            { icon: '🛡', label: 'Senha alterada há', val: '23 dias' },
            { icon: '✅', label: 'Autenticação em 2 fatores', val: 'Ativada' },
            { icon: '💻', label: 'Sessões ativas', val: '2 dispositivos' },
          ].map(({ icon, label, val }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: `1px solid ${T.borderLight}` }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.greenL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
              <div style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{label}</div>
              <span style={{ fontWeight: 700, fontSize: 12, color: T.green }}>{val}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <Btn variant="ghost" sm full onClick={() => setSenhaModal(true)}>🔒 Alterar Senha</Btn>
            <Btn variant="ghost" sm full>💻 Gerenciar Dispositivos</Btn>
          </div>
        </Card>
      </div>

      {/* Histórico */}
      <Card style={{ padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: T.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: T.primary }}>🕐</div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Histórico de Atividades</span>
          </div>
          <button onClick={() => setHistModal(true)} style={{ background: 'none', border: 'none', color: T.primary, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Ver todas →</button>
        </div>
        {atividades.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: T.muted, fontSize: 13 }}>
            Nenhuma atividade registrada ainda.
          </div>
        ) : atividades.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < atividades.length - 1 ? `1px solid ${T.borderLight}` : 'none' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: a.cor, fontWeight: 700, flexShrink: 0 }}>{a.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{a.titulo}</div>
              <div style={{ color: T.sub, fontSize: 12 }}>{a.desc}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{a.data}</div>
              <div style={{ color: T.muted, fontSize: 11 }}>{a.hora}</div>
            </div>
          </div>
        ))}
        <button onClick={() => setHistModal(true)} style={{ width: '100%', marginTop: 16, border: `1px solid ${T.border}`, borderRadius: 10, padding: 10, background: 'transparent', color: T.sub, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          Ver histórico completo
        </button>
      </Card>

      {/* Zona de Perigo */}
      <Card style={{ padding: '24px 28px', marginBottom: 20, border: `1.5px solid #fee2e2` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid #fecaca` }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>⚠️</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: T.red }}>Zona de Perigo</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 4 }}>Resetar dados demonstrativos</div>
            <div style={{ color: T.sub, fontSize: 13, maxWidth: 520, lineHeight: 1.5 }}>
              Remove todos os lançamentos, metas e notificações de teste.
              Mantém sua conta, empresas, permissões e configurações.
              Esta ação <strong>não pode ser desfeita</strong>.
            </div>
          </div>
          <button
            onClick={() => setConfirmReset(true)}
            style={{ background: T.white, border: `1.5px solid ${T.red}`, borderRadius: 8, padding: '9px 20px', color: T.red, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2' }}
            onMouseLeave={e => { e.currentTarget.style.background = T.white }}
          >
            🗑 Resetar dados
          </button>
        </div>
        {wasReset && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '10px 14px', background: T.greenL, borderRadius: 8, color: T.green, fontSize: 13, fontWeight: 600 }}>
            <span>✓</span> Sistema limpo — nenhum dado de demonstração ativo.
          </div>
        )}
      </Card>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {!confirmLogout ? (
          <Btn variant="ghost" onClick={() => setConfirmLogout(true)}>↩ Sair do Sistema</Btn>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: T.sub }}>Tem certeza?</span>
            <Btn variant="danger" sm onClick={onLogout}>Sim, sair</Btn>
            <Btn variant="ghost" sm onClick={() => setConfirmLogout(false)}>Cancelar</Btn>
          </div>
        )}
        <Btn onClick={salvar} disabled={saving} style={{ minWidth: 180 }}>
          {saving ? '⏳ Salvando...' : '💾 Salvar Alterações'}
        </Btn>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: toastOk ? T.sidebar : T.red, color: '#fff', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: T.shadowMd, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          <span>{toastOk ? '✓' : '✕'}</span> {toast}
        </div>
      )}

      {/* ── MODAL: ALTERAR SENHA ── */}
      {senhaModal && (
        <Overlay onClose={fecharSenhaModal}>
          <div style={{ background: T.white, borderRadius: 16, padding: 32, width: '100%', maxWidth: 420, boxShadow: T.shadowLg }}>
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 6 }}>🔒 Alterar Senha</div>
            <div style={{ color: T.sub, fontSize: 13, marginBottom: 24 }}>A nova senha precisa ter no mínimo 8 caracteres.</div>
            <PwInput label="Senha atual" val={senhaAtual} setVal={setSenhaAtual} campo="atual" />
            <PwInput label="Nova senha" val={senhaNova} setVal={setSenhaNova} campo="nova" />
            <PwInput label="Confirmar nova senha" val={senhaConfirm} setVal={setSenhaConfirm} campo="confirm" />
            {senhaErro && (
              <div style={{ background: T.redL, color: T.red, borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{senhaErro}</div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn variant="ghost" onClick={fecharSenhaModal}>Cancelar</Btn>
              <Btn onClick={alterarSenha} disabled={senhaLoading}>
                {senhaLoading ? '⏳ Salvando...' : 'Salvar nova senha'}
              </Btn>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── MODAL: PERMISSÕES ── */}
      {permModal && (
        <Overlay onClose={() => setPermModal(false)}>
          <div style={{ background: T.white, borderRadius: 16, padding: 32, width: '100%', maxWidth: 780, maxHeight: '90vh', overflowY: 'auto', boxShadow: T.shadowLg }}>
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>🛡 Permissões Avançadas</div>
            <div style={{ color: T.sub, fontSize: 13, marginBottom: 24 }}>
              {isMaster ? 'Perfil Master: acesso total. Você pode ajustar permissões manualmente.' : 'Defina o nível de acesso para cada módulo.'}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.bg }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: T.text, borderBottom: `2px solid ${T.border}` }}>Módulo</th>
                    {ACOES_PERM.map(a => (
                      <th key={a} style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: T.sub, borderBottom: `2px solid ${T.border}` }}>{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSOES_LISTA.map((modulo, i) => (
                    <tr key={modulo} style={{ background: i % 2 === 0 ? T.white : T.bg }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: T.text, borderBottom: `1px solid ${T.borderLight}` }}>{modulo}</td>
                      {ACOES_PERM.map(acao => (
                        <td key={acao} style={{ padding: '12px 10px', textAlign: 'center', borderBottom: `1px solid ${T.borderLight}` }}>
                          <input
                            type="checkbox"
                            checked={perms[modulo]?.[acao] || false}
                            onChange={() => togglePerm(modulo, acao)}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: T.primary }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <Btn variant="ghost" onClick={() => setPermModal(false)}>Cancelar</Btn>
              <Btn onClick={salvarPerms}>Salvar permissões</Btn>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── MODAL: EMPRESAS ── */}
      {empModal && (
        <Overlay onClose={() => setEmpModal(false)}>
          <div style={{ background: T.white, borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: T.shadowLg }}>
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 20 }}>🏢 Vincular Empresas</div>
            <input
              value={empSearch} onChange={e => setEmpSearch(e.target.value)}
              placeholder="Buscar empresa..."
              style={{ width: '100%', border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 16, color: T.text, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {empresasFiltradas.map(emp => {
                const selecionada = empSelecionadas.includes(emp.id)
                const isPrincipal = emp.id === empPrincipal
                return (
                  <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${selecionada ? T.primary : T.border}`, background: selecionada ? T.primaryLight : T.white, cursor: isPrincipal ? 'not-allowed' : 'pointer', transition: 'all .15s' }}
                    onClick={() => toggleEmp(emp.id)}>
                    <input type="checkbox" checked={selecionada} readOnly style={{ width: 16, height: 16, accentColor: T.primary, flexShrink: 0, cursor: isPrincipal ? 'not-allowed' : 'pointer' }} />
                    <div style={{ width: 32, height: 32, borderRadius: 7, background: emp.cor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: emp.cor, fontSize: 11, flexShrink: 0 }}>{emp.initials}</div>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{emp.nome}</span>
                    {isPrincipal ? (
                      <span style={{ background: T.yellowL, color: T.yellow, fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '2px 8px' }}>⭐ Principal</span>
                    ) : selecionada ? (
                      <button onClick={e => { e.stopPropagation(); setEmpPrincipal(emp.id) }}
                        style={{ background: 'none', border: `1px solid ${T.primary}`, borderRadius: 6, padding: '3px 8px', fontSize: 11, color: T.primary, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                        Definir principal
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setEmpModal(false)}>Cancelar</Btn>
              <Btn onClick={salvarEmpresas}>Salvar vínculos</Btn>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── MODAL: CONFIRMAR RESET ── */}
      {confirmReset && (
        <Overlay onClose={() => !resetLoading && setConfirmReset(false)}>
          <div style={{ background: T.white, borderRadius: 16, padding: 32, width: '100%', maxWidth: 460, boxShadow: T.shadowLg, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 16px' }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: T.text, marginBottom: 8 }}>Resetar dados demonstrativos?</div>
            <div style={{ color: T.sub, fontSize: 14, marginBottom: 20 }}>Confirme o que será apagado e o que será mantido:</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28, textAlign: 'left' }}>
              <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: T.red, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>Será apagado</div>
                {['Receitas e despesas', 'Metas financeiras', 'Notificações', 'Histórico de atividades', 'Dados dos dashboards'].map(item => (
                  <div key={item} style={{ display: 'flex', gap: 7, marginBottom: 7, fontSize: 12, color: T.red }}>
                    <span style={{ fontWeight: 800, flexShrink: 0 }}>✕</span> {item}
                  </div>
                ))}
              </div>
              <div style={{ background: T.greenL, border: `1px solid ${T.primary}22`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: T.green, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>Será mantido</div>
                {['Login e acesso', 'Usuário master', 'Empresas', 'Permissões', 'Configurações e layout'].map(item => (
                  <div key={item} style={{ display: 'flex', gap: 7, marginBottom: 7, fontSize: 12, color: T.green }}>
                    <span style={{ fontWeight: 800, flexShrink: 0 }}>✓</span> {item}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Btn variant="ghost" onClick={() => setConfirmReset(false)} disabled={resetLoading}>Cancelar</Btn>
              <Btn variant="danger" onClick={handleResetClick} disabled={resetLoading}>
                {resetLoading ? '⏳ Resetando...' : '🗑 Confirmar reset'}
              </Btn>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── MODAL: HISTÓRICO COMPLETO ── */}
      {histModal && (
        <Overlay onClose={() => setHistModal(false)}>
          <div style={{ background: T.white, borderRadius: 16, padding: 32, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: T.shadowLg }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 2 }}>🕐 Histórico Completo</div>
                <div style={{ color: T.sub, fontSize: 13 }}>{histFiltrado.length} registro{histFiltrado.length !== 1 ? 's' : ''} encontrado{histFiltrado.length !== 1 ? 's' : ''}</div>
              </div>
              <button onClick={() => setHistModal(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: T.bg, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: T.muted }}>✕</button>
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 4 }}>Tipo</label>
                <select value={histFiltro.tipo} onChange={e => setHistFiltro(f => ({ ...f, tipo: e.target.value }))}
                  style={{ width: '100%', border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: T.text, background: T.white }}>
                  <option>Todos</option>
                  {TIPOS_HIST.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 4 }}>Empresa</label>
                <select value={histFiltro.empresa} onChange={e => setHistFiltro(f => ({ ...f, empresa: e.target.value }))}
                  style={{ width: '100%', border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: T.text, background: T.white }}>
                  <option>Todas</option>
                  <option>Sistema</option>
                  {EMPRESAS.map(e => <option key={e.id}>{e.nome}</option>)}
                </select>
              </div>
              {(histFiltro.tipo !== 'Todos' || histFiltro.empresa !== 'Todas') && (
                <button onClick={() => setHistFiltro({ tipo: 'Todos', empresa: 'Todas' })}
                  style={{ alignSelf: 'flex-end', background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: T.muted, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                  Limpar filtros
                </button>
              )}
            </div>

            {/* Lista */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {histFiltrado.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: T.muted, fontSize: 14 }}>
                  Nenhum registro encontrado para os filtros selecionados.
                </div>
              ) : (
                histFiltrado.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < histFiltrado.length - 1 ? `1px solid ${T.borderLight}` : 'none' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: a.cor, fontWeight: 700, flexShrink: 0 }}>{a.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{a.desc}</div>
                      <div style={{ color: T.sub, fontSize: 12 }}>
                        <span style={{ background: a.bg, color: a.cor, borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 700, marginRight: 6 }}>{a.tipo}</span>
                        {a.empresa}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{a.data}</div>
                      <div style={{ color: T.muted, fontSize: 11 }}>{a.hora}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Overlay>
      )}
    </div>
  )
}
