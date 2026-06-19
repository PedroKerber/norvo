import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { T, fmt, fd } from '../theme'
import { Card, Btn, Badge, StatusBadge, SearchInput, Table, KpiCard, Confirm, Toast } from '../components/ui'
import { CATS_RECEITA, CATS_DESPESA, CATS_RETIRADA } from '../data'
import AdvancedFilters, { defaultFilter, filterLancamentos, loadSavedFilter } from '../components/AdvancedFilters'

const COLORS_R = ['#16a34a', '#2563eb', '#7c3aed', '#ea580c', '#0891b2', '#9ca3af']
const COLORS_D = ['#2563eb', '#dc2626', '#7c3aed', '#16a34a', '#ea580c', '#0891b2', '#ca8a04', '#9ca3af']

export default function Transacoes({ data, onDelete, onNovaDespesa, onNovaReceita }) {
  const [filter, setFilter] = useState(() => loadSavedFilter('x8_filter_transacoes') || defaultFilter())
  const [search, setSearch] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [toast, setToast] = useState(null)

  const allLancs = useMemo(() => data.lancamentos || [], [data.lancamentos])

  const lancs = useMemo(() => {
    let l = filterLancamentos(allLancs, filter)
    l = [...l].sort((a, b) => (b.data || b.vencimento || '').localeCompare(a.data || a.vencimento || ''))
    if (search) l = l.filter(x => [x.desc, x.catNome, x.cliente, x.fornecedor].filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase())))
    if (fTipo) l = l.filter(x => x.tipo === fTipo)
    return l
  }, [allLancs, filter, search, fTipo])

  const tRec      = lancs.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const tDesp     = lancs.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)
  const tRetirada = lancs.filter(l => l.tipo === 'retirada').reduce((s, l) => s + l.valor, 0)
  const saldo = tRec - tDesp - tRetirada

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(lancs.map(l => ({
      'Tipo': l.tipo === 'receita' ? 'Receita' : l.tipo === 'retirada' ? 'Retirada de Sócio' : 'Despesa',
      'Data': l.data || l.vencimento || '',
      'Descrição': l.desc || '',
      'Categoria': l.catNome || '',
      'Contato': l.cliente || l.fornecedor || '',
      'Valor (R$)': l.valor || 0,
      'Status': l.status || '',
    })))
    XLSX.utils.book_append_sheet(wb, ws, 'Transações')
    XLSX.writeFile(wb, `transacoes_${filter.inicio}_${filter.fim}.xlsx`)
  }

  const columns = [
    {
      key: 'tipo', label: 'Tipo',
      render: v => {
        const isR = v === 'receita', isRet = v === 'retirada'
        const bg = isR ? T.greenL : isRet ? '#ede9fe' : T.redL
        const color = isR ? T.green : isRet ? '#7c3aed' : T.red
        const icon = isR ? '↑' : isRet ? '←' : '↓'
        return (
          <div style={{ width: 28, height: 28, borderRadius: 6, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color, fontWeight: 700, fontSize: 14 }}>{icon}</span>
          </div>
        )
      }
    },
    { key: 'data', label: 'Data', render: (v, row) => <span style={{ fontSize: 13, color: T.sub }}>{fd(v || row.vencimento)}</span> },
    { key: 'desc', label: 'Descrição', render: v => <span style={{ fontWeight: 500, fontSize: 13 }}>{v}</span> },
    {
      key: 'catNome', label: 'Categoria',
      render: (v, row) => {
        const cats   = row.tipo === 'receita' ? CATS_RECEITA : row.tipo === 'retirada' ? CATS_RETIRADA : CATS_DESPESA
        const colors = row.tipo === 'receita' ? COLORS_R : row.tipo === 'retirada' ? ['#7c3aed','#2563eb'] : COLORS_D
        const ci = cats.findIndex(c => c.id === row.cat)
        return <Badge label={v} color={colors[ci >= 0 ? ci % colors.length : 0]} />
      }
    },
    { key: 'cliente', label: 'Contato', render: (v, row) => <span style={{ fontSize: 13, color: T.sub }}>{v || row.fornecedor || '—'}</span> },
    {
      key: 'valor', label: 'Valor',
      render: (v, row) => {
        const isR = row.tipo === 'receita', isRet = row.tipo === 'retirada'
        return (
          <span style={{ fontWeight: 700, fontSize: 14, color: isR ? T.green : isRet ? '#7c3aed' : T.red }}>
            {isR ? '+' : '-'}{fmt(v)}
          </span>
        )
      }
    },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    {
      key: 'id', label: 'Ações',
      render: (_, row) => (
        <button onClick={e => { e.stopPropagation(); setConfirm(row) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.red, fontSize: 14 }}>🗑</button>
      )
    },
  ]

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: T.text }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {confirm && <Confirm msg={`Excluir "${confirm.desc}"?`} onYes={() => { onDelete(confirm.id); setConfirm(null); setToast({ msg: 'Transação excluída!', type: 'success' }) }} onNo={() => setConfirm(null)} />}

      <div className="page-hd">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Transações</h1>
          <div style={{ color: T.sub, fontSize: 14 }}>Histórico completo de receitas e despesas.</div>
        </div>
        <div className="page-actions">
          <Btn variant="ghost" icon="↑" onClick={exportExcel}>Exportar</Btn>
          <Btn icon="+" onClick={onNovaReceita}>+ Receita</Btn>
          <Btn variant="danger" icon="+" onClick={onNovaDespesa}>+ Despesa</Btn>
        </div>
      </div>

      <AdvancedFilters tipo="all" filter={filter} onApply={setFilter} storageKey="x8_filter_transacoes" />

      <div className="g-3" style={{ marginBottom: 22 }}>
        <KpiCard icon="↑" iconBg={T.greenL} label="Total Receitas"    value={fmt(tRec)} />
        <KpiCard icon="↓" iconBg={T.redL}   label="Total Despesas"    value={fmt(tDesp)} />
        <KpiCard icon="←" iconBg="#ede9fe"   label="Retiradas Sócios"  value={fmt(tRetirada)} />
        <KpiCard icon="=" iconBg={saldo >= 0 ? T.greenL : T.redL} label="Saldo do período" value={fmt(saldo)} />
      </div>

      <Card>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar transações..." />
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0, WebkitOverflowScrolling: 'touch' }}>
              {[['', 'Todos'], ['receita', 'Receitas'], ['despesa', 'Despesas'], ['retirada', 'Retiradas']].map(([v, l]) => (
                <button key={v} onClick={() => setFTipo(v)} style={{
                  background: fTipo === v ? T.primary : T.white, border: `1.5px solid ${fTipo === v ? T.primary : T.border}`,
                  color: fTipo === v ? '#fff' : T.sub, borderRadius: 20, padding: '6px 14px',
                  fontSize: 13, fontWeight: fTipo === v ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
                }}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        <Table columns={columns} data={lancs}
          emptyState={<div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 14 }}>Nenhuma transação encontrada no período</div>} />
        <div style={{ padding: '12px 18px', borderTop: `1px solid ${T.border}`, fontSize: 13, color: T.sub }}>
          Mostrando {lancs.length} transaç{lancs.length !== 1 ? 'ões' : 'ão'}
        </div>
      </Card>
    </div>
  )
}
