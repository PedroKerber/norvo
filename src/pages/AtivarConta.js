import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { T } from '../theme'

const LogoN = ({ size, light }) => (
  <svg width={size} height={Math.round(size * 70 / 60)} viewBox="0 0 60 70" fill="none" style={{ flexShrink: 0 }}>
    <rect x="0" y="0" width="14" height="70" fill={light ? '#ffffff' : '#0D2545'} rx="1.5" />
    <polygon points="14,0 32,0 46,70 28,70" fill="#F47B20" />
    <rect x="46" y="0" width="14" height="70" fill={light ? '#ffffff' : '#0D2545'} rx="1.5" />
  </svg>
)

const inp = (focus, err) => ({
  width: '100%', background: '#ffffff',
  border: `1.5px solid ${err ? T.red : focus ? '#0D2545' : '#C9D3DD'}`,
  borderRadius: 8, padding: '12px 14px', color: '#111827',
  fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color .15s',
})

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

const PainelEsq = () => (
  <div className="login-left">
    <div style={{ maxWidth: 460 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <LogoN size={52} light />
        <div>
          <div style={{ fontWeight: 900, fontSize: 32, letterSpacing: -0.5, color: '#ffffff', lineHeight: 1.05 }}>NORVO</div>
          <div style={{ fontSize: 10, color: T.primary, letterSpacing: 2.5, marginTop: 4, fontWeight: 700 }}>GESTÃO FINANCEIRA</div>
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 12, lineHeight: 1.3 }}>
        Você foi convidado para o Norvo
      </div>
      <div style={{ fontSize: 15, opacity: 0.7, marginBottom: 36, lineHeight: 1.65, color: '#fff' }}>
        Plataforma de gestão financeira inteligente para múltiplas empresas.
      </div>
      {[
        ['🔒', 'Acesso isolado às empresas autorizadas'],
        ['📊', 'Permissões definidas pelo administrador'],
        ['🛡', 'Dados protegidos com RLS no Supabase'],
        ['📱', 'Acesso de qualquer dispositivo'],
      ].map(([ic, txt]) => (
        <div key={txt} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ background: T.primary + '22', borderRadius: 8, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{ic}</div>
          <span style={{ opacity: 0.85, fontSize: 14, color: '#fff' }}>{txt}</span>
        </div>
      ))}
    </div>
  </div>
)

export default function AtivarConta() {
  const [step, setStep] = useState('loading')
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [aceito, setAceito] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [fS, setFS] = useState(false)
  const [fC, setFC] = useState(false)

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)

    const errorCode = params.get('error_code')
    if (errorCode === 'otp_expired' || params.get('error') === 'access_denied') {
      setStep('expirado')
      return
    }
    if (params.get('error')) {
      setStep('erro_generico')
      return
    }

    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (!accessToken || !refreshToken) {
      setStep('sem_token')
      return
    }

    if (type !== 'invite') {
      setStep('sem_token')
      return
    }

    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ data, error: sessionError }) => {
        if (sessionError) {
          if (sessionError.message?.toLowerCase().includes('expired')) setStep('expirado')
          else setStep('erro_generico')
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
    if (!aceito) { setErro('Você precisa aceitar os termos de uso e a política de privacidade'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setLoading(false)
    if (error) { setErro(error.message); return }
    setStep('sucesso')
    setTimeout(() => { window.location.href = '/' }, 2500)
  }

  const f = forca(senha)

  const shell = (children) => (
    <div style={{ minHeight: '100vh', background: T.sidebar, display: 'flex', fontFamily: "'Segoe UI', sans-serif" }}>
      <PainelEsq />
      <div className="login-right">
        <div style={{ width: '100%', maxWidth: 380 }}>
          {children}
        </div>
      </div>
    </div>
  )

  if (step === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: T.sidebar, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <LogoN size={52} light />
          <div style={{ marginTop: 20, fontSize: 15, opacity: 0.7 }}>Verificando convite...</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: T.primary, opacity: 0.6 + i * 0.2 }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (step === 'expirado') {
    return shell(
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <LogoN size={30} />
          <div style={{ fontWeight: 900, fontSize: 22, color: '#0D2545' }}>Norvo</div>
        </div>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 20 }}>⏰</div>
        <div style={{ fontWeight: 800, fontSize: 22, color: '#111827', marginBottom: 8 }}>Convite expirado</div>
        <div style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          O link de convite expirou. Os convites do Norvo são válidos por <strong>7 dias</strong> após o envio.
        </div>
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, padding: '14px 16px', marginBottom: 28, fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
          <strong>O que fazer?</strong><br />
          Solicite ao administrador do Norvo que reenvie o convite. Ele pode fazer isso diretamente na tela de Usuários.
        </div>
        <a href="/" style={{ display: 'block', textAlign: 'center', color: '#0D2545', fontWeight: 600, fontSize: 14, textDecoration: 'none', padding: '12px', border: '1.5px solid #C9D3DD', borderRadius: 8 }}>
          ← Voltar para o login
        </a>
      </>
    )
  }

  if (step === 'erro_generico' || step === 'sem_token') {
    return shell(
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <LogoN size={30} />
          <div style={{ fontWeight: 900, fontSize: 22, color: '#0D2545' }}>Norvo</div>
        </div>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 20 }}>⚠️</div>
        <div style={{ fontWeight: 800, fontSize: 22, color: '#111827', marginBottom: 8 }}>Link inválido</div>
        <div style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Este link de convite é inválido. Verifique se você está usando o link mais recente enviado por e-mail.
        </div>
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '14px 16px', marginBottom: 28, fontSize: 13, color: '#dc2626', lineHeight: 1.6 }}>
          Peça ao administrador para reenviar o convite na tela de Usuários do Norvo.
        </div>
        <a href="/" style={{ display: 'block', textAlign: 'center', color: '#0D2545', fontWeight: 600, fontSize: 14, textDecoration: 'none', padding: '12px', border: '1.5px solid #C9D3DD', borderRadius: 8 }}>
          ← Voltar para o login
        </a>
      </>
    )
  }

  if (step === 'sucesso') {
    return shell(
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <LogoN size={30} />
          <div style={{ fontWeight: 900, fontSize: 22, color: '#0D2545' }}>Norvo</div>
        </div>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 0 24px' }}>✅</div>
        <div style={{ fontWeight: 800, fontSize: 22, color: '#111827', marginBottom: 8 }}>Conta ativada!</div>
        <div style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          {nomeUsuario ? `Bem-vindo ao Norvo, ${nomeUsuario}! ` : 'Bem-vindo ao Norvo! '}
          Sua conta foi ativada. Redirecionando para o Dashboard...
        </div>
        <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#15803d', lineHeight: 1.6 }}>
          ✓ Senha criada<br />
          ✓ Conta ativa<br />
          ✓ Entrando no sistema...
        </div>
      </>
    )
  }

  // step === 'form'
  return shell(
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <LogoN size={30} />
        <div style={{ fontWeight: 900, fontSize: 22, color: '#0D2545' }}>Norvo</div>
      </div>

      <div style={{ fontWeight: 800, fontSize: 22, color: '#111827', margin: '24px 0 4px' }}>
        {nomeUsuario ? `Olá, ${nomeUsuario}!` : 'Criar senha'}
      </div>
      <div style={{ color: '#6b7280', fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
        Defina uma senha segura para ativar seu acesso ao Norvo.
      </div>

      {/* Nova senha */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 6 }}>Nova senha</label>
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

      {/* Confirmar */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 6 }}>Confirmar senha</label>
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
          <div style={{ color: T.red, fontSize: 12, marginTop: 4, fontWeight: 600 }}>As senhas não coincidem</div>
        )}
        {confirma && senha === confirma && senha.length >= 8 && (
          <div style={{ color: '#16a34a', fontSize: 12, marginTop: 4, fontWeight: 600 }}>✓ Senhas coincidem</div>
        )}
      </div>

      {/* Termos */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={aceito}
            onChange={e => setAceito(e.target.checked)}
            style={{ width: 16, height: 16, marginTop: 2, accentColor: '#0D2545', flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
            Li e aceito os{' '}
            <span style={{ color: '#0D2545', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>Termos de Uso</span>
            {' '}e a{' '}
            <span style={{ color: '#0D2545', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>Política de Privacidade</span>
            {' '}do Norvo.
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
          width: '100%',
          background: loading || !aceito || senha.length < 8 || senha !== confirma ? '#d1d5db' : '#F47B20',
          color: loading || !aceito || senha.length < 8 || senha !== confirma ? '#9ca3af' : '#ffffff',
          border: 'none', borderRadius: 10, padding: '14px',
          fontSize: 15, fontWeight: 700,
          cursor: loading || !aceito || senha.length < 8 || senha !== confirma ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', transition: 'background .15s',
        }}>
        {loading ? 'Ativando conta...' : 'ATIVAR MINHA CONTA →'}
      </button>

      <div style={{ textAlign: 'center', marginTop: 20, color: '#9ca3af', fontSize: 12 }}>
        Já tem acesso?{' '}
        <a href="/" style={{ color: '#0D2545', fontWeight: 600, textDecoration: 'none' }}>Fazer login</a>
      </div>
    </>
  )
}
