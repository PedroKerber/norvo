import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { T, fmt, fmtS, fd, uid } from '../theme'
import { CATS_DESPESA, CONTAS } from '../data'
import { Card, Btn, Badge, StatusBadge, KpiCard, Modal, Input, Select, SearchInput, FilterBar, Table, EmptyState, Confirm, Toast } from '../components/ui'
import CompetenciaSelector, { COMPETENCIA_DEFAULT, filterByCompetencia } from '../components/CompetenciaSelector'

const COLORS = ['#2563eb', '#dc2626', '#7c3aed', '#16a34a', '#ea580c', '#0891b2', '#ca8a04', '#9ca3af']
const STATUS_OPTS = ['Pago', 'Pendente', 'Atrasado']

export default function Despesas({ empresa, data, onSave, onDelete }) {
  const [comp, setComp] = useState(COMPETENCIA_DEFAULT)
  const [search, setSearch] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fCat, setFCat] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({})

  const allLancs = (data.lancamentos || []).filter(l => l.tipo === 'despesa')
  const lancs = useMemo(() => filterByCompetencia(allLancs, comp), [allLancs, comp])

  const filtered = useMemo(() => {
    let l = [...lancs].sort((a, b) => b.data.localeCompare(a.data))
    if (search) l = l.filter(x => [x.desc, x.catNome, x.fornecedor].filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase())))
    if (fStatus) l = l.filter(x => x.status === fStatus)
    if (fCat) l = l.filter(x => x.cat === fCat)
    return l
  }, [lancs, search, fStatus, fCat])

  const tTotal = lancs.reduce((s, l) => s + l.valor, 0)
  const tPago = lancs.filter(l => l.status === 'Pago').reduce((s, l) => s + l.valor, 0)
  const tPend = lancs.filter(l => l.status === 'Pendente').reduce((s, l) => s + l.valor, 0)
  const tAtr = lancs.filter(l => l.status === 'Atrasado').reduce((s, l) => s + l.valor, 0)

  const catData = useMemo(() => {
    const map = {}
    lancs.forEach(l => { map[l.catNome] = (map[l.catNome] || 0) + l.valor })
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1
    return Object.entries(map).map(([n, v]) => ({ n, v, pct: Math.round(v / total * 100) })).sort((a, b) => b.v - a.v)
  }, [lancs])

  const evolData = useMemo(() => {
    const days = ['01', '05', '10', '12', '15', '18', '20', '22', '25', '30']
    return days.map(d => {
      const v = lancs.filter(l => l.data <= `2026-05-${d}` && l.status === 'Pago').reduce((s, l) => s + l.valor, 0)
      return { dia: `${d}/05`, v }
    })
  }, [lancs])

  const openNew = () => {
    setEditItem(null)
    setForm({ cat: '', catNome: '', desc: '', valor: '', data: new Date().toISOString().slice(0, 10), vencimento: new Date().toISOString().slice(0, 10), status: 'Pendente', forma: 'conta', conta: 'Conta Corrente Itaú', fornecedor: '', centroCusto: '', obs: '' })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({ ...item, valor: String(item.valor) })
    setShowModal(true)
  }

  const salvar = () => {
    if (!form.valor || isNaN(+form.valor) || +form.valor <= 0) return
    const cat = CATS_DESPESA.find(c => c.id === form.cat)
    const item = { ...form, id: editItem ? editItem.id : uid(), tipo: 'despesa', catNome: cat?.nome || form.catNome || 'Despesa', valor: parseFloat(form.valor), empId: empresa.id }
    onSave(item, !!editItem)
    setShowModal(false)
    setToast({ msg: editItem ? 'Despesa atualizada!' : 'Despesa cadastrada!', type: 'success' })
  }

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const columns = [
    { key: 'data', label: 'Data ↓', render: v => <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 13, color: T.muted }}>📅</span><span style={{ fontSize: 13 }}>{fd(v)}</span></div> },
    { key: 'desc', label: 'Descrição', render: v => <span style={{ fontWeight: 500, fontSize: 13 }}>{v}</span> },
    { key: 'fornecedor', label: 'Fornecedor', render: v => <span style={{ fontSize: 13, color: T.sub }}>{v || '—'}</span> },
    { key: 'catNome', label: 'Categoria', render: (v, row) => { const ci = CATS_DESPESA.findIndex(c => c.id === row.cat); const cor = COLORS[ci >= 0 ? ci % COLORS.length : 0]; return <Badge label={v} color={cor} /> } },
    { key: 'centroCusto', label: 'Centro de Custo', render: v => <span style={{ fontSize: 12, color: T.sub }}>{v || '—'}</span> },
    { key: 'conta', label: 'Conta', render: v => <span style={{ fontSize: 12, color: T.sub }}>{v || '—'}</span> },
    { key: 'vencimento', label: 'Vencimento', render: (v, row) => <span style={{ fontSize: 13, color: row.status === 'Atrasado' ? T.red : T.text }}>{fd(v)}</span> },
    { key: 'valor', label: 'Valor', render: v => <span style={{ fontWeight: 700, fontSize: 14, color: T.red }}>{fmt(v)}</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    {
      key: 'id', label: 'Ações', render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={e => { e.stopPropagation(); openEdit(row) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.sub, fontSize: 14 }}>✏️</button>
          <button onClick={e => { e.stopPropagation(); setConfirm(row) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.red, fontSize: 14 }}>🗑</button>
        </div>
      )
    },
  ]

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: T.text }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {confirm && <Confirm msg={`Excluir "${confirm.desc}"?`} onYes={() => { onDelete(confirm.id); setConfirm(null); setToast({ msg: 'Despesa excluída!', type: 'success' }) }} onNo={() => setConfirm(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: T.redL, borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: T.red }}>↓</div>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 26, margin: 0 }}>Despesas</h1>
            <div style={{ color: T.sub, fontSize: 14 }}>Acompanhe todas as despesas da empresa selecionada.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <CompetenciaSelector {...comp} onChange={setComp} />
          <Btn variant="ghost" icon="↑">Exportar</Btn>
          <Btn variant="danger" icon="+" onClick={openNew}>Nova despesa</Btn>
        </div>
      </div>

      <FilterBar>
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center', color: T.sub }}>
          📅 01/05/2026 - 31/05/2026 <span style={{ fontSize: 11 }}>▾</span>
        </div>
        <select value={fCat} onChange={e => setFCat(e.target.value)} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 14px', fontSize: 13, color: T.sub, outline: 'none', fontFamily: 'inherit' }}>
          <option value="">🏷 Todas as categorias</option>
          {CATS_DESPESA.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 14px', fontSize: 13, color: T.sub, outline: 'none', fontFamily: 'inherit' }}>
          <option value="">🤝 Todos os fornecedores</option>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ color: T.primary, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginLeft: 'auto' }}>⚙ Filtros avançados</span>
      </FilterBar>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard icon="↓" iconBg={T.redL} label="Despesas totais" value={fmt(tTotal)} delta={-6.8} />
        <KpiCard icon="✓" iconBg={T.greenL} label="Pagas" value={fmt(tPago)} delta={-9.4} />
        <KpiCard icon="⏳" iconBg={T.yellowL} label="Pendentes" value={fmt(tPend)} delta={5.2} />
        <KpiCard icon="⚠" iconBg={T.orangeL} label="Atrasadas" value={fmt(tAtr)} delta={0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Evolução das despesas</div>
            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, color: T.sub }}>Este mês ▾</div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={evolData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.red} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={T.red} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="dia" tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.muted, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} />
              <Tooltip formatter={v => fmt(v)} contentStyle={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="v" stroke={T.red} strokeWidth={2.5} fill="url(#gradD)" dot={{ r: 4, fill: T.red }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Despesas por categoria</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <PieChart width={140} height={140}>
                <Pie data={catData} cx={70} cy={70} innerRadius={42} outerRadius={65} dataKey="pct" startAngle={90} endAngle={-270}>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </PieChart>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 11, color: T.muted }}>Total</div>
                <div style={{ fontWeight: 800, fontSize: 14, color: T.red }}>{fmtS(tTotal)}</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {catData.map((d, i) => (
                <div key={d.n} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span>{d.n}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ color: T.muted }}>{d.pct}%</span>
                    <span style={{ fontWeight: 600, minWidth: 80, textAlign: 'right' }}>{fmt(d.v)}</span>
                  </div>
                </div>
              ))}
              <button style={{ background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginTop: 6, fontFamily: 'inherit' }}>Ver todas as categorias ›</button>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Despesas lançadas</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar despesa..." />
            <Btn variant="ghost" sm>≡ Colunas</Btn>
            <Btn variant="ghost" sm>⇅ Ordenar</Btn>
          </div>
        </div>
        <Table columns={columns} data={filtered} onRow={openEdit}
          emptyState={<EmptyState icon="📋" title="Nenhuma despesa" sub="Cadastre sua primeira despesa" action={<Btn variant="danger" onClick={openNew}>+ Nova despesa</Btn>} />} />
        <div style={{ padding: '12px 18px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: T.sub }}>
          <span>Mostrando 1 a {filtered.length} de {filtered.length} despesas</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>‹</button>
            <button style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontWeight: 600 }}>1</button>
            <button style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>›</button>
          </div>
        </div>
      </Card>

      {showModal && (
        <Modal title={editItem ? 'Editar despesa' : 'Nova despesa'} onClose={() => setShowModal(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>Valor</label>
              <div style={{ border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: T.redL, color: T.red, borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 700 }}>R$</span>
                <input type="number" step="0.01" value={form.valor} onChange={e => sf('valor', e.target.value)} placeholder="0,00" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 20, fontWeight: 700, color: T.red, fontFamily: 'inherit', background: 'transparent' }} />
              </div>
            </div>
            <Input label="Descrição" value={form.desc || ''} onChange={e => sf('desc', e.target.value)} placeholder="Ex.: Aluguel escritório" />
            <Input label="Fornecedor" value={form.fornecedor || ''} onChange={e => sf('fornecedor', e.target.value)} placeholder="Nome do fornecedor" />
            <Select label="Categoria" value={form.cat || ''} onChange={e => { const c = CATS_DESPESA.find(x => x.id === e.target.value); sf('cat', e.target.value); sf('catNome', c?.nome || '') }} placeholder="Selecionar..." options={CATS_DESPESA.map(c => ({ value: c.id, label: c.nome }))} />
            <Select label="Status" value={form.status || ''} onChange={e => sf('status', e.target.value)} options={STATUS_OPTS} />
            <Input label="Data" type="date" value={form.data || ''} onChange={e => sf('data', e.target.value)} />
            <Input label="Vencimento" type="date" value={form.vencimento || ''} onChange={e => sf('vencimento', e.target.value)} />
            <Select label="Conta" value={form.conta || ''} onChange={e => sf('conta', e.target.value)} options={CONTAS.map(c => c.nome)} />
            <Input label="Centro de Custo" value={form.centroCusto || ''} onChange={e => sf('centroCusto', e.target.value)} placeholder="Ex.: Marketing" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <Btn full variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn full variant="danger" onClick={salvar}>Salvar despesa</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
