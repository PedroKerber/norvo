import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const H = '2026-06-16'

const MOCK = [
  { id:'n01', titulo:'Despesa vencendo hoje', descricao:'A despesa "Aluguel Escritório" vence hoje no valor de R$ 1.350,00.', tipo:'financeiro', icone:'clock', cor:'#ea580c', lida:false, data:`${H}T09:00`, empresa:'kz', acao:{ label:'Ver despesa', page:'contas_pagar' } },
  { id:'n02', titulo:'Despesa em atraso', descricao:'A despesa "Energia Elétrica" está há 5 dias em atraso. Valor: R$ 780,00.', tipo:'financeiro', icone:'alert', cor:'#dc2626', lida:false, data:'2026-06-15T14:20', empresa:'kzl', acao:{ label:'Ver despesa', page:'contas_pagar' } },
  { id:'n03', titulo:'Receita recebida', descricao:'Receita "Contrato Mensal KZL" no valor de R$ 4.200,00 foi confirmada.', tipo:'financeiro', icone:'trending-up', cor:'#16a34a', lida:false, data:`${H}T08:30`, empresa:'kzl', acao:{ label:'Ver receita', page:'receitas' } },
  { id:'n04', titulo:'Receita prevista para hoje', descricao:'Receita "Aluguel Sala 301" no valor de R$ 2.800,00 está prevista para hoje.', tipo:'financeiro', icone:'calendar', cor:'#2563eb', lida:false, data:`${H}T07:00`, empresa:'kz', acao:{ label:'Ver receita', page:'receitas' } },
  { id:'n05', titulo:'Novo usuário cadastrado', descricao:'Carlos Mendes foi cadastrado como Gerente na empresa Kazole Imobiliária.', tipo:'usuarios', icone:'user-plus', cor:'#7c3aed', lida:false, data:'2026-06-15T16:45', empresa:'kz', acao:{ label:'Ver usuário', page:'usuarios' } },
  { id:'n06', titulo:'Aprovação financeira pendente', descricao:'Lançamento "Compra Equipamentos" no valor de R$ 8.500,00 aguarda aprovação.', tipo:'financeiro', icone:'check-circle', cor:'#ca8a04', lida:false, data:`${H}T10:00`, empresa:'ax', acao:{ label:'Ver lançamento', page:'despesas' } },
  { id:'n07', titulo:'Conta próxima do vencimento', descricao:'A conta "Seguro Imóvel" vence em 3 dias no valor de R$ 560,00.', tipo:'financeiro', icone:'clock', cor:'#ea580c', lida:false, data:`${H}T06:00`, empresa:'kz', acao:{ label:'Ver conta', page:'contas_pagar' } },
  { id:'n08', titulo:'Erro na importação', descricao:'Erro ao processar NF-e 000.456: XML inválido ou fora do prazo de emissão.', tipo:'sistema', icone:'x-circle', cor:'#dc2626', lida:false, data:'2026-06-15T13:45', empresa:'ace', acao:{ label:'Ver erros', page:'importar' } },
  { id:'n09', titulo:'Empresa cadastrada', descricao:'Nova empresa "K2 Imob Ltda" foi adicionada ao sistema com sucesso.', tipo:'empresas', icone:'building', cor:'#0891b2', lida:true, data:'2026-06-14T11:20', empresa:'k2', acao:{ label:'Ver empresa', page:'empresas' } },
  { id:'n10', titulo:'Relatório gerado', descricao:'Relatório financeiro de Maio/2026 foi gerado e está disponível.', tipo:'sistema', icone:'file-text', cor:'#2563eb', lida:true, data:'2026-06-14T09:15', empresa:'kz', acao:{ label:'Ver relatório', page:'relatorios' } },
  { id:'n11', titulo:'Meta financeira atingida', descricao:'A meta "Receita Mensal Maio" de R$ 50.000,00 foi atingida! Parabéns!', tipo:'financeiro', icone:'target', cor:'#16a34a', lida:true, data:'2026-06-13T18:00', empresa:'kz', acao:{ label:'Ver metas', page:'metas' } },
  { id:'n12', titulo:'Nota fiscal importada', descricao:'NF-e 000.123 da empresa ABC Fornecedores foi importada com sucesso.', tipo:'sistema', icone:'upload', cor:'#2563eb', lida:true, data:'2026-06-13T14:30', empresa:'ki1', acao:{ label:'Ver importação', page:'importar' } },
  { id:'n13', titulo:'Alteração de senha', descricao:'Sua senha foi alterada em 13/06/2026 às 10:20. Se não foi você, contate o suporte.', tipo:'sistema', icone:'key', cor:'#ea580c', lida:true, data:'2026-06-13T10:20', empresa:'kz', acao:null },
  { id:'n14', titulo:'Login em novo dispositivo', descricao:'Acesso detectado em Windows/Chrome em São Paulo, SP em 12/06 às 08:15.', tipo:'sistema', icone:'shield', cor:'#dc2626', lida:true, data:'2026-06-12T08:15', empresa:'kz', acao:null },
  { id:'n15', titulo:'Mês fechado', descricao:'O mês de Maio/2026 foi fechado para a empresa Kazole Imobiliária.', tipo:'financeiro', icone:'lock', cor:'#7c3aed', lida:true, data:'2026-06-01T17:00', empresa:'kz', acao:{ label:'Ver fechamento', page:'mes_fechado' } },
]

function load() {
  try { return JSON.parse(localStorage.getItem('x8_notifs') || 'null') || MOCK } catch { return MOCK }
}

const Ctx = createContext()

export function NotifProvider({ children }) {
  const [notifs, setNotifs] = useState(load)

  const persist = (fn) => setNotifs(prev => {
    const next = fn(prev)
    localStorage.setItem('x8_notifs', JSON.stringify(next))
    return next
  })

  const marcarLida = useCallback((id) => {
    persist(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
  }, [])

  const marcarTodasLidas = useCallback(() => {
    persist(prev => prev.map(n => ({ ...n, lida: true })))
  }, [])

  const remover = useCallback((id) => {
    persist(prev => prev.filter(n => n.id !== id))
  }, [])

  const limparLidas = useCallback(() => {
    persist(prev => prev.filter(n => !n.lida))
  }, [])

  const unreadCount = useMemo(() => notifs.filter(n => !n.lida).length, [notifs])

  return (
    <Ctx.Provider value={{ notifs, unreadCount, marcarLida, marcarTodasLidas, remover, limparLidas }}>
      {children}
    </Ctx.Provider>
  )
}

export const useNotif = () => useContext(Ctx)

export function timeAgo(str) {
  const d = new Date(str)
  const now = new Date()
  const diff = (now - d) / 1000
  const hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (diff < 60) return 'Agora mesmo'
  if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hoje às ${hm}`
  if (diff < 172800) return `Ontem às ${hm}`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
