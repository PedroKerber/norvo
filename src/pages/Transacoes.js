import { useState, useMemo } from 'react'
import { T, fmt, fd } from '../theme'
import { Card, Btn, Badge, StatusBadge, SearchInput, Table, KpiCard, Confirm, Toast } from '../components/ui'
import { CATS_RECEITA, CATS_DESPESA } from '../data'
import CompetenciaSelector, { COMPETENCIA_DEFAULT, filterByCompetencia } from '../components/CompetenciaSelector'

const COLORS_R = ['#16a34a', '#2563eb', '#7c3aed', '#ea580c', '#0891b2', '#9ca3af']
const COLORS_D = ['#2563eb', '#dc2626', '#7c3aed', '#16a34a', '#ea580c', '#0891b2', '#ca8a04', '#9ca3af']

export default function Transacoes({ data, onDelete, onNovaDespesa, onNovaReceita }) {
  const [comp, setComp] = useState(COMPETENCIA_DEFAULT)
  const [search, setSearch] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [toast, setToast] = useState(null)

  const allLancs = useMemo(() => data.lancamentos || [], [data.lancamentos])
  const lancs = useMemo(() => {
    let l = [...filterByCompetencia(allLancs, comp)].sort((a, b) => b.data.localeCompare(a.data))
    if (search) l = l.filter(x => [x.desc, x.catNome, x.cliente, x.fornecedor].filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase())))
    if (fTipo) l = l.filter(x => x.tipo === fTipo)
    return l
  }, [allLancs, comp, search, fTipo])

  const tRec = lancs.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const tDesp = lancs.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)
  const saldo = tRec - tDesp

  const columns = [
    {
      key: 'tipo', label: 'Tipo',
      render: (v) => (
        <div style={{ width: 28, height: 28, borderRadius: 6, background: v === 'receita' ? T.greenL : T.redL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: v === 'receita' ? T.green : T.red, fontWeight: 700, fontSize: 14 }}>{v === 'receita' ? '↑' : '↓'}</span>
        </div>
      )
    },
    { key: 'data', label: 'Data ↓', render: v => <span style={{ fontSize: 13, color: T.sub }}>{fd(v)}</span> },
    { key: 'desc', label: 'Descrição', render: v => <span style={{ fontWeight: 500, fontSize: 13 }}>{v}</span> },
    {
      key: 'catNome', label: 'Categoria',
      render: (v, row) => {
        const cats = row.tipo === 'receita' ? CATS_RECEITA : CATS_DESPESA
        const colors = row.tipo === 'receita' ? COLORS_R : COLORS_D
        const ci = cats.findIndex(c => c.id === row.cat)
        return <Badge label={v} color={colors[ci >= 0 ? ci % colors.length : 0]} />
      }
    },
    { key: 'cliente', label: 'Contato', render: (v, row) => <span style={{ fontSize: 13, color: T.sub }}>{v || row.fornecedor || '—'}</span> },
    { key: 'conta', label: 'Conta', render: v => <span style={{ fontSize: 12, color: T.muted }}>{v || '—'}</span> },
    {
      key: 'valor', label: 'Valor',
      render: (v, row) => (
        <span style={{ fontWeight: 700, fontSize: 14, color: row.tipo === 'receita' ? T.green : T.red }}>
          {row.tipo === 'receita' ? '+' : '-'}{fmt(v)}
        </span>
      )
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Transações</h1>
          <div style={{ color: T.sub, fontSize: 14 }}>Histórico completo de receitas e despesas.</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <CompetenciaSelector {...comp} onChange={setComp} />
          <Btn icon="+" onClick={onNovaReceita}>+ Receita</Btn>
          <Btn variant="danger" icon="+" onClick={onNovaDespesa}>+ Despesa</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard icon="↑" iconBg={T.greenL} label="Total Receitas" value={fmt(tRec)} delta={18.2} />
        <KpiCard icon="↓" iconBg={T.redL} label="Total Despesas" value={fmt(tDesp)} delta={-6.8} />
        <KpiCard icon="=" iconBg={saldo >= 0 ? T.greenL : T.redL} label="Saldo do período" value={fmt(saldo)} delta={23.7} />
      </div>

      {/* Filters + Table */}
      <Card>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar transações..." />
            <div style={{ display: 'flex', gap: 6 }}>
              {[['', 'Todos'], ['receita', 'Receitas'], ['despesa', 'Despesas']].map(([v, l]) => (
                <button key={v} onClick={() => setFTipo(v)} style={{ background: fTipo === v ? T.primary : T.white, border: `1.5px solid ${fTipo === v ? T.primary : T.border}`, color: fTipo === v ? '#fff' : T.sub, borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: fTipo === v ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', color: T.sub }}>
                📅 01/05/2026 - 31/05/2026 ▾
              </div>
            </div>
          </div>
        </div>
        <Table columns={columns} data={lancs} />
        <div style={{ padding: '12px 18px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: T.sub }}>
          <span>Mostrando {lancs.length} transações</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>‹</button>
            <button style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontWeight: 600 }}>1</button>
            <button style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>›</button>
          </div>
        </div>
      </Card>
    </div>
  )
}
