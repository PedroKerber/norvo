import { useState, useCallback } from 'react'
import { T } from './theme'
import { initData } from './data'

import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'

import Login from './pages/Login'
import SelectEmpresa from './pages/SelectEmpresa'
import Dashboard from './pages/Dashboard'
import Receitas from './pages/Receitas'
import Despesas from './pages/Despesas'
import Transacoes from './pages/Transacoes'
import FluxoCaixa from './pages/FluxoCaixa'
import ContasPagar from './pages/ContasPagar'
import ContasReceber from './pages/ContasReceber'
import MesFechado from './pages/MesFechado'
import Metas from './pages/Metas'
import Placeholder from './pages/Placeholder'

const PLACEHOLDER_PAGES = ['relatorios', 'empresas', 'categorias', 'centro_custo', 'fornecedores', 'clientes', 'configuracoes', 'scanner']

export default function App() {
  const [usuario, setUsuario] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [appData, setAppData] = useState(() => initData())

  const empData = empresa ? (appData[empresa.id] || { lancamentos: [], metas: [] }) : { lancamentos: [], metas: [] }

  const handleSave = useCallback((item, isEdit, tipo) => {
    setAppData(prev => {
      const empId = item.empId || empresa?.id
      if (tipo === 'meta') {
        const metas = prev[empId]?.metas || []
        const updated = isEdit ? metas.map(m => m.id === item.id ? item : m) : [...metas, item]
        return { ...prev, [empId]: { ...prev[empId], metas: updated } }
      }
      const lancs = prev[empId]?.lancamentos || []
      const updated = isEdit
        ? lancs.map(l => l.id === item.id ? item : l)
        : [...lancs, item]
      return { ...prev, [empId]: { ...prev[empId], lancamentos: updated } }
    })
  }, [empresa])

  const handleDelete = useCallback((id, tipo) => {
    if (!empresa) return
    setAppData(prev => {
      const empId = empresa.id
      if (tipo === 'meta') {
        return { ...prev, [empId]: { ...prev[empId], metas: (prev[empId]?.metas || []).filter(m => m.id !== id) } }
      }
      return {
        ...prev,
        [empId]: {
          ...prev[empId],
          lancamentos: (prev[empId]?.lancamentos || []).filter(l => l.id !== id)
        }
      }
    })
  }, [empresa])

  const handleFecharMes = useCallback(() => {
    if (!empresa) return
    setAppData(prev => ({
      ...prev,
      [empresa.id]: { ...prev[empresa.id], mesFechado: true }
    }))
  }, [empresa])

  if (!usuario) {
    return <Login onLogin={u => setUsuario(u)} />
  }

  if (!empresa) {
    return (
      <SelectEmpresa
        usuario={usuario}
        onSelect={emp => { setEmpresa(emp); setPage('dashboard') }}
        data={appData}
      />
    )
  }

  const sharedProps = { empresa, data: empData, setPage, onSave: handleSave, onDelete: handleDelete }

  const renderPage = () => {
    if (PLACEHOLDER_PAGES.includes(page)) return <Placeholder page={page} />
    switch (page) {
      case 'dashboard': return <Dashboard {...sharedProps} />
      case 'receitas': return <Receitas {...sharedProps} />
      case 'despesas': return <Despesas {...sharedProps} />
      case 'transacoes': return <Transacoes {...sharedProps} onNovaDespesa={() => setPage('despesas')} onNovaReceita={() => setPage('receitas')} />
      case 'fluxo': return <FluxoCaixa {...sharedProps} />
      case 'contas_pagar': return <ContasPagar {...sharedProps} />
      case 'contas_receber': return <ContasReceber {...sharedProps} />
      case 'mes_fechado': return <MesFechado {...sharedProps} onFechar={handleFecharMes} />
      case 'metas': return <Metas {...sharedProps} />
      default: return <Placeholder page={page} />
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, fontFamily: "'Segoe UI', sans-serif" }}>
      <Sidebar page={page} setPage={setPage} />

      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0 }}>
        <TopBar
          empresa={empresa}
          setEmpresa={emp => { setEmpresa(emp); setPage('dashboard') }}
          usuario={usuario}
        />

        <main style={{ flex: 1, marginTop: 60, padding: '28px 28px 40px', overflowX: 'hidden' }}>
          {renderPage()}
        </main>
      </div>

      <button
        onClick={() => setPage('receitas')}
        title="Nova transação"
        style={{
          position: 'fixed', bottom: 28, right: 28,
          background: T.primary, color: '#fff', border: 'none',
          borderRadius: '50%', width: 52, height: 52,
          fontSize: 26, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 16px ' + T.primary + '66',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 500,
        }}
      >+</button>
    </div>
  )
}
