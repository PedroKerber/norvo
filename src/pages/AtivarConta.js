import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { T } from '../theme'
import { useMobile } from '../context/MobileContext'

const LogoN = ({ size, light }) => (
  <svg width={size} height={Math.round(size * 70 / 60)} viewBox="0 0 60 70" fill="none" style={{ flexShrink: 0 }}>
    <rect x="0" y="0" width="14" height="70" fill={light ? '#ffffff' : '#0D2545'} rx="1.5" />
    <polygon points="14,0 32,0 46,70 28,70" fill="#F47B20" />
    <rect x="46" y="0" width="14" height="70" fill={light ? '#ffffff' : '#0D2545'} rx="1.5" />
  </svg>
)

const forca = (s) => {
  if (!s) return { nivel: 0, label: '', cor: '' }
  let pts = 0
  if (s.length >= 8) pts++
  if (/[A-Z]/.test(s)) pts++
  if (/[0-9]/.test(s)) pts++
  if (/[^a-zA-Z0-9]/.test(s)) pts++
  if (pts <= 1) return { nivel: 1, label: 'Fraca', cor: '#dc2626' }
  if (pts === 2) return { nivel: 2, label: 'Razoável', cor: '#d97706' }
  if (pts === 3) return { nivel: 3, label: 'Boa', cor: '#2563eb' }
  return { nivel: 4, label: 'Forte', cor: '#16a34a' }
}

const InfoPanel = () => (
  <div style={{ flex: '0 0 50%', maxWidth: '50%', background: '#0D2545', padding: '56px 48px', display: 'flex', alignItems: 'center' }}>
    <div style={{ maxWidth: 400 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
        <LogoN size={44} light />
        <div>
          <div style={{ fontWeight: 900, fontSize: 28, letterSpacing: -0.5, color: '#ffffff', lineHeight: 1.05 }}>NORVO</div>
          <div style={{ fontSize: 9, color: T.primary, letterSpacing: 2.5, marginTop: 4, fontWeight: 700 }}>GESTÃO FINANCEIRA INTELIGENTE</div>
        </div>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 10, lineHeight: 1.35 }}>Você foi convidado para o Norvo</div>
      <div style={{ fontSize: 14, opacity: 0.65, marginBottom: 36, lineHeight: 1.7, color: '#fff' }}>
        Plataforma de gestão financeira inteligente para múltiplas empresas.
      </div>
      {[
        ['🔒', 'Acesso isolado às empresas autorizadas'],
        ['📊', 'Permissões definidas pelo administrador'],
        ['🛡', 'Dados protegidos e criptografados'],
        ['📱', 'Acesse de qualquer dispositivo'],
      ].map(([ic, txt]) => (
        <div key={txt} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
          <div style={{ background: T.primary + '22', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{ic}</div>
          <span style={{ opacity: 0.8, fontSize: 13, color: '#fff', lineHeight: 1.4 }}>{txt}</span>
        </div>
      ))}
    </div>
  </div>
)

export default function AtivarConta() {
  const isMobile = useMobile()
  const [step, setStep]             = useState('loading')
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [senha, setSenha]           = useState('')
  const [confirma, setConfirma]     = useState('')
  const [mostrar, setMostrar]       = useState(false)
  const [aceito, setAceito]         = useState(false)
  const [erro, setErro]             = useState('')
  const [loading, setLoading]       = useState(false)
  const [fS, setFS]                 = useState(false)
  const [fC, setFC]                 = useState(false)

  useEffect(() => {
    const hash   = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)

    const errorCode = params.get('error_code')
    if (errorCode === 'otp_expired' || params.get('error') === 'access_denied') {
      setStep('expirado'); return
    }
    if (params.get('error')) { setStep('erro_generico'); return }

    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type         = params.get('type')

    if (!accessToken || !refreshToken) { setStep('sem_token'); return }
    // Accept invite, recovery, and magiclink flows
    if (type !== 'invite' && type !== 'recovery' && type !== 'magiclink') {
      setStep('sem_token'); return
    }

    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ data, error: sessionError }) => {
        if (sessionError) {
          setStep(sessionError.message?.toLowerCase().includes('expired') ? 'expirado' : 'erro_generico')
          return
        }
        const meta = data.session?.user?.user_metadata || {}
        setNomeUsuario(meta.nome || meta.full_name || data.session?.user?.email?.split('@')[0] || '')
        setStep('form')
      })
  }, [])

  const handleAtivacao = async () => {
    setErro('')
    if (senha.length < 8) { setErro('A senha deve ter pelo menos 8 caracteres'); return }
    if (senha !== confirma) { setErro('As senhas não coincidem'); return }
    if (!aceito) { setErro('Você precisa aceitar os termos de uso'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setLoading(false)
    if (error) { setErro(error.message); return }
    setStep('sucesso')
    setTimeout(() => { window.location.href = '/' }, 2500)
  }

  const f   = forca(senha)
  const inp = (focus, err) => ({
    width: '100%', background: '#ffffff',
    border: `1.5px solid ${err ? '#dc2626' : focus ? '#0D2545' : '#D1D5DB'}`,
    borderRadius: 9, padding: '12px 14px', color: '#111827',
    fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
    transition: 'border-color .15s',
  })

  const Shell = ({ children }) => (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Segoe UI', sans-serif" }}>
      {!isMobile && <InfoPanel />}
      <div style={{ flex: 1, padding: isMobile ? '40px 20px' : '56px 48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', minHeight: '100vh' }}>
        <div style={{ width: '100%', maxWidth: 390 }}>
          {children}
        </div>
      </div>
    </div>
  )

  if (step === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#0D2545', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <LogoN size={52} light />
          <div style={{ marginTop: 20, fontSize: 15, opacity: 0.7 }}>Verificando convite...</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: T.primary, opacity: 0.6 + i * 0.2 }} />)}
          </div>
        </div>
      </div>
    )
  }

  if (step === 'expirado') {
    return (
      <Shell>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
          <LogoN size={30} /><div style={{ fontWeight: 900, fontSize: 22, color: '#0D2545' }}>Norvo</div>
        </div>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 20 }}>⏰</div>
        <div style={{ fontWeight: 800, fontSize: 22, color: '#111827', marginBottom: 8 }}>Convite expirado</div>
        <div style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.65, marginBottom: 20 }}>
          O link de convite expirou. Os convites do Norvo são válidos por <strong>7 dias</strong> após o envio.
        </div>
        <div style={{ background: '#fef9c3', border: '1px solid #fcd34d', borderRadius: 10, padding: '14px 16px', marginBottom: 28, fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
          <strong>O que fazer?</strong><br />
          Solicite ao administrador que gere um novo convite na tela de Usuários do Norvo.
        </div>
        <a href="/" style={{ display: 'block', textAlign: 'center', color: '#0D2545', fontWeight: 600, fontSize: 14, textDecoration: 'none', padding: '12px', border: '1.5px solid #D1D5DB', borderRadius: 9 }}>← Voltar para o login</a>
      </Shell>
    )
  }

  if (step === 'erro_generico' || step === 'sem_token') {
    return (
      <Shell>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
          <LogoN size={30} /><div style={{ fontWeight: 900, fontSize: 22, color: '#0D2545' }}>Norvo</div>
        </div>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 20 }}>⚠️</div>
        <div style={{ fontWeight: 800, fontSize: 22, color: '#111827', marginBottom: 8 }}>Link inválido</div>
        <div style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.65, marginBottom: 20 }}>
          Este link de convite é inválido ou foi substituído por um mais recente.
        </div>
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '14px 16px', marginBottom: 28, fontSize: 13, color: '#dc2626', lineHeight: 1.6 }}>
          Peça ao administrador para reenviar o convite na tela de Usuários do Norvo.
        </div>
        <a href="/" style={{ display: 'block', textAlign: 'center', color: '#0D2545', fontWeight: 600, fontSize: 14, textDecoration: 'none', padding: '12px', border: '1.5px solid #D1D5DB', borderRadius: 9 }}>← Voltar para o login</a>
      </Shell>
    )
  }

  if (step === 'sucesso') {
    return (
      <Shell>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
          <LogoN size={30} /><div style={{ fontWeight: 900, fontSize: 22, color: '#0D2545' }}>Norvo</div>
        </div>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 0 24px' }}>✅</div>
        <div style={{ fontWeight: 800, fontSize: 24, color: '#111827', marginBottom: 8 }}>Conta ativada!</div>
        <div style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.65, marginBottom: 24 }}>
          {nomeUsuario ? `Bem-vindo ao Norvo, ${nomeUsuario}! ` : 'Bem-vindo ao Norvo! '}
          Redirecionando para o sistema...
        </div>
        <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#15803d', lineHeight: 1.8 }}>
          ✓ Senha criada com sucesso<br />
          ✓ Conta ativa<br />
          ✓ Entrando no sistema...
        </div>
      </Shell>
    )
  }

  // step === 'form'
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <LogoN size={28} /><div style={{ fontWeight: 900, fontSize: 20, color: '#0D2545' }}>Norvo</div>
      </div>

      <div style={{ fontWeight: 800, fontSize: 22, color: '#111827', margin: '28px 0 4px' }}>
        {nomeUsuario ? `Olá, ${nomeUsuario}!` : 'Criar senha'}
      </div>
      <div style={{ color: '#6b7280', fontSize: 14, marginBottom: 28, lineHeight: 1.55 }}>
        Defina uma senha segura para ativar seu acesso ao Norvo.
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .4 }}>Nova senha</label>
        <div style={{ position: 'relative' }}>
          <input
            type={mostrar ? 'text' : 'password'}
            value={senha}
            onChange={e => setSenha(e.target.value)}
            onFocus={() => setFS(true)}
            onBlur={() => setFS(false)}
            placeholder="Mínimo 8 caracteres"
            style={{ ...inp(fS, false), paddingRight: 44 }}
          />
          <button type="button" onClick={() => setMostrar(s => !s)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9CA3AF' }}>
            {mostrar ? '🙈' : '👁️'}
          </button>
        </div>
        {senha && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              {[1, 2, 3, 4].map(n => (
                <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= f.nivel ? f.cor : '#e5e7eb', transition: 'background .2s' }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: f.cor, fontWeight: 600 }}>Senha {f.label}</div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 22 }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .4 }}>Confirmar senha</label>
        <input
          type="password"
          value={confirma}
          onChange={e => setConfirma(e.target.value)}
          onFocus={() => setFC(true)}
          onBlur={() => setFC(false)}
          placeholder="Repita a senha"
          style={inp(fC, !!(confirma && senha !== confirma))}
          onKeyDown={e => e.key === 'Enter' && handleAtivacao()}
        />
        {confirma && senha !== confirma && (
          <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4, fontWeight: 600 }}>As senhas não coincidem</div>
        )}
        {confirma && senha === confirma && senha.length >= 8 && (
          <div style={{ color: '#16a34a', fontSize: 12, marginTop: 4, fontWeight: 600 }}>✓ Senhas coincidem</div>
        )}
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={aceito} onChange={e => setAceito(e.target.checked)}
            style={{ width: 16, height: 16, marginTop: 2, accentColor: '#0D2545', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.55 }}>
            Li e aceito os <span style={{ color: '#0D2545', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>Termos de Uso</span> e a <span style={{ color: '#0D2545', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>Política de Privacidade</span> do Norvo.
          </span>
        </label>
      </div>

      {erro && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
          {erro}
        </div>
      )}

      <button
        onClick={handleAtivacao}
        disabled={loading || !aceito || senha.length < 8 || senha !== confirma}
        style={{
          width: '100%', background: loading || !aceito || senha.length < 8 || senha !== confirma ? '#d1d5db' : T.primary,
          color: loading || !aceito || senha.length < 8 || senha !== confirma ? '#9ca3af' : '#ffffff',
          border: 'none', borderRadius: 10, padding: '14px',
          fontSize: 15, fontWeight: 700,
          cursor: loading || !aceito || senha.length < 8 || senha !== confirma ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', transition: 'background .15s',
        }}>
        {loading ? 'Ativando conta...' : 'ATIVAR MINHA CONTA →'}
      </button>

      <div style={{ textAlign: 'center', marginTop: 20, color: '#9ca3af', fontSize: 12 }}>
        Já tem acesso? <a href="/" style={{ color: '#0D2545', fontWeight: 600, textDecoration: 'none' }}>Fazer login</a>
      </div>
    </Shell>
  )
}
