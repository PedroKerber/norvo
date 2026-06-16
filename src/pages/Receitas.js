import { useState, useMemo, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { T, fmt, fmtS, fd, uid } from '../theme'
import { CATS_RECEITA, CONTAS } from '../data'
import { Card, Btn, Badge, StatusBadge, KpiCard, Toast, Confirm, SearchInput, FilterBar, Table, EmptyState } from '../components/ui'
import CompetenciaSelector, { COMPETENCIA_DEFAULT, filterByCompetencia } from '../components/CompetenciaSelector'

const COLORS = ['#16a34a', '#2563eb', '#7c3aed', '#ea580c', '#0891b2', '#9ca3af']
const FORMAS_REC  = ['PIX', 'Boleto', 'Transferência', 'Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'Cheque']
const ORIGENS     = ['Venda Direta', 'Site / Plataforma', 'Indicação', 'Parceiro Comercial', 'Contrato', 'Outro']
const FREQUENCIAS = ['Mensal', 'Quinzenal', 'Semanal', 'Trimestral', 'Semestral', 'Anual']

const CAT_CENTRO = {
  venda_imoveis:     'Comercial',
  locacao:           'Comercial',
  alugueis:          'Comercial',
  comissoes:         'Comercial',
  consultoria:       'Consultoria',
  prestacao_servicos:'Operacional',
  outras_receitas:   'Administrativo',
}

const CAT_PLANO = {
  venda_imoveis:     '3.1.1 - Receitas de Vendas',
  locacao:           '3.1.2 - Receitas de Locação',
  alugueis:          '3.1.3 - Receitas de Aluguéis',
  comissoes:         '3.2.1 - Comissões',
  consultoria:       '3.2.2 - Consultoria',
  prestacao_servicos:'3.3.1 - Serviços Prestados',
  outras_receitas:   '3.9.1 - Outras Receitas',
}

const TODAY       = new Date().toISOString().slice(0, 10)
const CURRENT_MES = TODAY.slice(0, 7)

function maskR(raw) {
  const digits = String(raw).replace(/\D/g, '')
  const num = parseInt(digits || '0', 10)
  return (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseR(masked) {
  return parseFloat(String(masked).replace(/\./g, '').replace(',', '.')) || 0
}

function iStyle(err) {
  return {
    display: 'block', width: '100%', background: 'var(--card)',
    border: `1.5px solid ${err ? T.red : 'var(--border)'}`,
    borderRadius: 8, padding: '9px 12px', color: 'var(--text)',
    fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
}

function SLabel({ children }) {
  return <div style={{ fontWeight: 600, fontSize: 11, color: 'var(--text-sub)', marginBottom: 4, letterSpacing: '.02em' }}>{children}</div>
}

function Err({ msg }) {
  return <div style={{ color: T.red, fontSize: 11, marginTop: 3 }}>⚠ {msg}</div>
}

function SecHead({ num, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
      <span style={{ color, fontWeight: 700, fontSize: 11 }}>{num}.</span>
      <span style={{ color, fontWeight: 700, fontSize: 11, letterSpacing: '.06em' }}>{label}</span>
    </div>
  )
}

function newForm() {
  return {
    desc: '', cat: '', catNome: '', centroCusto: '', projeto: '', planoContas: '',
    cliente: '', clienteCpfCnpj: '', clienteTel: '', clienteEmail: '',
    contaBancaria: CONTAS[0]?.nome || '',
    formaRecebimento: 'PIX',
    status: 'A receber',
    vencimento: TODAY, data: TODAY,
    tipo: 'recorrente', frequencia: 'Mensal',
    numDocumento: '', origem: '', contrato: '', competencia: CURRENT_MES,
    obsInterna: '', obs: '', anexos: [],
    valorMasked: '',
  }
}

export default function Receitas({ empresa, data, onSave, onDelete }) {
  // List state
  const [comp, setComp] = useState(COMPETENCIA_DEFAULT)
  const [search, setSearch] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fCat, setFCat] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [toast, setToast] = useState(null)

  // Form overlay state
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(newForm)
  const [errors, setErrors] = useState({})
  const [nfScanning, setNfScanning] = useState(false)
  const fileRef = useRef(null)
  const nfRef   = useRef(null)

  // Marcar como Recebida
  const [recModal, setRecModal] = useState(null)
  const [recForm, setRecForm]   = useState({ dataRecebimento: TODAY, valorRecebido: '', contaBancaria: CONTAS[0]?.nome || '', obsRec: '' })

  // Novo Cliente
  const [showNovoCliente, setShowNovoCliente] = useState(false)
  const [clienteForm, setClienteForm]         = useState({ nome: '', cpfCnpj: '', tel: '', email: '' })

  // Derived data
  const allLancs = (data.lancamentos || []).filter(l => l.tipo === 'receita')
  const lancs    = useMemo(() => filterByCompetencia(allLancs, comp), [allLancs, comp])

  const filtered = useMemo(() => {
    let l = [...lancs].sort((a, b) => (b.vencimento || b.data || '').localeCompare(a.vencimento || a.data || ''))
    if (search) l = l.filter(x => [x.desc, x.catNome, x.cliente].filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase())))
    if (fStatus) l = l.filter(x => x.status === fStatus)
    if (fCat)    l = l.filter(x => x.cat === fCat)
    return l
  }, [lancs, search, fStatus, fCat])

  const tTotal = lancs.reduce((s, l) => s + l.valor, 0)
  const tRec   = lancs.filter(l => l.status === 'Recebida').reduce((s, l) => s + l.valor, 0)
  const tPrev  = lancs.filter(l => l.status === 'A receber').reduce((s, l) => s + l.valor, 0)
  const tAtr   = lancs.filter(l => l.status === 'Atrasada').reduce((s, l) => s + l.valor, 0)

  const catData = useMemo(() => {
    const map = {}
    lancs.forEach(l => { map[l.catNome] = (map[l.catNome] || 0) + l.valor })
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1
    return Object.entries(map).map(([n, v]) => ({ n, v, pct: Math.round(v / total * 100) })).sort((a, b) => b.v - a.v)
  }, [lancs])

  const evolData = useMemo(() => {
    const [ano, mes] = (comp.mesAno || TODAY.slice(0, 7)).split('-')
    const days = ['01', '05', '10', '12', '15', '18', '20', '22', '25', '30']
    return days.map(d => {
      const dt = `${ano}-${mes}-${d}`
      const v = lancs.filter(l => l.data <= dt && l.status === 'Recebida').reduce((s, l) => s + l.valor, 0)
      return { dia: `${d}/${mes}`, v }
    })
  }, [lancs, comp.mesAno])

  // Form helpers
  const sf  = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const srf = (k, v) => setRecForm(f => ({ ...f, [k]: v }))
  const scf = (k, v) => setClienteForm(f => ({ ...f, [k]: v }))

  const openNew = () => {
    setEditItem(null)
    setForm(newForm())
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    const masked = (item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    setForm({ ...newForm(), ...item, valorMasked: masked })
    setErrors({})
    setShowForm(true)
  }

  const validar = () => {
    const e = {}
    if (!form.desc.trim()) e.desc = 'Informe a descrição'
    if (!form.valorMasked || parseR(form.valorMasked) <= 0) e.valor = 'Informe o valor'
    if (!form.vencimento) e.vencimento = 'Informe o vencimento'
    if (!form.cat) e.cat = 'Selecione uma categoria'
    return e
  }

  const buildItem = (extra = {}) => {
    const cat = CATS_RECEITA.find(c => c.id === form.cat)
    return {
      ...form,
      id: editItem ? editItem.id : uid(),
      tipo: 'receita',
      catNome: cat?.nome || form.catNome || 'Receita',
      valor: parseR(form.valorMasked),
      empId: empresa.id,
      ...extra,
    }
  }

  const salvar = () => {
    const e = validar()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave(buildItem(), !!editItem)
    setShowForm(false)
    setToast({ msg: editItem ? 'Receita atualizada!' : 'Receita cadastrada!', type: 'success' })
  }

  const salvarRascunho = () => {
    if (!form.desc.trim()) { setErrors({ desc: 'Informe ao menos a descrição' }); return }
    onSave(buildItem({ rascunho: true, valor: parseR(form.valorMasked) || 0 }), !!editItem)
    setShowForm(false)
    setToast({ msg: 'Rascunho salvo!', type: 'success' })
  }

  const salvarENovo = () => {
    const e = validar()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave(buildItem(), !!editItem)
    setEditItem(null)
    setForm(newForm())
    setErrors({})
    setToast({ msg: 'Receita cadastrada!', type: 'success' })
  }

  const duplicarItem = (item) => {
    const masked = (item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    setEditItem(null)
    setForm({ ...newForm(), ...item, valorMasked: masked, status: 'A receber', vencimento: TODAY, data: TODAY })
    setErrors({})
    setShowForm(true)
  }

  // Marcar como Recebida
  const abrirReceber = (item) => {
    const masked = (item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    setRecModal(item)
    setRecForm({ dataRecebimento: TODAY, valorRecebido: masked, contaBancaria: CONTAS[0]?.nome || '', obsRec: '' })
  }

  const confirmarRecebimento = () => {
    if (!recModal) return
    onSave({
      ...recModal,
      status: 'Recebida',
      dataRecebimento: recForm.dataRecebimento,
      valorRecebido: parseR(recForm.valorRecebido),
      contaBancariaRec: recForm.contaBancaria,
      obsRec: recForm.obsRec,
    }, true)
    setRecModal(null)
    setToast({ msg: 'Receita marcada como recebida!', type: 'success' })
  }

  // Novo Cliente
  const salvarCliente = () => {
    if (!clienteForm.nome.trim()) return
    sf('cliente', clienteForm.nome)
    sf('clienteCpfCnpj', clienteForm.cpfCnpj)
    sf('clienteTel', clienteForm.tel)
    sf('clienteEmail', clienteForm.email)
    setShowNovoCliente(false)
    setClienteForm({ nome: '', cpfCnpj: '', tel: '', email: '' })
  }

  // Anexos
  const addAnexos = (e) => {
    const files = Array.from(e.target.files || [])
    const novos = files.map(f => ({ name: f.name, size: f.size, type: f.type, url: URL.createObjectURL(f) }))
    sf('anexos', [...(form.anexos || []), ...novos])
    e.target.value = ''
  }

  const removerAnexo = (i) => {
    sf('anexos', (form.anexos || []).filter((_, idx) => idx !== i))
  }

  // Ler NF
  const lerNF = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNfScanning(true)
    const url = URL.createObjectURL(file)
    setTimeout(() => {
      setNfScanning(false)
      setForm(f => ({
        ...f,
        desc: 'NF - ' + file.name.replace(/\.[^.]+$/, ''),
        cliente: 'Cliente identificado pela NF',
        valorMasked: '5.000,00',
        cat: 'prestacao_servicos',
        catNome: 'Prestação de Serviços',
        centroCusto: CAT_CENTRO['prestacao_servicos'],
        planoContas: CAT_PLANO['prestacao_servicos'],
        numDocumento: 'NF-' + Date.now().toString().slice(-4),
        vencimento: TODAY, data: TODAY,
        anexos: [...(f.anexos || []), { name: file.name, size: file.size, type: file.type, url }],
      }))
      setToast({ msg: 'Nota fiscal lida! Verifique e ajuste os campos.', type: 'success' })
    }, 2000)
    e.target.value = ''
  }

  // Máscaras
  const handleValor = (e) => {
    const raw = e.target.value.replace(/\D/g, '')
    sf('valorMasked', maskR(raw))
    if (errors.valor) setErrors(p => ({ ...p, valor: '' }))
  }

  const handleRecValor = (e) => {
    srf('valorRecebido', maskR(e.target.value.replace(/\D/g, '')))
  }

  // Table columns
  const columns = [
    { key: 'vencimento', label: 'Vencimento', render: (v, row) => <span style={{ fontSize: 13, color: row.status === 'Atrasada' ? T.red : 'var(--text)' }}>{fd(v || row.data)}</span> },
    { key: 'desc', label: 'Descrição', render: v => <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span> },
    { key: 'cliente', label: 'Cliente', render: v => <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{v || '—'}</span> },
    { key: 'catNome', label: 'Categoria', render: (v, row) => { const ci = CATS_RECEITA.findIndex(c => c.id === row.cat); const cor = COLORS[ci >= 0 ? ci % COLORS.length : 0]; return <Badge label={v} color={cor} /> } },
    { key: 'centroCusto', label: 'Centro', render: v => <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>{v || '—'}</span> },
    { key: 'valor', label: 'Valor', render: (v, row) => <span style={{ fontWeight: 700, fontSize: 14, color: row.status === 'Atrasada' ? T.red : T.green }}>{fmt(v)}</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    {
      key: 'id', label: 'Ações', render: (_, row) => (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {row.status !== 'Recebida' && row.status !== 'Cancelada' && (
            <button onClick={e => { e.stopPropagation(); abrirReceber(row) }}
              style={{ background: 'none', border: `1px solid ${T.green}`, color: T.green, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
              Receber
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); duplicarItem(row) }} title="Duplicar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub)', fontSize: 14, padding: '2px 4px' }}>⧉</button>
          <button onClick={e => { e.stopPropagation(); openEdit(row) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub)', fontSize: 14, padding: '2px 4px' }}>✏️</button>
          <button onClick={e => { e.stopPropagation(); setConfirm(row) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.red, fontSize: 14, padding: '2px 4px' }}>🗑</button>
        </div>
      )
    },
  ]

  const valorNum  = parseR(form.valorMasked)
  const resumoCat = CATS_RECEITA.find(c => c.id === form.cat)
  const hasErrors = Object.values(errors).some(Boolean)

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: 'var(--text)' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {confirm && (
        <Confirm
          msg={`Excluir "${confirm.desc}"?`}
          onYes={() => { onDelete(confirm.id); setConfirm(null); setToast({ msg: 'Receita excluída!', type: 'success' }) }}
          onNo={() => setConfirm(null)}
        />
      )}

      {/* ── LISTA ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: T.greenL, borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: T.green }}>↑</div>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 26, margin: 0 }}>Receitas</h1>
            <div style={{ color: 'var(--text-sub)', fontSize: 14 }}>Acompanhe todas as receitas da empresa selecionada.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <CompetenciaSelector {...comp} onChange={setComp} />
          <Btn variant="ghost" icon="↑">Exportar</Btn>
          <Btn icon="+" onClick={openNew}>Nova receita</Btn>
        </div>
      </div>

      <FilterBar>
        <select value={fCat} onChange={e => setFCat(e.target.value)} style={{ background: 'var(--card)', border: `1px solid var(--border)`, borderRadius: 8, padding: '7px 14px', fontSize: 13, color: 'var(--text-sub)', outline: 'none', fontFamily: 'inherit' }}>
          <option value="">🏷 Todas as categorias</option>
          {CATS_RECEITA.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ background: 'var(--card)', border: `1px solid var(--border)`, borderRadius: 8, padding: '7px 14px', fontSize: 13, color: 'var(--text-sub)', outline: 'none', fontFamily: 'inherit' }}>
          <option value="">📌 Todos os status</option>
          {['Recebida', 'A receber', 'Atrasada', 'Cancelada'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </FilterBar>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard icon="$"  iconBg={T.greenL}  label="Total de receitas"    value={fmt(tTotal)} />
        <KpiCard icon="💳" iconBg={T.blueL}   label="Receitas recebidas"   value={fmt(tRec)} />
        <KpiCard icon="📅" iconBg={T.purpleL} label="A receber"            value={fmt(tPrev)} />
        <KpiCard icon="⏰" iconBg={T.orangeL} label="Atrasadas"            value={fmt(tAtr)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Evolução das receitas</div>
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
              <Tooltip formatter={v => fmt(v)} contentStyle={{ background: 'var(--card)', border: `1px solid var(--border)`, borderRadius: 8, fontSize: 12 }} />
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
                <div style={{ fontWeight: 800, fontSize: 14, color: T.green }}>{fmtS(tTotal)}</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {catData.map((d, i) => (
                <div key={d.n} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span>{d.n}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ color: T.muted }}>{d.pct}%</span>
                    <span style={{ fontWeight: 600, minWidth: 75, textAlign: 'right' }}>{fmt(d.v)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid var(--border)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Receitas lançadas</div>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar receita..." />
        </div>
        <Table columns={columns} data={filtered} onRow={openEdit}
          emptyState={<EmptyState icon="💰" title="Nenhuma receita" sub="Cadastre sua primeira receita" action={<Btn onClick={openNew}>+ Nova receita</Btn>} />} />
        <div style={{ padding: '12px 18px', borderTop: `1px solid var(--border)`, fontSize: 13, color: 'var(--text-sub)' }}>
          Mostrando {filtered.length} receita{filtered.length !== 1 ? 's' : ''}
        </div>
      </Card>

      {/* ── FORM OVERLAY ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 2000, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Header fixo */}
          <div style={{ background: 'var(--card)', borderBottom: `1px solid var(--border)`, padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10, boxShadow: 'var(--shadow)' }}>
            <div style={{ background: T.greenL, borderRadius: 10, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: T.green, flexShrink: 0 }}>↑</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>{editItem ? 'Editar Receita' : 'Nova Receita'}</div>
              <div style={{ color: 'var(--text-sub)', fontSize: 13 }}>Preencha os dados para registrar uma nova receita</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
              <input ref={nfRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.xml" style={{ display: 'none' }} onChange={lerNF} />
              <Btn variant="outline" onClick={() => nfRef.current?.click()} disabled={nfScanning}>
                {nfScanning ? '⏳ Lendo NF...' : '📷 Ler Nota Fiscal'}
              </Btn>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-sub)', lineHeight: 1, padding: 4 }}>✕</button>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, padding: '24px 28px', display: 'flex', gap: 20, alignItems: 'flex-start', maxWidth: 1380, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

            {/* Formulário principal */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

              {/* Linha 1 — Seções 1, 2, 3 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

                {/* Seção 1 — Informações Gerais */}
                <div style={{ background: 'var(--card)', borderRadius: 12, border: `1px solid var(--border)`, padding: 20 }}>
                  <SecHead num={1} label="INFORMAÇÕES GERAIS" color={T.green} />

                  {/* Valor em destaque */}
                  <SLabel>Valor da Receita *</SLabel>
                  <div style={{ display: 'flex', alignItems: 'center', border: `2px solid ${errors.valor ? T.red : T.green}`, borderRadius: 10, padding: '10px 14px', background: 'var(--bg)', marginBottom: 4 }}>
                    <span style={{ color: T.green, fontSize: 14, fontWeight: 700, marginRight: 6, flexShrink: 0 }}>R$</span>
                    <input
                      type="text" inputMode="numeric"
                      value={form.valorMasked}
                      onChange={handleValor}
                      placeholder="0,00"
                      style={{ flex: 1, border: 'none', outline: 'none', fontSize: 28, fontWeight: 800, color: T.green, fontFamily: 'inherit', background: 'transparent', width: '100%', minWidth: 0 }}
                    />
                  </div>
                  {errors.valor && <Err msg={errors.valor} />}

                  <div style={{ marginTop: 14 }}>
                    <SLabel>Descrição *</SLabel>
                    <input
                      value={form.desc}
                      onChange={e => { sf('desc', e.target.value); if (errors.desc) setErrors(p => ({ ...p, desc: '' })) }}
                      placeholder="Ex.: Recebimento de aluguel, venda de serviço..."
                      style={iStyle(errors.desc)}
                    />
                    {errors.desc && <Err msg={errors.desc} />}
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <SLabel>Empresa *</SLabel>
                    <div style={{ ...iStyle(), display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg)', color: 'var(--text-sub)', cursor: 'default' }}>
                      🏢 <span>{empresa.nome}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <SLabel>Categoria *</SLabel>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={form.cat}
                        onChange={e => {
                          const cat = CATS_RECEITA.find(c => c.id === e.target.value)
                          sf('cat', e.target.value)
                          sf('catNome', cat?.nome || '')
                          if (CAT_CENTRO[e.target.value]) sf('centroCusto', CAT_CENTRO[e.target.value])
                          if (CAT_PLANO[e.target.value])  sf('planoContas', CAT_PLANO[e.target.value])
                          if (errors.cat) setErrors(p => ({ ...p, cat: '' }))
                        }}
                        style={{ ...iStyle(errors.cat), appearance: 'none', paddingRight: 28 }}
                      >
                        <option value="">Selecione uma categoria</option>
                        {CATS_RECEITA.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 12 }}>▾</span>
                    </div>
                    {errors.cat && <Err msg={errors.cat} />}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                    <div>
                      <SLabel>Centro de Custo</SLabel>
                      <input value={form.centroCusto} onChange={e => sf('centroCusto', e.target.value)} placeholder="Comercial" style={iStyle()} />
                    </div>
                    <div>
                      <SLabel>Projeto</SLabel>
                      <div style={{ position: 'relative' }}>
                        <input value={form.projeto} onChange={e => sf('projeto', e.target.value)} placeholder="Opcional" style={{ ...iStyle(), paddingRight: 28 }} />
                        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 12 }}>▾</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seção 2 — Financeiro */}
                <div style={{ background: 'var(--card)', borderRadius: 12, border: `1px solid var(--border)`, padding: 20 }}>
                  <SecHead num={2} label="FINANCEIRO" color={T.blue} />

                  {/* Cliente */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <SLabel>Cliente *</SLabel>
                    <button onClick={() => setShowNovoCliente(true)} style={{ background: 'none', border: `1px solid ${T.primary}`, color: T.primary, borderRadius: 7, padding: '3px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
                      + Novo Cliente
                    </button>
                  </div>
                  <input value={form.cliente} onChange={e => sf('cliente', e.target.value)} placeholder="Busque por nome ou CNPJ" style={iStyle()} />

                  {/* Tipo de Receita — cards */}
                  <div style={{ marginTop: 14 }}>
                    <SLabel>Tipo de Receita *</SLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                      {[
                        { key: 'recorrente', icon: '🔄', label: 'Receita Recorrente', desc: 'Receitas que se repetem periodicamente.' },
                        { key: 'avulsa',     icon: '⚡', label: 'Receita Avulsa',     desc: 'Receitas únicas, sem recorrência definida.' },
                      ].map(t => (
                        <div
                          key={t.key}
                          onClick={() => sf('tipo', t.key)}
                          style={{
                            border: `2px solid ${form.tipo === t.key ? T.green : 'var(--border)'}`,
                            borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                            background: form.tipo === t.key ? 'var(--green-light)' : 'var(--bg)',
                            transition: 'all .15s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${form.tipo === t.key ? T.green : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {form.tipo === t.key && <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.green }} />}
                            </div>
                            <span style={{ fontWeight: 700, fontSize: 12, color: form.tipo === t.key ? T.green : 'var(--text)' }}>{t.icon} {t.label}</span>
                          </div>
                          <div style={{ fontSize: 11, color: form.tipo === t.key ? T.green : 'var(--text-muted)', paddingLeft: 22 }}>{t.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Frequência (só se recorrente) */}
                  {form.tipo === 'recorrente' && (
                    <div style={{ marginTop: 10 }}>
                      <SLabel>Frequência</SLabel>
                      <div style={{ position: 'relative' }}>
                        <select value={form.frequencia} onChange={e => sf('frequencia', e.target.value)} style={{ ...iStyle(), appearance: 'none', paddingRight: 28 }}>
                          {FREQUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 12 }}>▾</span>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                    <div>
                      <SLabel>Forma de Recebimento</SLabel>
                      <div style={{ position: 'relative' }}>
                        <select value={form.formaRecebimento} onChange={e => sf('formaRecebimento', e.target.value)} style={{ ...iStyle(), appearance: 'none', paddingRight: 28 }}>
                          <option value="">Selecione</option>
                          {FORMAS_REC.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 12 }}>▾</span>
                      </div>
                    </div>
                    <div>
                      <SLabel>Conta Bancária *</SLabel>
                      <div style={{ position: 'relative' }}>
                        <select value={form.contaBancaria} onChange={e => sf('contaBancaria', e.target.value)} style={{ ...iStyle(), appearance: 'none', paddingRight: 28 }}>
                          <option value="">Selecione</option>
                          {CONTAS.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                        </select>
                        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 12 }}>▾</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <SLabel>Status *</SLabel>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {['A receber', 'Recebida', 'Atrasada', 'Cancelada'].map(s => {
                        const col = s === 'Recebida' ? T.green : s === 'A receber' ? T.blue : s === 'Atrasada' ? T.red : T.muted
                        return (
                          <button key={s} onClick={() => sf('status', s)} style={{
                            padding: '7px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                            fontFamily: 'inherit', cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
                            border: form.status === s ? 'none' : `1.5px solid var(--border)`,
                            background: form.status === s ? col : 'var(--bg)',
                            color: form.status === s ? '#fff' : 'var(--text-sub)',
                          }}>{s}</button>
                        )
                      })}
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <SLabel>Data de Vencimento *</SLabel>
                    <input type="date" value={form.vencimento}
                      onChange={e => { sf('vencimento', e.target.value); sf('data', e.target.value); if (errors.vencimento) setErrors(p => ({ ...p, vencimento: '' })) }}
                      style={iStyle(errors.vencimento)} />
                    {errors.vencimento && <Err msg={errors.vencimento} />}
                  </div>

                  <div style={{ marginTop: 10, background: 'var(--blue-light)', borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.blue}20`, fontSize: 12, color: T.blue, lineHeight: 1.5 }}>
                    A data de recebimento será registrada automaticamente quando a receita for marcada como recebida.
                  </div>
                </div>

                {/* Seção 3 — Detalhes */}
                <div style={{ background: 'var(--card)', borderRadius: 12, border: `1px solid var(--border)`, padding: 20 }}>
                  <SecHead num={3} label="DETALHES" color={T.purple} />

                  <SLabel>Número do Documento</SLabel>
                  <input value={form.numDocumento} onChange={e => sf('numDocumento', e.target.value)} placeholder="Ex: NF-12345, REC-0001, etc." style={iStyle()} />

                  <div style={{ marginTop: 12 }}>
                    <SLabel>Origem</SLabel>
                    <div style={{ position: 'relative' }}>
                      <select value={form.origem} onChange={e => sf('origem', e.target.value)} style={{ ...iStyle(), appearance: 'none', paddingRight: 28 }}>
                        <option value="">Selecione a origem da receita</option>
                        {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 12 }}>▾</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <SLabel>Plano de Contas</SLabel>
                    <div style={{ position: 'relative' }}>
                      <select value={form.planoContas} onChange={e => sf('planoContas', e.target.value)} style={{ ...iStyle(), appearance: 'none', paddingRight: 28 }}>
                        <option value="">Selecione uma conta</option>
                        {Object.values(CAT_PLANO).filter((v, i, a) => a.indexOf(v) === i).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 12 }}>▾</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <SLabel>Contrato Vinculado (Opcional)</SLabel>
                    <div style={{ position: 'relative' }}>
                      <input value={form.contrato} onChange={e => sf('contrato', e.target.value)} placeholder="Selecione um contrato" style={{ ...iStyle(), paddingRight: 28 }} />
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 12 }}>▾</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <SLabel>Competência</SLabel>
                    <input type="month" value={form.competencia} onChange={e => sf('competencia', e.target.value)} style={iStyle()} />
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <SLabel>Observação Interna</SLabel>
                    <textarea
                      value={form.obsInterna}
                      onChange={e => sf('obsInterna', e.target.value)}
                      placeholder="Observação interna para controle..."
                      rows={4}
                      style={{ ...iStyle(), resize: 'none', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>
              </div>

              {/* Linha 2 — Seções 4, 5 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                {/* Seção 4 — Observações */}
                <div style={{ background: 'var(--card)', borderRadius: 12, border: `1px solid var(--border)`, padding: 20 }}>
                  <SecHead num={4} label="OBSERVAÇÕES" color={T.cyan} />
                  <SLabel>Observações</SLabel>
                  <textarea
                    value={form.obs}
                    onChange={e => sf('obs', e.target.value)}
                    placeholder="Adicione observações sobre esta receita..."
                    rows={6}
                    maxLength={500}
                    style={{ ...iStyle(), resize: 'none', fontFamily: 'inherit' }}
                  />
                  <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{(form.obs || '').length}/500</div>
                </div>

                {/* Seção 5 — Anexos */}
                <div style={{ background: 'var(--card)', borderRadius: 12, border: `1px solid var(--border)`, padding: 20 }}>
                  <SecHead num={5} label="ANEXOS" color={T.yellow} />
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.xml" multiple style={{ display: 'none' }} onChange={addAnexos} />
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div
                      onClick={() => fileRef.current?.click()}
                      style={{ border: `2px dashed var(--border)`, borderRadius: 10, padding: '20px 18px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 170, color: 'var(--text-muted)', fontSize: 13, transition: 'border-color .15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = T.green}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div style={{ fontSize: 26 }}>☁</div>
                      <div style={{ textAlign: 'center', fontSize: 12, lineHeight: 1.5 }}>
                        Arraste e solte arquivos aqui<br />
                        ou <span style={{ color: T.green, fontWeight: 600 }}>clique para selecionar</span><br />
                        <span style={{ fontSize: 11 }}>PDF, JPG, PNG até 10MB cada</span>
                      </div>
                    </div>
                    {(form.anexos || []).map((a, i) => {
                      const isImg = a.type?.startsWith('image/')
                      return (
                        <div key={i} style={{ position: 'relative', width: 88 }}>
                          <div style={{ width: 88, height: 76, borderRadius: 8, border: `1px solid var(--border)`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
                            {isImg
                              ? <img src={a.url} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ textAlign: 'center', fontSize: 26 }}>{a.type === 'application/pdf' ? '📄' : '📎'}</div>
                            }
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-sub)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                          <button onClick={() => removerAnexo(i)} style={{ position: 'absolute', top: -7, right: -7, background: T.red, color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>✕</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar direita */}
            <div style={{ width: 264, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 84 }}>

              {/* Card de resumo */}
              <div style={{ background: 'var(--card)', borderRadius: 12, border: `1px solid var(--border)`, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 14, color: 'var(--text-sub)', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  📋 RESUMO DA RECEITA
                </div>

                {[
                  { label: 'Empresa',         val: empresa.nome },
                  { label: 'Categoria',        val: resumoCat?.nome || '—' },
                  { label: 'Cliente',          val: form.cliente || '—' },
                  { label: 'Centro de Custo',  val: form.centroCusto || '—' },
                  { label: 'Valor',            val: valorNum > 0 ? fmt(valorNum) : '—', col: T.green, w: 800 },
                  { label: 'Status',           val: form.status, isStatus: true },
                  { label: 'Vencimento',       val: fd(form.vencimento) || '—' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-sub)', flexShrink: 0, marginRight: 8 }}>{r.label}</span>
                    {r.isStatus
                      ? <StatusBadge status={r.val} />
                      : <span style={{ fontWeight: r.w || 500, color: r.col || 'var(--text)', textAlign: 'right', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.val}</span>
                    }
                  </div>
                ))}

                {/* Tipo como badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-sub)' }}>Tipo</span>
                  <span style={{ background: form.tipo === 'recorrente' ? T.greenL : T.blueL, color: form.tipo === 'recorrente' ? T.green : T.blue, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                    {form.tipo === 'recorrente' ? '🔄 Recorrente' : '⚡ Avulsa'}
                  </span>
                </div>

                {/* Recebimento: só exibe quando status = Recebida e dataRecebimento existe */}
                {form.status === 'Recebida' && form.dataRecebimento && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-sub)' }}>Recebimento</span>
                    <span style={{ color: T.green, fontWeight: 600 }}>{fd(form.dataRecebimento)}</span>
                  </div>
                )}

                {hasErrors && (
                  <div style={{ marginTop: 12, background: 'var(--red-light)', borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.red}30` }}>
                    <div style={{ fontWeight: 700, color: T.red, marginBottom: 3, fontSize: 12 }}>⚠ Campos obrigatórios</div>
                    <div style={{ color: 'var(--text-sub)', fontSize: 12 }}>Preencha os campos marcados com * para salvar.</div>
                  </div>
                )}
              </div>

              {/* Dica */}
              <div style={{ background: 'var(--yellow-light)', borderRadius: 12, border: `1px solid ${T.yellow}30`, padding: 16 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: T.yellow, marginBottom: 4 }}>Dica</div>
                    <div style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.6 }}>
                      Após salvar, você poderá marcar esta receita como recebida quando o pagamento for realizado.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer fixo */}
          <div style={{ background: 'var(--card)', borderTop: `1px solid var(--border)`, padding: '14px 28px', display: 'flex', gap: 10, alignItems: 'center', position: 'sticky', bottom: 0, zIndex: 10 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Btn>
            {editItem && <Btn variant="ghost" onClick={() => duplicarItem(editItem)}>⧉ Duplicar Receita</Btn>}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
              <Btn variant="ghost" style={{ borderColor: T.yellow, color: T.yellow }} onClick={salvarRascunho}>💾 Salvar Rascunho</Btn>
              <Btn variant="ghost" onClick={salvarENovo}>+ Salvar e Novo</Btn>
              <Btn variant="primary" onClick={salvar}>✓ Salvar e Fechar</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR RECEBIMENTO ── */}
      {recModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--card)', borderRadius: 14, width: '100%', maxWidth: 460, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '20px 22px', borderBottom: `1px solid var(--border)`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: T.greenL, borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: T.green, flexShrink: 0 }}>✓</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Registrar Recebimento</div>
                <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>{recModal.desc} · {fmt(recModal.valor)}</div>
              </div>
              <button onClick={() => setRecModal(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-sub)' }}>✕</button>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <SLabel>Data de Recebimento *</SLabel>
                <input type="date" value={recForm.dataRecebimento} onChange={e => srf('dataRecebimento', e.target.value)} style={iStyle()} />
              </div>
              <div>
                <SLabel>Valor Recebido *</SLabel>
                <div style={{ display: 'flex', alignItems: 'center', border: `2px solid var(--border)`, borderRadius: 10, padding: '10px 14px', background: 'var(--bg)' }}>
                  <span style={{ color: 'var(--text-sub)', fontSize: 14, fontWeight: 700, marginRight: 6 }}>R$</span>
                  <input
                    type="text" inputMode="numeric"
                    value={recForm.valorRecebido}
                    onChange={handleRecValor}
                    placeholder="0,00"
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 22, fontWeight: 700, color: T.green, fontFamily: 'inherit', background: 'transparent' }}
                  />
                </div>
              </div>
              <div>
                <SLabel>Conta Bancária Utilizada</SLabel>
                <div style={{ position: 'relative' }}>
                  <select value={recForm.contaBancaria} onChange={e => srf('contaBancaria', e.target.value)} style={{ ...iStyle(), appearance: 'none', paddingRight: 28 }}>
                    <option value="">Selecione</option>
                    {CONTAS.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </select>
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 12 }}>▾</span>
                </div>
              </div>
              <div>
                <SLabel>Observação</SLabel>
                <textarea value={recForm.obsRec} onChange={e => srf('obsRec', e.target.value)} placeholder="Observações sobre o recebimento..." rows={3}
                  style={{ ...iStyle(), resize: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <Btn full variant="ghost" onClick={() => setRecModal(null)}>Cancelar</Btn>
                <Btn full variant="primary" onClick={confirmarRecebimento}>✓ Confirmar Recebimento</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: NOVO CLIENTE ── */}
      {showNovoCliente && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--card)', borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '18px 20px', borderBottom: `1px solid var(--border)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>+ Novo Cliente</div>
              <button onClick={() => setShowNovoCliente(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-sub)' }}>✕</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <SLabel>Nome *</SLabel>
                <input value={clienteForm.nome} onChange={e => scf('nome', e.target.value)} placeholder="Nome do cliente" style={iStyle()} />
              </div>
              <div>
                <SLabel>CPF / CNPJ</SLabel>
                <input value={clienteForm.cpfCnpj} onChange={e => scf('cpfCnpj', e.target.value)} placeholder="000.000.000-00 ou 00.000.000/0000-00" style={iStyle()} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <SLabel>Telefone</SLabel>
                  <input value={clienteForm.tel} onChange={e => scf('tel', e.target.value)} placeholder="(00) 00000-0000" style={iStyle()} />
                </div>
                <div>
                  <SLabel>E-mail</SLabel>
                  <input value={clienteForm.email} onChange={e => scf('email', e.target.value)} placeholder="email@exemplo.com" style={iStyle()} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <Btn full variant="ghost" onClick={() => setShowNovoCliente(false)}>Cancelar</Btn>
                <Btn full variant="primary" onClick={salvarCliente}>Salvar Cliente</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
