const { applyCors, adminClient, requireMaster } = require('./_auth')

module.exports = async (req, res) => {
  applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  const supabaseAdmin = adminClient()
  const caller = await requireMaster(req, res, supabaseAdmin)
  if (!caller) return

  // Identidade do "dono" vem do TOKEN, nunca do body (anti-escalonamento).
  const ownerUserId = caller.id
  const { collaboratorUserId, empresaIds, role } = req.body || {}
  if (!collaboratorUserId) {
    return res.status(400).json({ error: 'collaboratorUserId é obrigatório' })
  }
  if (collaboratorUserId === ownerUserId) {
    return res.status(400).json({ error: 'Não é possível vincular o próprio usuário' })
  }

  // Valida que TODAS as empresas pertencem ao caller (não dá para vincular
  // colaborador a empresa de terceiros).
  let validIds = []
  if (Array.isArray(empresaIds) && empresaIds.length > 0) {
    const { data: owned, error: ownErr } = await supabaseAdmin
      .from('empresas').select('id').eq('owner_user_id', ownerUserId)
    if (ownErr) return res.status(400).json({ error: ownErr.message })
    const ownedSet = new Set((owned || []).map(e => e.id))
    validIds = empresaIds.filter(id => ownedSet.has(id))
    if (validIds.length !== empresaIds.length) {
      return res.status(403).json({ error: 'Alguma empresa não pertence ao usuário autenticado' })
    }
  }

  const { error: delError } = await supabaseAdmin
    .from('user_empresa_access')
    .delete()
    .eq('owner_user_id', ownerUserId)
    .eq('collaborator_user_id', collaboratorUserId)

  if (delError) return res.status(400).json({ error: delError.message })

  if (validIds.length > 0) {
    const rows = validIds.map(empresa_id => ({
      owner_user_id: ownerUserId,
      collaborator_user_id: collaboratorUserId,
      empresa_id,
      role: role || 'viewer',
    }))
    const { error: insError } = await supabaseAdmin
      .from('user_empresa_access')
      .insert(rows)
    if (insError) return res.status(400).json({ error: insError.message })
  }

  return res.status(200).json({ success: true })
}
