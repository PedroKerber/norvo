const { applyCors, adminClient, requireMaster } = require('./_auth')

module.exports = async (req, res) => {
  applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  const supabaseAdmin = adminClient()
  const caller = await requireMaster(req, res, supabaseAdmin)
  if (!caller) return

  const { email, nome, perfil, cargo } = req.body || {}
  if (!email) return res.status(400).json({ error: 'Email obrigatório' })

  // Step 1: Create user with confirmed email so recovery link works immediately.
  // If user already exists, find their ID from the list.
  let userId = null
  const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      nome:   nome   || email,
      perfil: perfil || 'gerente',
      cargo:  cargo  || '',
    },
  })

  if (createError) {
    if (!createError.message.toLowerCase().includes('already been registered')) {
      return res.status(400).json({ error: createError.message })
    }
    // User exists — find their ID
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    const existing = listData?.users?.find(u => u.email === email)
    userId = existing?.id || null
  } else {
    userId = createData.user?.id || null
  }

  // Step 2: Generate a password-setup link using recovery type.
  // Recovery works for any confirmed user and does NOT expire immediately.
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: 'https://norvoapp.com.br/ativar-conta' },
  })

  if (linkError) return res.status(400).json({ error: linkError.message })

  return res.status(200).json({
    success:    true,
    userId,
    inviteLink: linkData.properties?.action_link || null,
  })
}
