import { useState } from 'react'
import { T } from '../theme'
import { Card, Btn, Input } from '../components/ui'

const CARGOS = ['Proprietário', 'Diretor', 'Gerente Financeiro', 'Contador', 'Analista', 'Assistente']

const Section = ({ title, desc, children }) => (
  <Card style={{ padding: '24px 28px', marginBottom: 16 }}>
    <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${T.border}` }}>
      <div style={{ fontWeight: 700, fontSize: 16, color: T.text }}>{title}</div>
      {desc && <div style={{ color: T.sub, fontSize: 13, marginTop: 2 }}>{desc}</div>}
    </div>
    {children}
  </Card>
)

export default function Configuracoes({ usuario, onLogout }) {
  const saved = JSON.parse(localStorage.getItem('x8_perfil') || '{}')

  const [nome, setNome] = useState(saved.nome || usuario?.nome || '')
  const [cargo, setCargo] = useState(saved.cargo || 'Proprietário')
  const [telefone, setTelefone] = useState(saved.telefone || '')
  const [toast, setToast] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(false), 3000)
  }

  const salvar = () => {
    localStorage.setItem('x8_perfil', JSON.stringify({ nome, cargo, telefone }))
    showToast('Perfil atualizado com sucesso!')
  }

  const inicial = (nome || usuario?.email || 'U')[0].toUpperCase()

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: T.text, maxWidth: 680 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Configurações</h1>
        <div style={{ color: T.sub, fontSize: 14 }}>Gerencie seu perfil e preferências de conta.</div>
      </div>

      {/* Perfil */}
      <Section title="Perfil do usuário" desc="Suas informações pessoais e de contato.">
        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: `linear-gradient(135deg, ${T.primary}, #1a5e38)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 30, boxShadow: `0 4px 14px ${T.primary}44`,
              flexShrink: 0,
            }}>
              {inicial}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 2 }}>{nome || 'Usuário'}</div>
            <div style={{ color: T.sub, fontSize: 13, marginBottom: 8 }}>{cargo} · {usuario?.email}</div>
            <span style={{ background: T.primaryLight, color: T.primary, fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '3px 10px' }}>
              Plano Essencial
            </span>
          </div>
        </div>

        {/* Campos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Input
              label="Nome completo"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Pedro Kerber"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: T.text, marginBottom: 5 }}>Cargo</label>
            <select
              value={cargo}
              onChange={e => setCargo(e.target.value)}
              style={{
                width: '100%', background: T.white, border: `1.5px solid ${T.border}`,
                borderRadius: 8, padding: '9px 12px', color: T.text, fontSize: 14,
                outline: 'none', fontFamily: 'inherit',
              }}
            >
              {CARGOS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Input
              label="Telefone"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: T.text, marginBottom: 5 }}>E-mail</label>
            <input
              value={usuario?.email || ''}
              readOnly
              style={{
                width: '100%', background: T.bg, border: `1.5px solid ${T.border}`,
                borderRadius: 8, padding: '9px 12px', color: T.muted, fontSize: 14,
                fontFamily: 'inherit', boxSizing: 'border-box', cursor: 'not-allowed',
              }}
            />
            <div style={{ color: T.muted, fontSize: 11, marginTop: 4 }}>O e-mail é gerenciado pelo sistema de autenticação e não pode ser alterado aqui.</div>
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <Btn onClick={salvar}>Salvar alterações</Btn>
        </div>
      </Section>

      {/* Preferências */}
      <Section title="Preferências" desc="Idioma e notificações do sistema.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Idioma</div>
              <div style={{ color: T.sub, fontSize: 12 }}>Idioma exibido na interface</div>
            </div>
            <select style={{
              background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8,
              padding: '7px 12px', color: T.text, fontSize: 13, fontFamily: 'inherit', outline: 'none',
            }}>
              <option>Português (BR)</option>
            </select>
          </div>

          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Notificações por e-mail</div>
              <div style={{ color: T.sub, fontSize: 12 }}>Receber alertas de vencimentos e metas</div>
            </div>
            <div style={{
              width: 44, height: 24, borderRadius: 12, background: T.primary,
              cursor: 'pointer', position: 'relative', flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', right: 2, top: 2,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,.2)',
              }} />
            </div>
          </div>
        </div>
      </Section>

      {/* Segurança */}
      <Section title="Segurança" desc="Senha e autenticação da sua conta.">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Senha</div>
            <div style={{ color: T.sub, fontSize: 12 }}>Última alteração: nunca</div>
          </div>
          <Btn variant="outline" sm>Alterar senha</Btn>
        </div>
      </Section>

      {/* Sair */}
      <Card style={{ padding: '24px 28px', border: `1px solid ${T.red}22`, background: T.redL }}>
        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${T.red}22` }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: T.red }}>Sair do sistema</div>
          <div style={{ color: T.sub, fontSize: 13, marginTop: 2 }}>Você será desconectado da sua conta.</div>
        </div>
        {!confirmLogout ? (
          <Btn variant="danger" onClick={() => setConfirmLogout(true)}>Sair do sistema</Btn>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ color: T.text, fontSize: 14 }}>Tem certeza que deseja sair?</span>
            <Btn variant="danger" onClick={onLogout}>Sim, sair</Btn>
            <Btn variant="ghost" sm onClick={() => setConfirmLogout(false)}>Cancelar</Btn>
          </div>
        )}
      </Card>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: T.sidebar, color: '#fff', borderRadius: 10, padding: '12px 24px',
          fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: T.shadowMd,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: T.primary }}>✓</span> {toast}
        </div>
      )}
    </div>
  )
}
