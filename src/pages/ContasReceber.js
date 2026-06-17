import { useMemo, useState } from 'react'
import { T, fmt, fd } from '../theme'
import { Card, KpiCard, StatusBadge, SearchInput, Table, Btn } from '../components/ui'
import { CATS_RECEITA } from '../data'
import AdvancedFilters, { defaultFilter, filterLancamentos, loadSavedFilter } from '../components/AdvancedFilters'
import * as XLSX from 'xlsx'

const COLORS = ['#16a34a','#2563eb','#7c3aed','#ea580c','#0891b2','#9ca3af']

export default function ContasReceber({ data, onSave, setPage, extraCats = [] }) {
  const catsReceita = useMemo(() => [...CATS_RECEITA, ...extraCats.filter(c => c.tipo === 'receita')], [extraCats])
  const [filter, setFilter] = useState(() => loadSavedFilter('x8_filter_contas_receber') || defaultFilter())
  const [search, setSearch]  = useState('')

  const allLancs = useMemo(() => (data.lancamentos || []).filter(l => l.tipo === 'receita'), [data.lancamentos])
  const lancs    = useMemo(() => filterLancamentos(allLancs, filter), [allLancs, filter])

  const filtered = useMemo(() => {
    let l = [...lancs].sort((a, b) => (a.vencimento || a.data || '').localeCompare(b.vencimento || b.data || ''))
    if (search) l = l.filter(x => [x.desc, x.cliente, x.catNome].filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase())))
    return l
  }, [lancs, search])

  const tTotal = lancs.reduce((s, l) => s + l.valor, 0)
  const tRec   = lancs.filter(l => l.status === 'Recebida').reduce((s, l) => s + l.valor, 0)
  const tPrev  = lancs.filter(l => l.status === 'A receber').reduce((s, l) => s + l.valor, 0)
  const tAtr   = lancs.filter(l => l.status === 'Atrasada').reduce((s, l) => s + l.valor, 0)

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(filtered.map(l => ({
      'Vencimento': l.vencimento || l.data || '',
      'Descrição': l.desc || '',
      'Cliente': l.cliente || '',
      'Categoria': l.catNome || '',
      'Centro de Custo': l.centroCusto || '',
      'Valor (R$)': l.valor || 0,
      'Status': l.status || '',
    })))
    XLSX.utils.book_append_sheet(wb, ws, 'Contas a Receber')
    XLSX.writeFile(wb, `contas_receber_${filter.inicio}_${filter.fim}.xlsx`)
  }

  const columns = [
    { key: 'vencimento', label: 'Vencimento', render: (v, row) => <span style={{ fontSize: 13, color: row.status === 'Atrasada' ? T.red : 'var(--text)' }}>{fd(v || row.data)}</span> },
    { key: 'desc', label: 'Descrição', render: v => <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span> },
    { key: 'cliente', label: 'Cliente', render: v => <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{v || '—'}</span> },
    { key: 'catNome', label: 'Categoria', render: (v, row) => {
      const ci = catsReceita.findIndex(c => c.id === row.cat)
      return <span style={{ background: (COLORS[ci >= 0 ? ci % COLORS.length : 0]) + '20', color: COLORS[ci >= 0 ? ci % COLORS.length : 0], borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>{v}</span>
    }},
    { key: 'centroCusto', label: 'Centro de Custo', render: v => <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v || '—'}</span> },
    { key: 'valor', label: 'Valor', render: (v, row) => <span style={{ fontWeight: 700, fontSize: 14, color: row.status === 'Atrasada' ? T.red : T.green }}>{fmt(v)}</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    {
      key: 'id', label: 'Ações', render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {row.status !== 'Recebida' && row.status !== 'Cancelada' && (
            <button onClick={() => onSave && onSave({ ...row, status: 'Recebida' }, true)}
              style={{ background: T.greenL, color: T.green, border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
              Marcar recebida
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
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Contas a Receber</h1>
          <div style={{ color: 'var(--text-sub)', fontSize: 14 }}>Gerencie os recebíveis da empresa.</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" icon="↑" onClick={exportExcel}>Exportar</Btn>
          <Btn icon="+" onClick={() => setPage && setPage('receitas')}>Novo recebível</Btn>
        </div>
      </div>

      <AdvancedFilters tipo="receita" cats={catsReceita} filter={filter} onApply={setFilter} storageKey="x8_filter_contas_receber" />

      <div className="g-4" style={{ marginBottom: 22 }}>
        <KpiCard icon="📥" iconBg={T.greenL}  label="Total recebíveis" value={fmt(tTotal)} />
        <KpiCard icon="✓"  iconBg={T.greenL}  label="Recebidas"        value={fmt(tRec)} />
        <KpiCard icon="📅" iconBg={T.blueL}   label="A receber"        value={fmt(tPrev)} />
        <KpiCard icon="⚠"  iconBg={T.orangeL} label="Atrasadas"        value={fmt(tAtr)} />
      </div>

      <Card>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid var(--border)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Recebíveis do período <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 13 }}>({filtered.length} registros)</span></div>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar recebível..." />
        </div>
        <Table columns={columns} data={filtered}
          emptyState={<div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 14 }}>Nenhum recebível encontrado no período</div>} />
      </Card>
    </div>
  )
}
