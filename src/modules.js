// ── Segmentos de empresa (vocabulário controlado) ──────────────────────────
export const SEGMENTOS = [
  { id: 'imobiliaria',   label: 'Imobiliária'       },
  { id: 'construtora',   label: 'Construtora'        },
  { id: 'incorporadora', label: 'Incorporadora'      },
  { id: 'academia',      label: 'Academia / Esporte' },
  { id: 'tecnologia',    label: 'Tecnologia'         },
  { id: 'servicos',      label: 'Serviços'           },
  { id: 'comercio',      label: 'Comércio'           },
  { id: 'saude',         label: 'Saúde'              },
  { id: 'outro',         label: 'Outros'             },
]

// ── Configuração central de módulos ────────────────────────────────────────
// segmentos: 'todos' → universal; string[] → apenas esses segmentos
export const MODULE_CONFIG = {

  // ── Universais: todos os segmentos ────────────────────────────────────────
  dashboard:            { segmentos: 'todos', label: 'Dashboard'              },
  transacoes:           { segmentos: 'todos', label: 'Transações'             },
  receitas:             { segmentos: 'todos', label: 'Receitas'               },
  despesas:             { segmentos: 'todos', label: 'Despesas'               },
  fluxo:                { segmentos: 'todos', label: 'Fluxo de Caixa'         },
  retirada_socios:      { segmentos: 'todos', label: 'Retirada dos Sócios'    },
  relatorios:           { segmentos: 'todos', label: 'Relatórios'             },
  comparativo_empresas: { segmentos: 'todos', label: 'Comparativo'            },
  mes_fechado:          { segmentos: 'todos', label: 'Fechamento Mensal'      },
  metas:                { segmentos: 'todos', label: 'Metas Financeiras'      },
  importar:             { segmentos: 'todos', label: 'Importar'               },
  categorias:           { segmentos: 'todos', label: 'Categorias'             },
  centro_custo:         { segmentos: 'todos', label: 'Centro de Custo'        },
  fornecedores:         { segmentos: 'todos', label: 'Fornecedores'           },
  clientes:             { segmentos: 'todos', label: 'Clientes'               },
  scanner:              { segmentos: 'todos', label: 'Scanner'                },
  contas_pagar:         { segmentos: 'todos', label: 'Contas a Pagar'         },
  contas_receber:       { segmentos: 'todos', label: 'Contas a Receber'       },
  usuarios:             { segmentos: 'todos', label: 'Usuários'               },
  configuracoes:        { segmentos: 'todos', label: 'Configurações'          },
  logs:                 { segmentos: 'todos', label: 'Logs do Sistema'        },
  notificacoes:         { segmentos: 'todos', label: 'Notificações'           },
  empresas:             { segmentos: 'todos', label: 'Empresas'               },

  // ── Incorporação / Construção ─────────────────────────────────────────────
  viabilidade_inc: {
    segmentos: ['incorporadora', 'construtora'],
    label: 'Viabilidade de Incorporação',
  },
  controle_obras: {
    segmentos: ['incorporadora', 'construtora'],
    label: 'Controle de Obras',
  },
  contratos_obra: {
    segmentos: ['incorporadora', 'construtora'],
    label: 'Contratos de Obra',
  },
  investidores: {
    segmentos: ['incorporadora', 'construtora'],
    label: 'Investidores',
  },

  // ── Imobiliária ───────────────────────────────────────────────────────────
  captacao_imoveis: {
    segmentos: ['imobiliaria', 'incorporadora'],
    label: 'Captação de Imóveis',
  },
  crm_vendas: {
    segmentos: ['imobiliaria'],
    label: 'CRM Imobiliário',
  },
  comissoes: {
    segmentos: ['imobiliaria', 'incorporadora'],
    label: 'Comissões',
  },

  // ── Academia / Saúde ──────────────────────────────────────────────────────
  planos_alunos: {
    segmentos: ['academia', 'saude'],
    label: 'Planos e Mensalidades',
  },
  agendamentos: {
    segmentos: ['academia', 'saude'],
    label: 'Agendamentos',
  },
  controle_alunos: {
    segmentos: ['academia'],
    label: 'Controle de Alunos',
  },

  // ── Tecnologia ────────────────────────────────────────────────────────────
  projetos: {
    segmentos: ['tecnologia'],
    label: 'Projetos',
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────

// Retorna true se o módulo está disponível para o segmento informado.
// Falha aberta: sem segmento ou módulo desconhecido → permite acesso
// (garante retrocompatibilidade com empresas sem segmento definido)
export function isModuloPermitido(id, segmento) {
  if (!segmento) return true
  const cfg = MODULE_CONFIG[id]
  if (!cfg) return true
  return cfg.segmentos === 'todos' || cfg.segmentos.includes(segmento)
}

// Retorna o label do segmento a partir do ID
export function labelSegmento(id) {
  return SEGMENTOS.find(s => s.id === id)?.label || id || '—'
}
