import { useMemo, useState } from 'react'
import { T, fmt, fd } from '../theme'
import { Card, KpiCard, StatusBadge, SearchInput, Table, Btn } from '../components/ui'
import CompetenciaSelector, { COMPETENCIA_DEFAULT, filterByCompetencia } from '../components/CompetenciaSelector'

export default function ContasReceber({ data, onSave, setPage }) {
  const [comp, setComp] = useState(COMPETENCIA_DEFAULT)
  const [search, setSearch] = useState('')
  const [fStatus, setFStatus] = useState('')
  const allLancs = (data.lancamentos || []).filter(l => l.tipo === 'receita')
  const lancs = useMemo(() => filterByCompetencia(allLancs, comp), [allLancs, comp])

  const filtered = useMemo(() => {
    let l = [...lancs].sort((a, b) => b.vencimento?.localeCompare(a.vencimento || '') || 0)
    if (search) l = l.filter(x => [x.desc, x.cliente, x.catNome].filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase())))
    if (fStatus) l = l.filter(x => x.status === fStatus)
    return l
  }, [lancs, search, fStatus])

  const tTotal = lancs.reduce((s, l) => s + l.valor, 0)
  const tRec = lancs.filter(l => l.status === 'Recebida').reduce((s, l) => s + l.valor, 0)
  const tPrev = lancs.filter(l => l.status === 'A receber').reduce((s, l) => s + l.valor, 0)
  const tAtr = lancs.filter(l => l.status === 'Atrasada').reduce((s, l) => s + l.valor, 0)

  const columns = [
    { key: 'vencimento', label: 'Vencimento', render: (v, row) => <span style={{ fontSize: 13, color: row.status === 'Atrasada' ? T.red : T.text }}>{fd(v)}</span> },
    { key: 'desc', label: 'Descrição', render: v => <span style={{ fontWeight: 500, fontSize: 13 }}>{v}</span> },
    { key: 'cliente', label: 'Cliente', render: v => <span style={{ fontSize: 13, color: T.sub }}>{v || '—'}</span> },
    { key: 'catNome', label: 'Categoria', render: v => <span style={{ fontSize: 12, color: T.sub }}>{v}</span> },
    { key: 'conta', label: 'Conta', render: v => <span style={{ fontSize: 12, color: T.muted }}>{v || '—'}</span> },
    { key: 'valor', label: 'Valor', render: (v, row) => <span style={{ fontWeight: 700, fontSize: 14, color: row.status === 'Atrasada' ? T.red : T.green }}>{fmt(v)}</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    {
      key: 'id', label: 'Ações', render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {row.status !== 'Recebida' && (
            <button
              onClick={() => onSave && onSave({ ...row, status: 'Recebida' }, true)}
              style={{ background: T.greenL, color: T.green, border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
              Marcar recebida
            </button>
          )}
        </div>
      )
    },
  ]

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: T.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Contas a Receber</h1>
          <div style={{ color: T.sub, fontSize: 14 }}>Gerencie os recebíveis da empresa.</div>
        </div>
        <CompetenciaSelector {...comp} onChange={setComp} />
        <Btn icon="+" onClick={() => setPage && setPage('receitas')}>Novo recebível</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard icon="📥" iconBg={T.greenL} label="Total recebíveis" value={fmt(tTotal)} delta={18.2} />
        <KpiCard icon="✓" iconBg={T.greenL} label="Recebidas" value={fmt(tRec)} delta={16.8} />
        <KpiCard icon="📅" iconBg={T.blueL} label="A receber" value={fmt(tPrev)} delta={22.4} />
        <KpiCard icon="⚠" iconBg={T.orangeL} label="Atrasadas" value={fmt(tAtr)} delta={-8.7} />
      </div>

      <Card>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Recebíveis do período</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar..." />
            <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: T.sub }}>
              <option value="">Todos os status</option>
              <option value="Recebida">Recebida</option>
              <option value="A receber">A receber</option>
              <option value="Atrasada">Atrasada</option>
            </select>
            <Btn variant="ghost" sm>↑ Exportar</Btn>
          </div>
        </div>
        <Table columns={columns} data={filtered} />
        <div style={{ padding: '12px 18px', borderTop: `1px solid ${T.border}`, fontSize: 13, color: T.sub }}>
          {filtered.length} registros encontrados
        </div>
      </Card>
    </div>
  )
}
