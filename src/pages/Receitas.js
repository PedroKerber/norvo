import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { T, fmt, fmtS, fd, uid } from '../theme'
import { CATS_RECEITA, CONTAS } from '../data'
import { Card, Btn, Badge, StatusBadge, KpiCard, Modal, Input, Select, SearchInput, FilterBar, Table, EmptyState, Confirm, Toast } from '../components/ui'
import CompetenciaSelector, { COMPETENCIA_DEFAULT, filterByCompetencia } from '../components/CompetenciaSelector'

const COLORS = ['#16a34a', '#2563eb', '#7c3aed', '#ea580c', '#0891b2', '#9ca3af']

const STATUS_OPTS = ['Recebida', 'A receber', 'Atrasada']

export default function Receitas({ empresa, data, onSave, onDelete }) {
  const [comp, setComp] = useState(COMPETENCIA_DEFAULT)
  const [search, setSearch] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fCat, setFCat] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({})

  const allLancs = (data.lancamentos || []).filter(l => l.tipo === 'receita')
  const lancs = useMemo(() => filterByCompetencia(allLancs, comp), [allLancs, comp])

  const filtered = useMemo(() => {
    let l = [...lancs].sort((a, b) => b.data.localeCompare(a.data))
    if (search) l = l.filter(x => [x.desc, x.catNome, x.cliente].filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase())))
    if (fStatus) l = l.filter(x => x.status === fStatus)
    if (fCat) l = l.filter(x => x.cat === fCat)
    return l
  }, [lancs, search, fStatus, fCat])

  const tTotal = lancs.reduce((s, l) => s + l.valor, 0)
  const tRec = lancs.filter(l => l.status === 'Recebida').reduce((s, l) => s + l.valor, 0)
  const tPrev = lancs.filter(l => l.status === 'A receber').reduce((s, l) => s + l.valor, 0)
  const tAtr = lancs.filter(l => l.status === 'Atrasada').reduce((s, l) => s + l.valor, 0)

  const catData = useMemo(() => {
    const map = {}
    lancs.forEach(l => { map[l.catNome] = (map[l.catNome] || 0) + l.valor })
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1
    return Object.entries(map).map(([n, v]) => ({ n, v, pct: Math.round(v / total * 100) })).sort((a, b) => b.v - a.v)
  }, [lancs])

  const evolData = useMemo(() => {
    const days = ['01', '05', '10', '15', '18', '20', '25', '27', '28', '29']
    return days.map(d => {
      const v = lancs.filter(l => l.data <= `2026-05-${d}` && l.status === 'Recebida').reduce((s, l) => s + l.valor, 0)
      return { dia: `${d}/05`, v }
    })
  }, [lancs])

  const openNew = () => {
    setEditItem(null)
    setForm({ cat: '', catNome: '', desc: '', valor: '', data: new Date().toISOString().slice(0, 10), vencimento: new Date().toISOString().slice(0, 10), status: 'A receber', forma: 'conta', conta: 'Conta Corrente Itaú', cliente: '', centroCusto: '', obs: '' })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({ ...item, valor: String(item.valor) })
    setShowModal(true)
  }

  const salvar = () => {
    if (!form.valor || isNaN(+form.valor) || +form.valor <= 0) return
    const cat = CATS_RECEITA.find(c => c.id === form.cat)
    const item = {
      ...form,
      id: editItem ? editItem.id : uid(),
      tipo: 'receita',
      catNome: cat?.nome || form.catNome || 'Receita',
      valor: parseFloat(form.valor),
      empId: empresa.id,
    }
    onSave(item, !!editItem)
    setShowModal(false)
    setToast({ msg: editItem ? 'Receita atualizada!' : 'Receita cadastrada!', type: 'success' })
  }

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const columns = [
    {
      key: 'data', label: 'Data ↓',
      render: (v) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: T.muted }}>📅</span>
          <span style={{ fontSize: 13 }}>{fd(v)}</span>
        </div>
      )
    },
    { key: 'desc', label: 'Descrição', render: (v) => <span style={{ fontWeight: 500, fontSize: 13 }}>{v}</span> },
    { key: 'cliente', label: 'Cliente', render: (v) => <span style={{ fontSize: 13, color: T.sub }}>{v || '—'}</span> },
    {
      key: 'catNome', label: 'Categoria',
      render: (v, row) => {
        const ci = CATS_RECEITA.findIndex(c => c.id === row.cat)
        const cor = COLORS[ci >= 0 ? ci % COLORS.length : 0]
        return <Badge label={v} color={cor} />
      }
    },
    { key: 'conta', label: 'Conta', render: (v) => <span style={{ fontSize: 12, color: T.sub }}>{v || '—'}</span> },
    {
      key: 'vencimento', label: 'Vencimento',
      render: (v, row) => (
        <span style={{ fontSize: 13, color: row.status === 'Atrasada' ? T.red : T.text }}>{fd(v)}</span>
      )
    },
    {
      key: 'valor', label: 'Valor',
      render: (v, row) => <span style={{ fontWeight: 700, fontSize: 14, color: row.status === 'Atrasada' ? T.red : T.green }}>{fmt(v)}</span>
    },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    {
      key: 'id', label: 'Ações',
      render: (_, row) => (
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
      {confirm && <Confirm msg={`Excluir "${confirm.desc}"?`} onYes={() => { onDelete(confirm.id); setConfirm(null); setToast({ msg: 'Receita excluída!', type: 'success' }) }} onNo={() => setConfirm(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: T.greenL, borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>↑</div>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 26, margin: 0 }}>Receitas</h1>
            <div style={{ color: T.sub, fontSize: 14 }}>Acompanhe todas as receitas da empresa selecionada.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <CompetenciaSelector {...comp} onChange={setComp} />
          <Btn variant="ghost" icon="↑">Exportar</Btn>
          <Btn icon="+" onClick={openNew}>Nova receita</Btn>
        </div>
      </div>

      {/* Filters */}
      <FilterBar>
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center', color: T.sub }}>
          📅 01/05/2026 - 31/05/2026 <span style={{ fontSize: 11 }}>▾</span>
        </div>
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center', color: T.sub }}>
          💳 Todas as contas <span style={{ fontSize: 11 }}>▾</span>
        </div>
        <select value={fCat} onChange={e => setFCat(e.target.value)} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 14px', fontSize: 13, color: T.sub, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
          <option value="">🏷 Todas as categorias</option>
          {CATS_RECEITA.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 14px', fontSize: 13, color: T.sub, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
          <option value="">👤 Todos os clientes</option>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ color: T.primary, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginLeft: 'auto' }}>⚙ Filtros avançados</span>
      </FilterBar>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard icon="$" iconBg={T.greenL} label="Total de receitas" value={fmt(tTotal)} delta={18.2} />
        <KpiCard icon="💳" iconBg={T.blueL} label="Receitas recebidas" value={fmt(tRec)} delta={16.8} />
        <KpiCard icon="📅" iconBg={T.purpleL} label="A receber" value={fmt(tPrev)} delta={22.4} />
        <KpiCard icon="⏰" iconBg={T.orangeL} label="Atrasadas" value={fmt(tAtr)} delta={-8.7} />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Evolução das receitas</div>
            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, color: T.sub }}>Este mês ▾</div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={evolData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.green} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={T.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="dia" tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.muted, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} />
              <Tooltip formatter={v => fmt(v)} contentStyle={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="v" stroke={T.green} strokeWidth={2.5} fill="url(#gradR)" dot={{ r: 4, fill: T.green }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Receitas por categoria</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <PieChart width={140} height={140}>
                <Pie data={catData} cx={70} cy={70} innerRadius={42} outerRadius={65} dataKey="pct" startAngle={90} endAngle={-270}>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </PieChart>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 11, color: T.muted }}>Total</div>
                <div style={{ fontWeight: 800, fontSize: 14, color: T.text }}>{fmtS(tTotal)}</div>
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

      {/* Table */}
      <Card>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Receitas lançadas</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar receita..." />
            <Btn variant="ghost" sm>≡ Colunas</Btn>
            <Btn variant="ghost" sm>⇅ Ordenar</Btn>
          </div>
        </div>
        <Table columns={columns} data={filtered} onRow={openEdit}
          emptyState={<EmptyState icon="💰" title="Nenhuma receita" sub="Cadastre sua primeira receita" action={<Btn onClick={openNew}>+ Nova receita</Btn>} />} />
        <div style={{ padding: '12px 18px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: T.sub }}>
          <span>Mostrando 1 a {filtered.length} de {filtered.length} receitas</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>‹</button>
            <button style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontWeight: 600 }}>1</button>
            <button style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>›</button>
          </div>
        </div>
      </Card>

      {/* Modal */}
      {showModal && (
        <Modal title={editItem ? 'Editar receita' : 'Nova receita'} onClose={() => setShowModal(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>Valor</label>
              <div style={{ border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: T.greenL, color: T.green, borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 700 }}>R$</span>
                <input type="number" step="0.01" value={form.valor} onChange={e => sf('valor', e.target.value)} placeholder="0,00" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 20, fontWeight: 700, color: T.green, fontFamily: 'inherit', background: 'transparent' }} />
              </div>
            </div>
            <Input label="Descrição" value={form.desc || ''} onChange={e => sf('desc', e.target.value)} placeholder="Ex.: Venda de imóvel" />
            <Input label="Cliente" value={form.cliente || ''} onChange={e => sf('cliente', e.target.value)} placeholder="Nome do cliente" />
            <Select label="Categoria" value={form.cat || ''} onChange={e => { const c = CATS_RECEITA.find(x => x.id === e.target.value); sf('cat', e.target.value); sf('catNome', c?.nome || '') }} placeholder="Selecionar..." options={CATS_RECEITA.map(c => ({ value: c.id, label: c.nome }))} />
            <Select label="Status" value={form.status || ''} onChange={e => sf('status', e.target.value)} options={STATUS_OPTS} />
            <Input label="Data" type="date" value={form.data || ''} onChange={e => sf('data', e.target.value)} />
            <Input label="Vencimento" type="date" value={form.vencimento || ''} onChange={e => sf('vencimento', e.target.value)} />
            <Select label="Conta" value={form.conta || ''} onChange={e => sf('conta', e.target.value)} options={CONTAS.map(c => c.nome)} />
            <Input label="Centro de Custo" value={form.centroCusto || ''} onChange={e => sf('centroCusto', e.target.value)} placeholder="Ex.: Comercial" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <Btn full variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn full onClick={salvar}>Salvar receita</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
