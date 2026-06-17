// Migração Fase 2 — x8finance
// Converte lançamentos de sócios (tipo='receita', cat='comissao_socios')
// para o novo tipo='retirada', cat='retirada_socios'
//
// Uso: node migrate_comissoes.js "sua_senha"
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://fzgjuvwvulodurspymbj.supabase.co'
const SUPABASE_KEY = 'sb_publishable_U-EpJloTMzsbZ5pjfSH5iw_LaTVkKo9'
const EMAIL = 'pedrork22@icloud.com'

async function main() {
  const password = process.argv[2]
  if (!password) { console.error('Uso: node migrate_comissoes.js "sua_senha"'); process.exit(1) }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password })
  if (authErr) { console.error('\n✗ Login falhou:', authErr.message); process.exit(1) }
  const userId = authData.user.id
  console.log('\n✓ Login OK. Buscando lançamentos...\n')

  // Busca TODOS os lançamentos do usuário
  const { data: todos, error: fetchErr } = await supabase
    .from('lancamentos')
    .select('id, tipo, cat, cat_nome, descricao, valor, data')
    .eq('user_id', userId)
  if (fetchErr) { console.error('Erro ao buscar:', fetchErr.message); process.exit(1) }

  // Fase 2: lançamentos que já viraram receita na migração anterior agora viram retirada
  const viramRetirada = todos.filter(l =>
    (l.tipo === 'receita' && l.cat === 'comissao_socios') ||
    (l.tipo === 'despesa' && l.cat === 'comissao_socios')
  )

  console.log('═══════════════════════════════════════════════════')
  console.log(`  RETIRADA DOS SÓCIOS: ${viramRetirada.length} lançamentos`)
  console.log('═══════════════════════════════════════════════════')
  viramRetirada.forEach(l => {
    const v = Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    console.log(`  [${l.data}] ${l.descricao}`)
    console.log(`           Tipo atual: ${l.tipo}  |  R$ ${v}`)
  })

  if (viramRetirada.length === 0) {
    console.log('\nNada para migrar — nenhum lançamento com cat=comissao_socios encontrado.')
    await supabase.auth.signOut()
    return
  }

  console.log('\nConvertendo para RETIRADA...')
  const { error } = await supabase
    .from('lancamentos')
    .update({ tipo: 'retirada', cat: 'retirada_socios', cat_nome: 'Retirada dos Sócios', status: 'Paga' })
    .in('id', viramRetirada.map(l => l.id))
  if (error) { console.error('Erro:', error.message); process.exit(1) }

  console.log(`✓ ${viramRetirada.length} lançamentos convertidos para RETIRADA`)
  console.log('\n✅ Migração concluída! Recarregue o x8finance para ver os dados corrigidos.\n')
  await supabase.auth.signOut()
}

main().catch(err => { console.error(err); process.exit(1) })
