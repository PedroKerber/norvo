export const EMPRESAS = [
  { id: 'kz',  nome: 'Kazole Imobiliária',     initials: 'KI', cnpj: '35.586.526/0001-30', cor: '#16a34a', setor: 'Imobiliária',      segmento: 'imobiliaria'   },
  { id: 'kzl', nome: 'KZL Construtora',         initials: 'KC', cnpj: '54.823.138/0001-80', cor: '#2563eb', setor: 'Construtora',       segmento: 'construtora'   },
  { id: 'ki1', nome: 'Incorporação Kazole 01',  initials: 'I1', cnpj: '47.458.920/0001-10', cor: '#7c3aed', setor: 'Incorporadora',     segmento: 'incorporadora' },
  { id: 'ki2', nome: 'Incorporação Kazole 02',  initials: 'I2', cnpj: '41.728.066/0001-90', cor: '#ea580c', setor: 'Incorporadora',     segmento: 'incorporadora' },
  { id: 'ace', nome: 'ACE Club',                initials: 'AC', cnpj: '12.345.678/0001-90', cor: '#dc2626', setor: 'Academia / Esporte', segmento: 'academia'      },
  { id: 'ax',  nome: 'AxionZ Tech',             initials: 'AT', cnpj: '98.765.432/0001-10', cor: '#0891b2', setor: 'Tecnologia',        segmento: 'tecnologia'    },
  { id: 'k2',  nome: 'K2 Imob',                 initials: 'K2', cnpj: '41.728.066/0001-85', cor: '#ca8a04', setor: 'Imobiliária',       segmento: 'imobiliaria'   },
]

export const CATS_RECEITA = [
  { id: 'venda_imoveis', nome: 'Venda de Imóveis', cor: '#16a34a' },
  { id: 'comissao_recebida', nome: 'Comissão Recebida', cor: '#16a34a' },
  { id: 'locacao', nome: 'Locação', cor: '#2563eb' },
  { id: 'alugueis', nome: 'Aluguéis', cor: '#2563eb' },
  { id: 'comissoes', nome: 'Comissões', cor: '#0891b2' },
  { id: 'consultoria', nome: 'Consultoria', cor: '#ea580c' },
  { id: 'prestacao_servicos', nome: 'Prestação de Serviços', cor: '#0891b2' },
  { id: 'outras_receitas', nome: 'Outras Receitas', cor: '#9ca3af' },
]

// variavel: true → Despesas Variáveis (ligadas a vendas)
// variavel: false/undefined → Despesas Fixas (estruturais)
export const CATS_DESPESA = [
  { id: 'comissao_corretor', nome: 'Comissão de Corretores', cor: '#dc2626', variavel: true },
  { id: 'comissao_captador', nome: 'Comissão de Captadores', cor: '#ea580c', variavel: true },
  { id: 'comissao_parceria', nome: 'Comissão de Parceria', cor: '#f97316', variavel: true },
  { id: 'bonus_venda', nome: 'Bônus de Venda', cor: '#dc2626', variavel: true },
  { id: 'marketing', nome: 'Marketing', cor: '#2563eb' },
  { id: 'comercial', nome: 'Comercial', cor: '#ea580c' },
  { id: 'administrativo', nome: 'Administrativo', cor: '#7c3aed' },
  { id: 'trafego_pago', nome: 'Tráfego Pago', cor: '#16a34a' },
  { id: 'operacional', nome: 'Operacional', cor: '#ea580c' },
  { id: 'tecnologia', nome: 'Tecnologia', cor: '#0891b2' },
  { id: 'folha_pagamento', nome: 'Folha de Pagamento', cor: '#ca8a04' },
  { id: 'aluguel_escritorio', nome: 'Aluguel Escritório', cor: '#9ca3af' },
  { id: 'impostos', nome: 'Impostos', cor: '#6b7280' },
]

export const CATS_RETIRADA = [
  { id: 'prolabore_pedro',      nome: 'Pró-labore — Pedro Kerber',              cor: '#7c3aed', socio: 'pedro', tipoRet: 'prolabore' },
  { id: 'prolabore_leo',        nome: 'Pró-labore — Léo Ricardo',               cor: '#2563eb', socio: 'leo',   tipoRet: 'prolabore' },
  { id: 'distribuicao_pedro',   nome: 'Distribuição de Lucros — Pedro Kerber',  cor: '#7c3aed', socio: 'pedro', tipoRet: 'distribuicao' },
  { id: 'distribuicao_leo',     nome: 'Distribuição de Lucros — Léo Ricardo',   cor: '#2563eb', socio: 'leo',   tipoRet: 'distribuicao' },
  { id: 'adiantamento_pedro',   nome: 'Adiantamento de Lucros — Pedro Kerber',  cor: '#7c3aed', socio: 'pedro', tipoRet: 'adiantamento' },
  { id: 'adiantamento_leo',     nome: 'Adiantamento de Lucros — Léo Ricardo',   cor: '#2563eb', socio: 'leo',   tipoRet: 'adiantamento' },
  { id: 'extraordinaria_pedro', nome: 'Retirada Extraordinária — Pedro Kerber', cor: '#7c3aed', socio: 'pedro', tipoRet: 'extraordinaria' },
  { id: 'extraordinaria_leo',   nome: 'Retirada Extraordinária — Léo Ricardo',  cor: '#2563eb', socio: 'leo',   tipoRet: 'extraordinaria' },
  { id: 'retirada_socios',      nome: 'Retirada dos Sócios',                    cor: '#9ca3af', socio: null,    tipoRet: null },
]

export const CATS_VARIAVEL_IDS = new Set(CATS_DESPESA.filter(c => c.variavel).map(c => c.id))

// ── KZL Construtora — categorias específicas ──────────────────────────────────
export const CATS_KZL_RECEITA = [
  // Vendas e Obras
  { id: 'kzl_venda_imoveis',     nome: 'Venda de Imóveis',                   cor: '#16a34a', tipo: 'receita', override: true, empresaId: 'kzl' },
  { id: 'kzl_venda_unidades',    nome: 'Venda de Unidades',                  cor: '#15803d', tipo: 'receita', override: true, empresaId: 'kzl' },
  { id: 'kzl_venda_lotes',       nome: 'Venda de Lotes',                     cor: '#22c55e', tipo: 'receita', override: true, empresaId: 'kzl' },
  { id: 'kzl_venda_casas',       nome: 'Venda de Casas',                     cor: '#4ade80', tipo: 'receita', override: true, empresaId: 'kzl' },
  { id: 'kzl_venda_apts',        nome: 'Venda de Apartamentos',              cor: '#86efac', tipo: 'receita', override: true, empresaId: 'kzl' },
  { id: 'kzl_receb_obras',       nome: 'Recebimento de Obras Contratadas',   cor: '#2563eb', tipo: 'receita', override: true, empresaId: 'kzl' },
  { id: 'kzl_medicao_obras',     nome: 'Medição de Obras',                   cor: '#3b82f6', tipo: 'receita', override: true, empresaId: 'kzl' },
  { id: 'kzl_rec_incorporacao',  nome: 'Receitas de Incorporação',           cor: '#7c3aed', tipo: 'receita', override: true, empresaId: 'kzl' },
  { id: 'kzl_rec_empreend',      nome: 'Receitas de Empreendimentos',        cor: '#8b5cf6', tipo: 'receita', override: true, empresaId: 'kzl' },
  { id: 'kzl_rec_reformas',      nome: 'Receitas de Reformas',               cor: '#a78bfa', tipo: 'receita', override: true, empresaId: 'kzl' },
  // Financeiras
  { id: 'kzl_rendimentos_fin',   nome: 'Rendimentos Financeiros',            cor: '#0891b2', tipo: 'receita', override: true, empresaId: 'kzl' },
  { id: 'kzl_juros_recebidos',   nome: 'Juros Recebidos',                   cor: '#06b6d4', tipo: 'receita', override: true, empresaId: 'kzl' },
  { id: 'kzl_outras_receitas',   nome: 'Outras Receitas',                    cor: '#9ca3af', tipo: 'receita', override: true, empresaId: 'kzl' },
]

export const CATS_KZL_DESPESA = [
  // Terrenos e Incorporação
  { id: 'kzl_compra_terrenos',   nome: 'Compra de Terrenos',                 cor: '#92400e', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_doc_terrenos',      nome: 'Documentação de Terrenos',           cor: '#92400e', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_registro_cartorio', nome: 'Registro e Cartório',                cor: '#a16207', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_aprov_projetos',    nome: 'Aprovação de Projetos',              cor: '#b45309', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_licencas_alvaras',  nome: 'Licenças e Alvarás',                 cor: '#ca8a04', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_taxas_municipais',  nome: 'Taxas Municipais',                   cor: '#eab308', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_taxas_govern',      nome: 'Taxas Governamentais',               cor: '#fbbf24', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  // Mão de Obra
  { id: 'kzl_salarios_op',       nome: 'Salários Operacionais',              cor: '#ea580c', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_pedreiros',         nome: 'Pedreiros',                          cor: '#f97316', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_serventes',         nome: 'Serventes',                          cor: '#f97316', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_carpinteiros',      nome: 'Carpinteiros',                       cor: '#fb923c', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_armadores',         nome: 'Armadores',                          cor: '#fdba74', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_eletricistas',      nome: 'Eletricistas',                       cor: '#fcd34d', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_encanadores',       nome: 'Encanadores',                        cor: '#fde047', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_pintores',          nome: 'Pintores',                           cor: '#a3e635', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_mestres_obras',     nome: 'Mestres de Obras',                   cor: '#dc2626', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_engenheiros',       nome: 'Engenheiros',                        cor: '#b91c1c', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_arquitetos',        nome: 'Arquitetos',                         cor: '#7c3aed', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_encargos_trab',     nome: 'Encargos Trabalhistas',              cor: '#ef4444', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_terceirizados',     nome: 'Terceirizados',                      cor: '#f87171', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  // Materiais de Construção
  { id: 'kzl_cimento',           nome: 'Cimento',                            cor: '#6b7280', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_areia',             nome: 'Areia',                              cor: '#ca8a04', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_brita',             nome: 'Brita',                              cor: '#78716c', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_tijolos',           nome: 'Tijolos',                            cor: '#b45309', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_blocos',            nome: 'Blocos',                             cor: '#a16207', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_concreto',          nome: 'Concreto',                           cor: '#57534e', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_ferragens',         nome: 'Ferragens',                          cor: '#374151', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_aco',               nome: 'Aço',                                cor: '#4b5563', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_madeira',           nome: 'Madeira',                            cor: '#92400e', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_mat_eletrico',      nome: 'Material Elétrico',                  cor: '#fbbf24', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_mat_hidraulico',    nome: 'Material Hidráulico',                cor: '#0891b2', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_mat_acabamento',    nome: 'Material de Acabamento',             cor: '#8b5cf6', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_pisos_revestim',    nome: 'Pisos e Revestimentos',              cor: '#7c3aed', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_esquadrias',        nome: 'Esquadrias',                         cor: '#6d28d9', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_vidros',            nome: 'Vidros',                             cor: '#0891b2', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_tintas',            nome: 'Tintas',                             cor: '#ec4899', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_impermeabil',       nome: 'Impermeabilização',                  cor: '#1d4ed8', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  // Equipamentos e Máquinas
  { id: 'kzl_locacao_maq',       nome: 'Locação de Máquinas',                cor: '#374151', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_combustivel_equip', nome: 'Combustível',                        cor: '#6b7280', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_manut_equip',       nome: 'Manutenção de Equipamentos',         cor: '#6b7280', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_ferramentas',       nome: 'Ferramentas',                        cor: '#4b5563', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_epi',               nome: 'Equipamentos de Segurança (EPI)',    cor: '#dc2626', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_uniformes',         nome: 'Uniformes',                          cor: '#4b5563', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  // Administração
  { id: 'kzl_aluguel',           nome: 'Aluguel',                            cor: '#9ca3af', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_agua',              nome: 'Água',                               cor: '#0891b2', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_energia',           nome: 'Energia',                            cor: '#fbbf24', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_internet',          nome: 'Internet',                           cor: '#2563eb', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_telefonia',         nome: 'Telefonia',                          cor: '#3b82f6', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_mat_escritorio',    nome: 'Material de Escritório',             cor: '#6b7280', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_software',          nome: 'Software e Sistemas',                cor: '#0891b2', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_honor_contab',      nome: 'Honorários Contábeis',               cor: '#7c3aed', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_honor_jur',         nome: 'Honorários Jurídicos',               cor: '#8b5cf6', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_marketing',         nome: 'Marketing',                          cor: '#2563eb', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_publicidade',       nome: 'Publicidade',                        cor: '#3b82f6', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_treinamentos',      nome: 'Treinamentos',                       cor: '#0891b2', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  // Veículos
  { id: 'kzl_comb_veiculos',     nome: 'Combustível Veículos',               cor: '#f97316', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_manut_veiculos',    nome: 'Manutenção Veículos',                cor: '#ea580c', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_seguro_veiculos',   nome: 'Seguro Veículos',                    cor: '#dc2626', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_ipva',              nome: 'IPVA e Licenciamento',               cor: '#b91c1c', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  // Financeiro
  { id: 'kzl_juros_banc',        nome: 'Juros Bancários',                    cor: '#dc2626', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_tarifas_banc',      nome: 'Tarifas Bancárias',                  cor: '#ef4444', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_financiamentos',    nome: 'Financiamentos',                     cor: '#b91c1c', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_emprestimos',       nome: 'Empréstimos',                        cor: '#991b1b', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_impostos',          nome: 'Impostos e Tributos',                cor: '#6b7280', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  // Comercial
  { id: 'kzl_com_vendas',        nome: 'Comissão de Vendas',                 cor: '#f97316', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_com_captacao',      nome: 'Comissão de Captação',               cor: '#ea580c', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_com_parcerias',     nome: 'Comissão de Parcerias',              cor: '#dc2626', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_bonificacoes',      nome: 'Bonificações',                       cor: '#f97316', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_premiacoes',        nome: 'Premiações',                         cor: '#fb923c', variavel: true,  tipo: 'despesa', override: true, empresaId: 'kzl' },
  // Investimentos
  { id: 'kzl_invest_empreend',   nome: 'Investimento em Novos Empreendimentos', cor: '#2563eb', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_invest_obras',      nome: 'Investimento em Obras',              cor: '#3b82f6', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_aquis_equip',       nome: 'Aquisição de Equipamentos',          cor: '#1d4ed8', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  // Outras
  { id: 'kzl_desp_diversas',     nome: 'Despesas Diversas',                  cor: '#9ca3af', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
  { id: 'kzl_reserva',           nome: 'Reserva de Contingência',            cor: '#6b7280', variavel: false, tipo: 'despesa', override: true, empresaId: 'kzl' },
]

export const CATS_KZL = [...CATS_KZL_RECEITA, ...CATS_KZL_DESPESA]

export function getVariavelIds(extraCats = []) {
  const ids = new Set(CATS_DESPESA.filter(c => c.variavel).map(c => c.id))
  extraCats.filter(c => c.variavel && c.tipo === 'despesa').forEach(c => ids.add(c.id))
  return ids
}

export const CONTAS = [
  { id: 'itau_cc', nome: 'Conta Corrente Itaú', tipo: 'Conta Corrente', banco: 'Itaú', saldo: 0 },
  { id: 'bb_cc', nome: 'Conta Corrente BB', tipo: 'Conta Corrente', banco: 'Banco do Brasil', saldo: 0 },
  { id: 'bradesco_cc', nome: 'Conta Corrente Bradesco', tipo: 'Conta Corrente', banco: 'Bradesco', saldo: 0 },
]

export const initData = () => {
  const d = {}
  EMPRESAS.forEach(emp => {
    d[emp.id] = {
      lancamentos: [],
      metas: [],
      mesFechado: false,
    }
  })
  return d
}

export const genFluxoCaixaData = (lancamentos) => {
  const days = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1
    const date = `2026-05-${String(day).padStart(2, '0')}`
    const entradas = lancamentos
      .filter(l => l.tipo === 'receita' && l.data === date && l.status === 'Recebida')
      .reduce((s, l) => s + l.valor, 0)
    const saidas = lancamentos
      .filter(l => l.tipo === 'despesa' && l.data === date && l.status === 'Pago')
      .reduce((s, l) => s + l.valor, 0)
    return { dia: `${day < 10 ? '0' : ''}${day}/05`, entradas, saidas }
  })
  let acumulado = 0
  return days.map(d => {
    acumulado += d.entradas - d.saidas
    return { ...d, saldo: acumulado }
  })
}
