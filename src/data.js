export const EMPRESAS = [
  { id: 'kz', nome: 'Kazole Imobiliária', initials: 'KI', cnpj: '35.586.526/0001-30', cor: '#16a34a', setor: 'Imobiliário' },
  { id: 'kzl', nome: 'KZL Construtora', initials: 'KC', cnpj: '54.823.138/0001-80', cor: '#2563eb', setor: 'Construção' },
  { id: 'ki1', nome: 'Incorporação Kazole 01', initials: 'I1', cnpj: '47.458.920/0001-10', cor: '#7c3aed', setor: 'Incorporação' },
  { id: 'ki2', nome: 'Incorporação Kazole 02', initials: 'I2', cnpj: '41.728.066/0001-90', cor: '#ea580c', setor: 'Incorporação' },
  { id: 'ace', nome: 'ACE Club', initials: 'AC', cnpj: '12.345.678/0001-90', cor: '#dc2626', setor: 'Academia/Esportes' },
  { id: 'ax', nome: 'AxionZ Tech', initials: 'AT', cnpj: '98.765.432/0001-10', cor: '#0891b2', setor: 'Tecnologia' },
  { id: 'k2', nome: 'K2 Imob', initials: 'K2', cnpj: '41.728.066/0001-85', cor: '#ca8a04', setor: 'Imobiliário' },
]

export const CATS_RECEITA = [
  { id: 'comissao_socios', nome: 'Comissão dos Sócios', cor: '#7c3aed' },
  { id: 'venda_imoveis', nome: 'Venda de Imóveis', cor: '#16a34a' },
  { id: 'locacao', nome: 'Locação', cor: '#2563eb' },
  { id: 'alugueis', nome: 'Aluguéis', cor: '#2563eb' },
  { id: 'comissoes', nome: 'Comissões', cor: '#0891b2' },
  { id: 'consultoria', nome: 'Consultoria', cor: '#ea580c' },
  { id: 'prestacao_servicos', nome: 'Prestação de Serviços', cor: '#0891b2' },
  { id: 'outras_receitas', nome: 'Outras Receitas', cor: '#9ca3af' },
]

export const CATS_DESPESA = [
  { id: 'comissao_corretor', nome: 'Comissão de Corretores', cor: '#dc2626' },
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
