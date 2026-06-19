const { createClient } = require('@supabase/supabase-js')

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' })

  const supabaseAdmin = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()
  if (authError) return res.status(400).json({ error: authError.message })

  const { data: perms } = await supabaseAdmin
    .from('user_empresa_access')
    .select('collaborator_user_id, empresa_id')

  const users = authData.users.map(u => {
    const meta = u.user_metadata || {}
    return {
      id:             u.id,
      email:          u.email,
      nome:           meta.nome   || u.email?.split('@')[0] || '',
      perfil:         meta.perfil || null,
      cargo:          meta.cargo  || null,
      criadoEm:       u.created_at,
      ultimoAcesso:   u.last_sign_in_at,
      emailConfirmado: !!u.email_confirmed_at,
      empresaIds:     (perms || [])
        .filter(p => p.collaborator_user_id === u.id)
        .map(p => p.empresa_id),
    }
  })

  return res.status(200).json({ users })
}
