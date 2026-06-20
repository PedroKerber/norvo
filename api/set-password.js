const { applyCors, adminClient, requireMaster } = require('./_auth')

module.exports = async (req, res) => {
  applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  const supabaseAdmin = adminClient()
  const caller = await requireMaster(req, res, supabaseAdmin)
  if (!caller) return

  const { userId, password } = req.body || {}
  if (!userId || !password) return res.status(400).json({ error: 'userId e password obrigatórios' })
  if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' })

  // Confirma o email E define a senha num único update
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
  })

  if (error) return res.status(400).json({ error: error.message })
  return res.status(200).json({ success: true })
}
