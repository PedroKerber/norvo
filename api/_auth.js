// ============================================================================
// NORVO · Fase 2 — Etapa 1 (Hotfix de Segurança)
// Helpers compartilhados pelos endpoints serverless /api.
//
//  - CORS restrito a origens conhecidas (não mais '*').
//  - Autenticação OBRIGATÓRIA via Bearer token (JWT do Supabase), validado no
//    servidor com o SERVICE_ROLE (que NUNCA é exposto ao cliente).
//  - Autorização: apenas "master" — allowlist server-side por NORVO_MASTER_IDS
//    (à prova de escalonamento, pois não depende de user_metadata editável pelo
//    próprio usuário) e, opcionalmente, app_metadata.perfil (também server-side).
// ============================================================================
const { createClient } = require('@supabase/supabase-js')

const STATIC_ORIGINS = [
  'https://norvoapp.com.br',
  'https://www.norvoapp.com.br',
  'https://x8finance.com.br',
  'https://www.x8finance.com.br',
  'http://localhost:3000',
]

function isAllowedOrigin(origin) {
  if (!origin) return false
  if (STATIC_ORIGINS.includes(origin)) return true
  // Previews do projeto na Vercel: https://norvo-<hash>-<scope>.vercel.app
  if (/^https:\/\/norvo-[a-z0-9-]+\.vercel\.app$/.test(origin)) return true
  return false
}

// Aplica CORS restrito (reflete o Origin só se permitido). Retorna o origin ou null.
function applyCors(req, res) {
  const origin = req.headers.origin
  const allowed = isAllowedOrigin(origin)
  if (allowed) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return allowed ? origin : null
}

// Cliente admin (service role) — SOMENTE servidor.
function adminClient() {
  return createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function masterIds() {
  return (process.env.NORVO_MASTER_IDS || '')
    .split(',').map(s => s.trim()).filter(Boolean)
}

function isMaster(user) {
  if (!user) return false
  if (masterIds().includes(user.id)) return true
  const meta = user.app_metadata || {}
  const perfil = meta.perfil || meta.role
  return perfil === 'master' || perfil === 'admin'
}

// Valida o Bearer token; retorna o usuário ou null (já tendo respondido 401).
async function requireAuth(req, res, admin) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : null
  if (!token) { res.status(401).json({ error: 'Não autenticado' }); return null }
  const sb = admin || adminClient()
  const { data, error } = await sb.auth.getUser(token)
  if (error || !data || !data.user) {
    res.status(401).json({ error: 'Sessão inválida ou expirada' }); return null
  }
  return data.user
}

// Exige autenticado E master; retorna o usuário ou null (já tendo respondido 401/403).
async function requireMaster(req, res, admin) {
  const user = await requireAuth(req, res, admin)
  if (!user) return null
  if (!isMaster(user)) {
    res.status(403).json({ error: 'Acesso negado: requer perfil Master' }); return null
  }
  return user
}

module.exports = { applyCors, adminClient, masterIds, isMaster, requireAuth, requireMaster }
