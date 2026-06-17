import { useMemo, useState } from 'react'
import { T, fmt, fd } from '../theme'
import { Card, KpiCard, StatusBadge, SearchInput, Table, Btn } from '../components/ui'
import { CATS_DESPESA } from '../data'
import AdvancedFilters, { defaultFilter, filterLancamentos, loadSavedFilter } from '../components/AdvancedFilters'
import * as XLSX from 'xlsx'

const COLORS = ['#2563eb','#dc2626','#7c3aed','#16a34a','#ea580c','#0891b2','#ca8a04','#9ca3af']

export default function ContasPagar({ data, onSave, setPage, extraCats = [] }) {
  const catsDespesa = useMemo(() => [...CATS_DESPESA, ...extraCats.filter(c => c.tipo === 'despesa')], [extraCats])
  const [filter, setFilter] = useState(() => loadSavedFilter('x8_filter_contas_pagar') || defaultFilter())
  const [search, setSearch]  = useState('')

  const allLancs = useMemo(() => (data.lancamentos || []).filter(l => l.tipo === 'despesa'), [data.lancamentos])
  const lancs    = useMemo(() => filterLancamentos(allLancs, filter), [allLancs, filter])

  const filtered = useMemo(() => {
    let l = [...lancs].sort((a, b) => (a.vencimento || a.data || '').localeCompare(b.vencimento || b.data || ''))
    if (search) l = l.filter(x => [x.desc, x.fornecedor, x.catNome].filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase())))
    return l
  }, [lancs, search])

  const tTotal = lancs.reduce((s, l) => s + l.valor, 0)
  const tPago  = lancs.filter(l => l.status === 'Paga').reduce((s, l) => s + l.valor, 0)
  const tPend  = lancs.filter(l => l.status === 'A Pagar').reduce((s, l) => s + l.valor, 0)
  const tAtr   = lancs.filter(l => l.status === 'Atrasada').reduce((s, l) => s + l.valor, 0)

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(filtered.map(l => ({
      'Vencimento': l.vencimento || l.data || '',
      'Descrição': l.desc || '',
      'Fornecedor': l.fornecedor || '',
      'Categoria': l.catNome || '',
      'Centro de Custo': l.centroCusto || '',
      'Valor (R$)': l.valor || 0,
      'Status': l.status || '',
    })))
    XLSX.utils.book_append_sheet(wb, ws, 'Contas a Pagar')
    XLSX.writeFile(wb, `contas_pagar_${filter.inicio}_${filter.fim}.xlsx`)
  }

  const columns = [
    { key: 'vencimento', label: 'Vencimento', render: (v, row) => <span style={{ fontSize: 13, color: row.status === 'Atrasada' ? T.red : 'var(--text)' }}>{fd(v || row.data)}</span> },
    { key: 'desc', label: 'Descrição', render: v => <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span> },
    { key: 'fornecedor', label: 'Fornecedor', render: v => <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{v || '—'}</span> },
    { key: 'catNome', label: 'Categoria', render: (v, row) => {
      const ci = catsDespesa.findIndex(c => c.id === row.cat)
      return <span style={{ background: (COLORS[ci >= 0 ? ci % COLORS.length : 0]) + '20', color: COLORS[ci >= 0 ? ci % COLORS.length : 0], borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>{v}</span>
    }},
    { key: 'centroCusto', label: 'Centro de Custo', render: v => <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v || '—'}</span> },
    { key: 'valor', label: 'Valor', render: v => <span style={{ fontWeight: 700, fontSize: 14, color: T.red }}>{fmt(v)}</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    {
      key: 'id', label: 'Ações', render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {row.status !== 'Paga' && row.status !== 'Cancelada' && (
            <button onClick={() => onSave && onSave({ ...row, status: 'Paga' }, true)}
              style={{ background: T.greenL, color: T.green, border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
              Marcar paga
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: 'var(--text)' }}>
      <div className="page-hd">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Contas a Pagar</h1>
          <div style={{ color: 'var(--text-sub)', fontSize: 14 }}>Controle de pagamentos e obrigações financeiras.</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" icon="↑" onClick={exportExcel}>Exportar</Btn>
          <Btn variant="danger" icon="+" onClick={() => setPage && setPage('despesas')}>Nova conta a pagar</Btn>
        </div>
      </div>

      <AdvancedFilters tipo="despesa" cats={catsDespesa} filter={filter} onApply={setFilter} storageKey="x8_filter_contas_pagar" />

      <div className="g-4" style={{ marginBottom: 22 }}>
        <KpiCard icon="📤" iconBg={T.redL}    label="Total no período" value={fmt(tTotal)} />
        <KpiCard icon="✓"  iconBg={T.greenL}  label="Pagas"           value={fmt(tPago)} />
        <KpiCard icon="⏳" iconBg={T.yellowL} label="A Pagar"         value={fmt(tPend)} />
        <KpiCard icon="⚠"  iconBg={T.orangeL} label="Atrasadas"       value={fmt(tAtr)} />
      </div>

      <Card>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid var(--border)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Contas do período <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 13 }}>({filtered.length} registros)</span></div>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar conta..." />
        </div>
        <Table columns={columns} data={filtered}
          emptyState={<div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 14 }}>Nenhuma conta encontrada no período</div>} />
      </Card>
    </div>
  )
}
