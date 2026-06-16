import { useMemo, useState } from 'react'
import { T, fmt, fd } from '../theme'
import { Card, KpiCard, StatusBadge, SearchInput, Table, Btn } from '../components/ui'

export default function ContasPagar({ data, onSave, setPage }) {
  const [search, setSearch] = useState('')
  const [fStatus, setFStatus] = useState('')
  const lancs = (data.lancamentos || []).filter(l => l.tipo === 'despesa')

  const filtered = useMemo(() => {
    let l = [...lancs].sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''))
    if (search) l = l.filter(x => [x.desc, x.fornecedor, x.catNome].filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase())))
    if (fStatus) l = l.filter(x => x.status === fStatus)
    return l
  }, [lancs, search, fStatus])

  const tTotal = lancs.reduce((s, l) => s + l.valor, 0)
  const tPago = lancs.filter(l => l.status === 'Pago').reduce((s, l) => s + l.valor, 0)
  const tPend = lancs.filter(l => l.status === 'Pendente').reduce((s, l) => s + l.valor, 0)
  const tAtr = lancs.filter(l => l.status === 'Atrasado').reduce((s, l) => s + l.valor, 0)

  const columns = [
    { key: 'vencimento', label: 'Vencimento', render: (v, row) => <span style={{ fontSize: 13, color: row.status === 'Atrasado' ? T.red : T.text }}>{fd(v)}</span> },
    { key: 'desc', label: 'Descrição', render: v => <span style={{ fontWeight: 500, fontSize: 13 }}>{v}</span> },
    { key: 'fornecedor', label: 'Fornecedor', render: v => <span style={{ fontSize: 13, color: T.sub }}>{v || '—'}</span> },
    { key: 'catNome', label: 'Categoria', render: v => <span style={{ fontSize: 12, color: T.sub }}>{v}</span> },
    { key: 'centroCusto', label: 'Centro de Custo', render: v => <span style={{ fontSize: 12, color: T.muted }}>{v || '—'}</span> },
    { key: 'conta', label: 'Conta', render: v => <span style={{ fontSize: 12, color: T.muted }}>{v || '—'}</span> },
    { key: 'valor', label: 'Valor', render: v => <span style={{ fontWeight: 700, fontSize: 14, color: T.red }}>{fmt(v)}</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    {
      key: 'id', label: 'Ações', render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {row.status !== 'Pago' && (
            <button
              onClick={() => onSave && onSave({ ...row, status: 'Pago' }, true)}
              style={{ background: T.greenL, color: T.green, border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
              Marcar pago
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
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Contas a Pagar</h1>
          <div style={{ color: T.sub, fontSize: 14 }}>Controle de pagamentos e obrigações financeiras.</div>
        </div>
        <Btn variant="danger" icon="+" onClick={() => setPage && setPage('despesas')}>Nova conta a pagar</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard icon="📤" iconBg={T.redL} label="Total a pagar" value={fmt(tTotal)} delta={-6.8} />
        <KpiCard icon="✓" iconBg={T.greenL} label="Pagas" value={fmt(tPago)} delta={-9.4} />
        <KpiCard icon="⏳" iconBg={T.yellowL} label="Pendentes" value={fmt(tPend)} delta={5.2} />
        <KpiCard icon="⚠" iconBg={T.orangeL} label="Atrasadas" value={fmt(tAtr)} delta={0} />
      </div>

      <Card>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Contas do período</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar..." />
            <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: T.sub }}>
              <option value="">Todos os status</option>
              <option value="Pago">Pago</option>
              <option value="Pendente">Pendente</option>
              <option value="Atrasado">Atrasado</option>
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
