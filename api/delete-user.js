const { applyCors, adminClient, requireMaster, masterIds } = require('./_auth')

module.exports = async (req, res) => {
  applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  const supabaseAdmin = adminClient()
  const caller = await requireMaster(req, res, supabaseAdmin)
  if (!caller) return

  const { userId } = req.body || {}
  if (!userId) return res.status(400).json({ error: 'userId obrigatório' })
  if (userId === caller.id) return res.status(400).json({ error: 'Não é possível excluir o próprio usuário' })
  if (masterIds().includes(userId)) return res.status(403).json({ error: 'Não é possível excluir um usuário Master' })

  await supabaseAdmin
    .from('user_empresa_access')
    .delete()
    .eq('collaborator_user_id', userId)

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) return res.status(400).json({ error: error.message })

  return res.status(200).json({ success: true })
}
