// Migração de comissões — x8finance
// Regra 1: Comissões de sócios (Pedro Kerber, Léo Ricardo) → RECEITA / cat: comissao_socios
// Regra 2: Comissões de corretores → DESPESA / cat: comissao_corretor
//
// Uso: node migrate_comissoes.js
const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')

const SUPABASE_URL = 'https://fzgjuvwvulodurspymbj.supabase.co'
const SUPABASE_KEY = 'sb_publishable_U-EpJloTMzsbZ5pjfSH5iw_LaTVkKo9'
const EMAIL = 'pedrork22@icloud.com'

// Padrões que identificam comissões de SÓCIOS → devem ser RECEITA
const SOCIOS_PATTERNS = [
  'pedro kerber', 'léo ricardo', 'leo ricardo', 'socio pedro', 'sócio pedro',
  'socio léo', 'sócio léo', 'socio leo', 'sócio leo',
  'comissao socio', 'comissão socio', 'comissao sócio', 'comissão sócio',
  'parte socio', 'parte sócio',
]

// Padrões que identificam comissões de CORRETORES → devem ser DESPESA
const CORRETORES_PATTERNS = [
  'gustavo aguiar', 'rafael rocha', 'halisson couto', 'letícia', 'leticia',
  'mailson', 'jamila', 'moisés', 'moises', 'josé carlos', 'jose carlos',
  'sidney', 'sergio', 'marcos boschini', 'milene',
  'comissao corretor', 'comissão corretor', 'corretor parceiro',
]

function matchAny(text, patterns) {
  const lower = (text || '').toLowerCase()
  return patterns.some(p => lower.includes(p))
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const password = await new Promise(r => rl.question('Senha do x8finance: ', r))
  rl.close()

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password })
  if (authErr) { console.error('\n✗ Login falhou:', authErr.message); process.exit(1) }
  const userId = authData.user.id
  console.log('\n✓ Login OK. Buscando lançamentos...\n')

  // Busca TODOS os lançamentos do usuário
  const { data: todos, error: fetchErr } = await supabase
    .from('lancamentos')
    .select('id, tipo, cat, cat_nome, descricao, valor, data, status')
    .eq('user_id', userId)
  if (fetchErr) { console.error('Erro ao buscar:', fetchErr.message); process.exit(1) }

  // Separa por regra
  const viramReceita = todos.filter(l =>
    l.tipo === 'despesa' &&
    (matchAny(l.cat_nome, SOCIOS_PATTERNS) || matchAny(l.descricao, SOCIOS_PATTERNS))
  )

  const viramCorretor = todos.filter(l =>
    (matchAny(l.cat_nome, CORRETORES_PATTERNS) || matchAny(l.descricao, CORRETORES_PATTERNS)) &&
    l.cat !== 'comissao_corretor'
  )

  // ── Relatório ───────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════')
  console.log(`  SÓCIOS → RECEITA: ${viramReceita.length} lançamentos`)
  console.log('═══════════════════════════════════════════════════')
  viramReceita.forEach(l => {
    const v = Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    console.log(`  [${l.data}] ${l.descricao}`)
    console.log(`           Cat: ${l.cat_nome}  |  R$ ${v}`)
  })

  console.log('\n═══════════════════════════════════════════════════')
  console.log(`  CORRETORES → cat: comissao_corretor: ${viramCorretor.length} lançamentos`)
  console.log('═══════════════════════════════════════════════════')
  viramCorretor.forEach(l => {
    const v = Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    console.log(`  [${l.data}] ${l.descricao}`)
    console.log(`           Cat: ${l.cat_nome}  |  R$ ${v}`)
  })

  if (viramReceita.length === 0 && viramCorretor.length === 0) {
    console.log('\nNada para migrar. Tudo já está correto.')
    await supabase.auth.signOut()
    return
  }

  // ── Atualiza sócios ─────────────────────────────────────────────
  if (viramReceita.length > 0) {
    console.log('\nConvertendo sócios para RECEITA...')
    const { error } = await supabase
      .from('lancamentos')
      .update({ tipo: 'receita', status: 'Recebida', cat: 'comissao_socios', cat_nome: 'Comissão dos Sócios' })
      .in('id', viramReceita.map(l => l.id))
    if (error) { console.error('Erro:', error.message); process.exit(1) }
    console.log(`✓ ${viramReceita.length} lançamentos convertidos para RECEITA`)
  }

  // ── Atualiza corretores ─────────────────────────────────────────
  if (viramCorretor.length > 0) {
    console.log('\nAtualizando categoria dos corretores...')
    const { error } = await supabase
      .from('lancamentos')
      .update({ tipo: 'despesa', cat: 'comissao_corretor', cat_nome: 'Comissão de Corretores' })
      .in('id', viramCorretor.map(l => l.id))
    if (error) { console.error('Erro:', error.message); process.exit(1) }
    console.log(`✓ ${viramCorretor.length} lançamentos atualizados para "Comissão de Corretores"`)
  }

  console.log('\n✅ Migração concluída! Recarregue o x8finance para ver os dados corrigidos.\n')
  await supabase.auth.signOut()
}

main().catch(err => { console.error(err); process.exit(1) })
