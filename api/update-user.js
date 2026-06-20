const { applyCors, adminClient, requireMaster } = require('./_auth')

module.exports = async (req, res) => {
  applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  const supabaseAdmin = adminClient()
  const caller = await requireMaster(req, res, supabaseAdmin)
  if (!caller) return

  const { userId, nome, cargo, perfil } = req.body || {}
  if (!userId) return res.status(400).json({ error: 'userId obrigatório' })

  // Obs.: perfil em user_metadata é rótulo de exibição; a autorização real é
  // server-side (NORVO_MASTER_IDS / app_metadata). Fonte de verdade do perfil
  // migra para o servidor na Etapa 2.
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { nome, cargo, perfil },
  })

  if (error) return res.status(400).json({ error: error.message })

  return res.status(200).json({ success: true })
}
