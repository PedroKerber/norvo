import { useState, useMemo, useRef } from 'react'
import RecorrenciaPanel from '../components/RecorrenciaPanel'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { T, fmt, fmtS, fd, uid } from '../theme'
import { CATS_DESPESA, CONTAS } from '../data'
import { Card, Btn, Badge, StatusBadge, KpiCard, Toast, Confirm, SearchInput, Table, EmptyState } from '../components/ui'
import AdvancedFilters, { defaultFilter, filterLancamentos, loadSavedFilter } from '../components/AdvancedFilters'
import * as XLSX from 'xlsx'

const COLORS = ['#2563eb', '#dc2626', '#7c3aed', '#16a34a', '#ea580c', '#0891b2', '#ca8a04', '#9ca3af']
const FORMAS_PAG = ['PIX', 'Boleto', 'Transferência', 'Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'Cheque']

const CAT_CENTRO = {
  marketing: 'Marketing',
  comercial: 'Comercial',
  administrativo: 'Administrativo',
  trafego_pago: 'Marketing',
  operacional: 'Operacional',
  tecnologia: 'TI',
  folha_pagamento: 'RH',
  aluguel_escritorio: 'Administrativo',
  impostos: 'Financeiro',
}

const TODAY = new Date().toISOString().slice(0, 10)

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
    desc: '', cat: '', catNome: '', centroCusto: '', projeto: '',
    contaBancaria: CONTAS[0]?.nome || '',
    formaPagamento: 'PIX',
    status: 'A Pagar',
    vencimento: TODAY, data: TODAY,
    tipo: 'fixa', valorMasked: '',
    fornecedor: '', fornecedorCnpj: '', fornecedorTel: '', fornecedorEmail: '',
    obs: '', anexos: [],
  }
}

export default function Despesas({ empresa, data, onSave, onDelete, onSaveBatch, extraCats = [] }) {
  const catsDespesa = useMemo(() => extraCats.some(c => c.override) ? extraCats.filter(c => c.tipo === 'despesa') : [...CATS_DESPESA, ...extraCats.filter(c => c.tipo === 'despesa')], [extraCats])

  // List state
  const [filter, setFilter] = useState(() => loadSavedFilter('x8_filter_despesas') || defaultFilter())
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [toast, setToast] = useState(null)

  // Form overlay state
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(newForm)
  const [errors, setErrors] = useState({})
  const [nfScanning, setNfScanning] = useState(false)
  const fileRef = useRef(null)
  const nfRef = useRef(null)
  const recorrenciaRef = useRef(null)
  const [recSummary, setRecSummary] = useState(null)

  // Marcar como Pago
  const [pagModal, setPagModal] = useState(null)
  const [pagForm, setPagForm] = useState({ dataPagamento: TODAY, valorPago: '', contaBancaria: CONTAS[0]?.nome || '', obsPag: '' })

  // Novo Fornecedor
  const [showNovoForn, setShowNovoForn] = useState(false)
  const [fornForm, setFornForm] = useState({ nome: '', cnpj: '', tel: '', email: '' })

  // Derived data
  const allLancs   = useMemo(() => (data.lancamentos || []).filter(l => l.tipo === 'despesa'), [data.lancamentos])
  const lancs    = useMemo(() => filterLancamentos(allLancs, filter), [allLancs, filter])

  const filtered = useMemo(() => {
    let l = [...lancs].sort((a, b) => (b.vencimento || b.data || '').localeCompare(a.vencimento || a.data || ''))
    if (search) l = l.filter(x => [x.desc, x.catNome, x.fornecedor].filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase())))
    return l
  }, [lancs, search])

  const tTotal = lancs.reduce((s, l) => s + l.valor, 0)
  const tPago  = lancs.filter(l => l.status === 'Paga').reduce((s, l) => s + l.valor, 0)
  const tPend  = lancs.filter(l => l.status === 'A Pagar').reduce((s, l) => s + l.valor, 0)
  const tAtr   = lancs.filter(l => l.status === 'Atrasada').reduce((s, l) => s + l.valor, 0)

  const catData = useMemo(() => {
    const map = {}
    lancs.forEach(l => { map[l.catNome] = (map[l.catNome] || 0) + l.valor })
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1
    return Object.entries(map).map(([n, v]) => ({ n, v, pct: Math.round(v / total * 100) })).sort((a, b) => b.v - a.v)
  }, [lancs])

  const evolData = useMemo(() => {
    const [ano, mes] = (filter.inicio || TODAY).slice(0, 7).split('-')
    const days = ['01', '05', '10', '12', '15', '18', '20', '22', '25', '30']
    return days.map(d => {
      const dt = `${ano}-${mes}-${d}`
      const v = lancs.filter(l => l.data <= dt && l.status === 'Paga').reduce((s, l) => s + l.valor, 0)
      return { dia: `${d}/${mes}`, v }
    })
  }, [lancs, filter.inicio])

  // Form helpers
  const sf  = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const spf = (k, v) => setPagForm(f => ({ ...f, [k]: v }))
  const sff = (k, v) => setFornForm(f => ({ ...f, [k]: v }))

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
    const cat = catsDespesa.find(c => c.id === form.cat)
    return {
      ...form,
      id: editItem ? editItem.id : uid(),
      tipo: 'despesa',
      catNome: cat?.nome || form.catNome || 'Despesa',
      valor: parseR(form.valorMasked),
      empId: empresa.id,
      ...extra,
    }
  }

  const salvar = () => {
    const e = validar()
    if (Object.keys(e).length) { setErrors(e); return }
    const baseItem = buildItem()
    if (!editItem && recorrenciaRef.current?.isActive()) {
      const recLancs = recorrenciaRef.current.getLancamentos(baseItem)
      if (recLancs.length > 0 && onSaveBatch) {
        onSaveBatch([baseItem, ...recLancs])
        setShowForm(false)
        setToast({ msg: `${1 + recLancs.length} lançamentos gerados com sucesso!`, type: 'success' })
      } else {
        onSave(baseItem, false)
        recLancs.forEach(l => onSave(l, false))
        setShowForm(false)
        setToast({ msg: `Despesa criada + ${recLancs.length} lançamentos recorrentes!`, type: 'success' })
      }
    } else {
      onSave(baseItem, !!editItem)
      setShowForm(false)
      setToast({ msg: editItem ? 'Despesa atualizada!' : 'Despesa cadastrada!', type: 'success' })
    }
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
    setToast({ msg: 'Despesa cadastrada!', type: 'success' })
  }

  const duplicarItem = (item) => {
    const masked = (item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    setEditItem(null)
    setForm({ ...newForm(), ...item, valorMasked: masked, status: 'A Pagar', vencimento: TODAY, data: TODAY })
    setErrors({})
    setShowForm(true)
  }

  // Marcar como Pago
  const abrirPagar = (item) => {
    const masked = (item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    setPagModal(item)
    setPagForm({ dataPagamento: TODAY, valorPago: masked, contaBancaria: CONTAS[0]?.nome || '', obsPag: '' })
  }

  const confirmarPagamento = () => {
    if (!pagModal) return
    onSave({
      ...pagModal,
      status: 'Paga',
      dataPagamento: pagForm.dataPagamento,
      valorPago: parseR(pagForm.valorPago),
      contaBancaria: pagForm.contaBancaria,
      obsPag: pagForm.obsPag,
    }, true)
    setPagModal(null)
    setToast({ msg: 'Despesa marcada como paga!', type: 'success' })
  }

  // Novo Fornecedor
  const salvarFornecedor = () => {
    if (!fornForm.nome.trim()) return
    sf('fornecedor', fornForm.nome)
    sf('fornecedorCnpj', fornForm.cnpj)
    sf('fornecedorTel', fornForm.tel)
    sf('fornecedorEmail', fornForm.email)
    setShowNovoForn(false)
    setFornForm({ nome: '', cnpj: '', tel: '', email: '' })
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

  // Ler NF (simulado — preenche campos automaticamente)
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
        fornecedor: 'Fornecedor identificado pela NF',
        valorMasked: '1.250,00',
        cat: 'operacional',
        catNome: 'Operacional',
        centroCusto: 'Operacional',
        vencimento: TODAY,
        data: TODAY,
        anexos: [...(f.anexos || []), { name: file.name, size: file.size, type: file.type, url }],
      }))
      setToast({ msg: 'Nota fiscal lida! Verifique e ajuste os campos.', type: 'success' })
    }, 2000)
    e.target.value = ''
  }

  // Máscaras de valor
  const handleValor = (e) => {
    const raw = e.target.value.replace(/\D/g, '')
    sf('valorMasked', maskR(raw))
    if (errors.valor) setErrors(p => ({ ...p, valor: '' }))
  }

  const handlePagValor = (e) => {
    spf('valorPago', maskR(e.target.value.replace(/\D/g, '')))
  }

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(filtered.map(l => ({
      'Vencimento': l.vencimento || l.data || '',
      'Descrição': l.desc || '',
      'Fornecedor': l.fornecedor || '',
      'Categoria': l.catNome || '',
      'Centro de Custo': l.centroCusto || '',
      'Forma de Pagamento': l.formaPagamento || '',
      'Valor (R$)': l.valor || 0,
      'Status': l.status || '',
    })))
    XLSX.utils.book_append_sheet(wb, ws, 'Despesas')
    XLSX.writeFile(wb, `despesas_${empresa.nome}_${filter.inicio}_${filter.fim}.xlsx`)
  }

  const exportPDF = () => {
    const html = `<html><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;font-size:11px;margin:28px;color:#111}
      h1{font-size:18px;margin:0 0 2px;color:#0D2545}
      .sub{color:#666;font-size:12px;margin:0 0 16px}
      .kpis{display:flex;gap:28px;padding:12px 0;border-top:2px solid #0D2545;border-bottom:1px solid #e5e7eb;margin-bottom:16px}
      .kpi .kl{font-size:10px;color:#888;margin-bottom:3px;text-transform:uppercase;letter-spacing:.3px}
      .kpi .kv{font-size:15px;font-weight:700}
      table{width:100%;border-collapse:collapse}
      th{background:#f3f4f6;text-align:left;padding:7px 10px;font-size:10px;border-bottom:2px solid #e5e7eb;font-weight:700;text-transform:uppercase;letter-spacing:.4px}
      td{padding:7px 10px;border-bottom:1px solid #f3f4f6;font-size:11px}
      tr:nth-child(even) td{background:#fafafa}
      .val{font-weight:700;color:#dc2626}
      @media print{body{margin:16px}}
    </style></head><body>
      <h1>Despesas — ${empresa?.nome || ''}</h1>
      <div class="sub">Período: ${filter.inicio} a ${filter.fim} · ${filtered.length} registros</div>
      <div class="kpis">
        <div class="kpi"><div class="kl">Total</div><div class="kv" style="color:#dc2626">${fmt(tTotal)}</div></div>
        <div class="kpi"><div class="kl">Pagas</div><div class="kv" style="color:#16a34a">${fmt(tPago)}</div></div>
        <div class="kpi"><div class="kl">A Pagar</div><div class="kv">${fmt(tPend)}</div></div>
        <div class="kpi"><div class="kl">Atrasadas</div><div class="kv" style="color:#dc2626">${fmt(tAtr)}</div></div>
      </div>
      <table>
        <tr><th>Vencimento</th><th>Descrição</th><th>Fornecedor</th><th>Categoria</th><th>Centro de Custo</th><th>Forma Pag.</th><th>Valor</th><th>Status</th></tr>
        ${filtered.map(l => `<tr>
          <td>${l.vencimento || l.data || '—'}</td>
          <td>${l.desc || ''}</td>
          <td>${l.fornecedor || '—'}</td>
          <td>${l.catNome || ''}</td>
          <td>${l.centroCusto || '—'}</td>
          <td>${l.formaPagamento || '—'}</td>
          <td class="val">${fmt(l.valor)}</td>
          <td>${l.status || ''}</td>
        </tr>`).join('')}
      </table>
    </body></html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); win.print() }
  }

  // Colunas da tabela
  const columns = [
    { key: 'vencimento', label: 'Vencimento', render: (v, row) => <span style={{ fontSize: 13, color: row.status === 'Atrasada' ? T.red : 'var(--text)' }}>{fd(v || row.data)}</span> },
    { key: 'desc', label: 'Descrição', render: v => <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span> },
    { key: 'fornecedor', label: 'Fornecedor', render: v => <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{v || '—'}</span> },
    { key: 'catNome', label: 'Categoria', render: (v, row) => { const ci = catsDespesa.findIndex(c => c.id === row.cat); const cor = COLORS[ci >= 0 ? ci % COLORS.length : 0]; return <Badge label={v} color={cor} /> } },
    { key: 'centroCusto', label: 'Centro', render: v => <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>{v || '—'}</span> },
    { key: 'valor', label: 'Valor', render: v => <span style={{ fontWeight: 700, fontSize: 14, color: T.red }}>{fmt(v)}</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    {
      key: 'id', label: 'Ações', render: (_, row) => (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {row.status !== 'Paga' && row.status !== 'Cancelada' && (
            <button onClick={e => { e.stopPropagation(); abrirPagar(row) }}
              style={{ background: 'none', border: `1px solid ${T.green}`, color: T.green, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
              Pagar
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
  const resumoCat = catsDespesa.find(c => c.id === form.cat)
  const hasErrors = Object.values(errors).some(Boolean)

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: 'var(--text)' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {confirm && (
        <Confirm
          msg={`Excluir "${confirm.desc}"?`}
          onYes={() => { onDelete(confirm.id); setConfirm(null); setToast({ msg: 'Despesa excluída!', type: 'success' }) }}
          onNo={() => setConfirm(null)}
        />
      )}

      {/* ── LISTA ── */}
      <div className="page-hd">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: T.redL, borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: T.red, flexShrink: 0 }}>↓</div>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 26, margin: 0 }}>Despesas</h1>
            <div style={{ color: 'var(--text-sub)', fontSize: 14 }}>Acompanhe todas as despesas da empresa selecionada.</div>
          </div>
        </div>
        <div className="page-actions">
          <Btn variant="ghost" icon="📊" onClick={exportExcel}>Excel</Btn>
          <Btn variant="ghost" icon="📄" onClick={exportPDF}>PDF</Btn>
          <Btn variant="danger" icon="+" onClick={openNew}>Nova despesa</Btn>
        </div>
      </div>

      <AdvancedFilters tipo="despesa" cats={catsDespesa} filter={filter} onApply={setFilter} storageKey="x8_filter_despesas" />

      <div className="g-4">
        <KpiCard icon="↓" iconBg={T.redL}    label="Despesas totais" value={fmt(tTotal)} />
        <KpiCard icon="✓" iconBg={T.greenL}  label="Pagas"     value={fmt(tPago)} />
        <KpiCard icon="⏳" iconBg={T.yellowL} label="A Pagar"   value={fmt(tPend)} />
        <KpiCard icon="⚠" iconBg={T.orangeL} label="Atrasadas" value={fmt(tAtr)} />
      </div>

      <div className="g-2">
        <Card style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Evolução das despesas</div>
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
              <Tooltip formatter={v => fmt(v)} contentStyle={{ background: 'var(--card)', border: `1px solid var(--border)`, borderRadius: 8, fontSize: 12 }} />
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
          <div style={{ fontWeight: 700, fontSize: 15 }}>Despesas lançadas</div>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar despesa..." />
        </div>
        <Table columns={columns} data={filtered} onRow={openEdit}
          emptyState={<EmptyState icon="📋" title="Nenhuma despesa" sub="Cadastre sua primeira despesa" action={<Btn variant="danger" onClick={openNew}>+ Nova despesa</Btn>} />} />
        <div style={{ padding: '12px 18px', borderTop: `1px solid var(--border)`, fontSize: 13, color: 'var(--text-sub)' }}>
          Mostrando {filtered.length} despesa{filtered.length !== 1 ? 's' : ''}
        </div>
      </Card>

      {/* ── FORM OVERLAY ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 2000, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Header fixo */}
          <div className="form-overlay-header">
            <div style={{ background: T.redL, borderRadius: 10, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: T.red, flexShrink: 0 }}>↓</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>{editItem ? 'Editar Despesa' : 'Nova Despesa'}</div>
              <div style={{ color: 'var(--text-sub)', fontSize: 13 }}>Preencha os dados para registrar uma nova despesa</div>
            </div>
            <div className="form-overlay-actions" style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              <input ref={nfRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.xml" style={{ display: 'none' }} onChange={lerNF} />
              <Btn variant="outline" onClick={() => nfRef.current?.click()} disabled={nfScanning}>
                {nfScanning ? '⏳ Lendo NF...' : '📷 NF'}
              </Btn>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-sub)', lineHeight: 1, padding: 4 }}>✕</button>
            </div>
          </div>

          {/* Body */}
          <div className="form-overlay-body">

            {/* Formulário principal */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

              {/* Linha 1 — Seções 1, 2, 3 */}
              <div className="form-grid-3">

                {/* Seção 1 — Informações Gerais */}
                <div style={{ background: 'var(--card)', borderRadius: 12, border: `1px solid var(--border)`, padding: 20 }}>
                  <SecHead num={1} label="INFORMAÇÕES GERAIS" color={T.primary} />

                  <SLabel>Descrição *</SLabel>
                  <input
                    value={form.desc}
                    onChange={e => { sf('desc', e.target.value); if (errors.desc) setErrors(p => ({ ...p, desc: '' })) }}
                    placeholder="Ex.: Aluguel da sala comercial"
                    style={iStyle(errors.desc)}
                  />
                  {errors.desc && <Err msg={errors.desc} />}

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
                          const cat = catsDespesa.find(c => c.id === e.target.value)
                          sf('cat', e.target.value)
                          sf('catNome', cat?.nome || '')
                          if (CAT_CENTRO[e.target.value]) sf('centroCusto', CAT_CENTRO[e.target.value])
                          if (errors.cat) setErrors(p => ({ ...p, cat: '' }))
                        }}
                        style={{ ...iStyle(errors.cat), appearance: 'none', paddingRight: 28 }}
                      >
                        <option value="">Selecione uma categoria</option>
                        {catsDespesa.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 12 }}>▾</span>
                    </div>
                    {errors.cat && <Err msg={errors.cat} />}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                    <div>
                      <SLabel>Centro de Custo</SLabel>
                      <input value={form.centroCusto} onChange={e => sf('centroCusto', e.target.value)} placeholder="Administrativo" style={iStyle()} />
                    </div>
                    <div>
                      <SLabel>Projeto</SLabel>
                      <input value={form.projeto} onChange={e => sf('projeto', e.target.value)} placeholder="Opcional" style={iStyle()} />
                    </div>
                  </div>
                </div>

                {/* Seção 2 — Financeiro */}
                <div style={{ background: 'var(--card)', borderRadius: 12, border: `1px solid var(--border)`, padding: 20 }}>
                  <SecHead num={2} label="FINANCEIRO" color={T.blue} />

                  <SLabel>Conta Bancária</SLabel>
                  <div style={{ position: 'relative' }}>
                    <select value={form.contaBancaria} onChange={e => sf('contaBancaria', e.target.value)} style={{ ...iStyle(), appearance: 'none', paddingRight: 28 }}>
                      <option value="">Selecione uma conta</option>
                      {CONTAS.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 12 }}>▾</span>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <SLabel>Forma de Pagamento</SLabel>
                    <div style={{ position: 'relative' }}>
                      <select value={form.formaPagamento} onChange={e => sf('formaPagamento', e.target.value)} style={{ ...iStyle(), appearance: 'none', paddingRight: 28 }}>
                        <option value="">Selecione</option>
                        {FORMAS_PAG.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 12 }}>▾</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <SLabel>Status *</SLabel>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[['A Pagar', T.yellow], ['Paga', T.green], ['Atrasada', T.red], ['Cancelada', T.muted]].map(([s, col]) => (
                        <button key={s} onClick={() => sf('status', s)} style={{
                          flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          fontFamily: 'inherit', cursor: 'pointer', transition: 'all .15s',
                          border: form.status === s ? 'none' : `1.5px solid var(--border)`,
                          background: form.status === s ? col : 'var(--bg)',
                          color: form.status === s ? '#fff' : 'var(--text-sub)',
                        }}>{s}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <SLabel>Data de Vencimento *</SLabel>
                    <input
                      type="date"
                      value={form.vencimento}
                      onChange={e => {
                        sf('vencimento', e.target.value)
                        sf('data', e.target.value)
                        if (errors.vencimento) setErrors(p => ({ ...p, vencimento: '' }))
                      }}
                      style={iStyle(errors.vencimento)}
                    />
                    {errors.vencimento && <Err msg={errors.vencimento} />}
                  </div>

                  <div style={{ marginTop: 12, background: 'var(--blue-light)', borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.blue}20`, fontSize: 12, color: T.blue, lineHeight: 1.5 }}>
                    A data de pagamento será registrada automaticamente quando a despesa for marcada como paga.
                  </div>
                </div>

                {/* Seção 3 — Classificação */}
                <div style={{ background: 'var(--card)', borderRadius: 12, border: `1px solid var(--border)`, padding: 20 }}>
                  <SecHead num={3} label="CLASSIFICAÇÃO" color={T.purple} />

                  <SLabel>Tipo de Despesa *</SLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                    {[
                      { key: 'fixa',    icon: '🏢', label: 'Despesa Fixa',     desc: 'Despesas recorrentes que acontecem periodicamente.' },
                      { key: 'variavel', icon: '⚡', label: 'Despesa Variável', desc: 'Despesas que podem variar de valor ou frequência.' },
                    ].map(t => (
                      <div
                        key={t.key}
                        onClick={() => sf('tipo', t.key)}
                        style={{
                          border: `2px solid ${form.tipo === t.key ? T.primary : 'var(--border)'}`,
                          borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                          background: form.tipo === t.key ? 'var(--primary-light)' : 'var(--bg)',
                          transition: 'all .15s', display: 'flex', alignItems: 'flex-start', gap: 10,
                        }}
                      >
                        <div style={{
                          marginTop: 2, width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${form.tipo === t.key ? T.primary : 'var(--border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {form.tipo === t.key && <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.primary }} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: form.tipo === t.key ? T.primary : 'var(--text)' }}>
                            {t.icon} {t.label}
                          </div>
                          <div style={{ fontSize: 12, color: form.tipo === t.key ? T.primary : 'var(--text-muted)', marginTop: 3 }}>{t.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Linha 2 — Seções 4, 5 */}
              <div className="form-grid-2">

                {/* Seção 4 — Fornecedor */}
                <div style={{ background: 'var(--card)', borderRadius: 12, border: `1px solid var(--border)`, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: T.orange, fontWeight: 700, fontSize: 11 }}>4.</span>
                      <span style={{ color: T.orange, fontWeight: 700, fontSize: 11, letterSpacing: '.06em' }}>FORNECEDOR</span>
                    </div>
                    <button
                      onClick={() => setShowNovoForn(true)}
                      style={{ background: 'none', border: `1px solid ${T.primary}`, color: T.primary, borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}
                    >
                      + Novo Fornecedor
                    </button>
                  </div>

                  <SLabel>Fornecedor</SLabel>
                  <input value={form.fornecedor} onChange={e => sf('fornecedor', e.target.value)} placeholder="Busque por nome ou CNPJ" style={iStyle()} />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
                    <div>
                      <SLabel>CNPJ / CPF</SLabel>
                      <input value={form.fornecedorCnpj} onChange={e => sf('fornecedorCnpj', e.target.value)} placeholder="00.000.000/0000-00" style={iStyle()} />
                    </div>
                    <div>
                      <SLabel>Telefone</SLabel>
                      <input value={form.fornecedorTel} onChange={e => sf('fornecedorTel', e.target.value)} placeholder="(00) 00000-0000" style={iStyle()} />
                    </div>
                    <div>
                      <SLabel>E-mail</SLabel>
                      <input value={form.fornecedorEmail} onChange={e => sf('fornecedorEmail', e.target.value)} placeholder="email@exemplo.com" style={iStyle()} />
                    </div>
                  </div>
                </div>

                {/* Seção 5 — Observações */}
                <div style={{ background: 'var(--card)', borderRadius: 12, border: `1px solid var(--border)`, padding: 20 }}>
                  <SecHead num={5} label="OBSERVAÇÕES" color={T.cyan} />
                  <SLabel>Observações</SLabel>
                  <textarea
                    value={form.obs}
                    onChange={e => sf('obs', e.target.value)}
                    placeholder="Adicione observações sobre esta despesa..."
                    rows={6}
                    maxLength={500}
                    style={{ ...iStyle(), resize: 'none', fontFamily: 'inherit' }}
                  />
                  <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{(form.obs || '').length}/500</div>
                </div>
              </div>

              {/* Seção 6 — Anexos */}
              <div style={{ background: 'var(--card)', borderRadius: 12, border: `1px solid var(--border)`, padding: 20 }}>
                <SecHead num={6} label="ANEXOS" color={T.yellow} />
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.xml" multiple style={{ display: 'none' }} onChange={addAnexos} />
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{ border: `2px dashed var(--border)`, borderRadius: 10, padding: '20px 24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 180, color: 'var(--text-muted)', fontSize: 13, transition: 'border-color .15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = T.primary}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ fontSize: 28 }}>☁</div>
                    <div style={{ textAlign: 'center', fontSize: 12, lineHeight: 1.5 }}>
                      Arraste e solte arquivos aqui<br />
                      ou <span style={{ color: T.primary, fontWeight: 600 }}>clique para selecionar</span><br />
                      <span style={{ fontSize: 11 }}>PDF, JPG, PNG, XML até 10MB cada</span>
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

              {/* Seção 7 — Recorrência */}
              <RecorrenciaPanel
                ref={recorrenciaRef}
                tipo="despesa"
                baseVencimento={form.vencimento}
                baseMesAno={form.vencimento ? form.vencimento.slice(0, 7) : undefined}
                baseValor={parseR(form.valorMasked)}
                onDataChange={setRecSummary}
              />
            </div>

            {/* Sidebar direita */}
            <div style={{ width: 264, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 84 }}>

              {/* Campo de valor em destaque */}
              <div style={{ background: 'var(--card)', borderRadius: 12, border: `1.5px solid ${errors.valor ? T.red : 'var(--border)'}`, padding: 20 }}>
                <SLabel>Valor *</SLabel>
                <div style={{ display: 'flex', alignItems: 'center', border: `2px solid ${errors.valor ? T.red : 'var(--border)'}`, borderRadius: 10, padding: '10px 14px', background: 'var(--bg)', marginTop: 4 }}>
                  <span style={{ color: 'var(--text-sub)', fontSize: 14, fontWeight: 700, marginRight: 6, flexShrink: 0 }}>R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.valorMasked}
                    onChange={handleValor}
                    placeholder="0,00"
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 28, fontWeight: 800, color: T.red, fontFamily: 'inherit', background: 'transparent', width: '100%', minWidth: 0 }}
                  />
                </div>
                {errors.valor && <Err msg={errors.valor} />}
              </div>

              {/* Card de resumo */}
              <div style={{ background: 'var(--card)', borderRadius: 12, border: `1px solid var(--border)`, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 14, color: 'var(--text-sub)', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  📋 RESUMO DA DESPESA
                </div>

                {[
                  { label: 'Empresa',        val: empresa.nome },
                  { label: 'Categoria',      val: resumoCat?.nome || '—' },
                  { label: 'Centro de Custo', val: form.centroCusto || '—' },
                  { label: 'Projeto',        val: form.projeto || '—' },
                  { label: 'Tipo',           val: form.tipo === 'fixa' ? '🏢 Fixa' : '⚡ Variável' },
                  { label: 'Valor',          val: valorNum > 0 ? fmt(valorNum) : '—', col: T.red, w: 800 },
                  { label: 'Status',         val: form.status, isStatus: true },
                  { label: 'Vencimento',     val: fd(form.vencimento) || '—' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-sub)', flexShrink: 0, marginRight: 8 }}>{r.label}</span>
                    {r.isStatus
                      ? <StatusBadge status={r.val} />
                      : <span style={{ fontWeight: r.w || 500, color: r.col || 'var(--text)', textAlign: 'right', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.val}</span>
                    }
                  </div>
                ))}

                {hasErrors && (
                  <div style={{ marginTop: 12, background: 'var(--red-light)', borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.red}30` }}>
                    <div style={{ fontWeight: 700, color: T.red, marginBottom: 3, fontSize: 12 }}>⚠ Campos obrigatórios</div>
                    <div style={{ color: 'var(--text-sub)', fontSize: 12 }}>Preencha os campos marcados com * para salvar.</div>
                  </div>
                )}
              </div>

              {/* Resumo da Recorrência */}
              {recSummary?.active && (
                <div style={{ background: 'var(--card)', borderRadius: 12, border: '2px solid #F47B2040', padding: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 14, color: '#F47B20', letterSpacing: '.06em' }}>🔄 RESUMO DA RECORRÊNCIA</div>
                  {[
                    { label: 'Lançamentos', val: String(recSummary.count), col: '#F47B20', bold: true },
                    { label: 'Valor total estimado', val: recSummary.total > 0 ? `R$ ${recSummary.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—', col: T.red },
                    { label: 'Período', val: recSummary.periodo },
                    { label: 'Tipo', val: recSummary.tipo },
                    { label: 'Reajuste', val: recSummary.reajuste },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, fontSize: 13, gap: 8 }}>
                      <span style={{ color: 'var(--text-sub)', flexShrink: 0 }}>{r.label}</span>
                      <span style={{ fontWeight: r.bold ? 800 : 600, color: r.col || 'var(--text)', textAlign: 'right', fontSize: r.bold ? 16 : 13 }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer fixo */}
          <div className="form-overlay-footer" style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Btn>
            {!recSummary?.active && editItem && <Btn variant="ghost" onClick={() => duplicarItem(editItem)}>⧉ Duplicar</Btn>}
            {recSummary?.active ? (
              <Btn variant="danger" style={{ marginLeft: 'auto' }} onClick={salvar}>
                ✓ Gerar {recSummary.count} lançamento{recSummary.count !== 1 ? 's' : ''}
              </Btn>
            ) : (
              <>
                <Btn variant="ghost" style={{ borderColor: T.yellow, color: T.yellow, marginLeft: 'auto' }} onClick={salvarRascunho}>💾 Rascunho</Btn>
                <Btn variant="ghost" onClick={salvarENovo}>+ Salvar e Novo</Btn>
                <Btn variant="danger" onClick={salvar}>✓ Salvar</Btn>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR PAGAMENTO ── */}
      {pagModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--card)', borderRadius: 14, width: '100%', maxWidth: 460, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '20px 22px', borderBottom: `1px solid var(--border)`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: T.greenL, borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: T.green, flexShrink: 0 }}>✓</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Registrar Pagamento</div>
                <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>{pagModal.desc} · {fmt(pagModal.valor)}</div>
              </div>
              <button onClick={() => setPagModal(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-sub)' }}>✕</button>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <SLabel>Data de Pagamento *</SLabel>
                <input type="date" value={pagForm.dataPagamento} onChange={e => spf('dataPagamento', e.target.value)} style={iStyle()} />
              </div>
              <div>
                <SLabel>Valor Pago *</SLabel>
                <div style={{ display: 'flex', alignItems: 'center', border: `2px solid var(--border)`, borderRadius: 10, padding: '10px 14px', background: 'var(--bg)' }}>
                  <span style={{ color: 'var(--text-sub)', fontSize: 14, fontWeight: 700, marginRight: 6 }}>R$</span>
                  <input
                    type="text" inputMode="numeric"
                    value={pagForm.valorPago}
                    onChange={handlePagValor}
                    placeholder="0,00"
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 22, fontWeight: 700, color: T.green, fontFamily: 'inherit', background: 'transparent' }}
                  />
                </div>
              </div>
              <div>
                <SLabel>Conta Bancária Utilizada</SLabel>
                <div style={{ position: 'relative' }}>
                  <select value={pagForm.contaBancaria} onChange={e => spf('contaBancaria', e.target.value)} style={{ ...iStyle(), appearance: 'none', paddingRight: 28 }}>
                    <option value="">Selecione</option>
                    {CONTAS.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </select>
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 12 }}>▾</span>
                </div>
              </div>
              <div>
                <SLabel>Observação</SLabel>
                <textarea value={pagForm.obsPag} onChange={e => spf('obsPag', e.target.value)} placeholder="Observações sobre o pagamento..." rows={3}
                  style={{ ...iStyle(), resize: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <Btn full variant="ghost" onClick={() => setPagModal(null)}>Cancelar</Btn>
                <Btn full variant="primary" onClick={confirmarPagamento}>✓ Confirmar Pagamento</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: NOVO FORNECEDOR ── */}
      {showNovoForn && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--card)', borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '18px 20px', borderBottom: `1px solid var(--border)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>+ Novo Fornecedor</div>
              <button onClick={() => setShowNovoForn(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-sub)' }}>✕</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <SLabel>Nome *</SLabel>
                <input value={fornForm.nome} onChange={e => sff('nome', e.target.value)} placeholder="Nome do fornecedor" style={iStyle()} />
              </div>
              <div>
                <SLabel>CNPJ / CPF</SLabel>
                <input value={fornForm.cnpj} onChange={e => sff('cnpj', e.target.value)} placeholder="00.000.000/0000-00" style={iStyle()} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <SLabel>Telefone</SLabel>
                  <input value={fornForm.tel} onChange={e => sff('tel', e.target.value)} placeholder="(00) 00000-0000" style={iStyle()} />
                </div>
                <div>
                  <SLabel>E-mail</SLabel>
                  <input value={fornForm.email} onChange={e => sff('email', e.target.value)} placeholder="email@exemplo.com" style={iStyle()} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <Btn full variant="ghost" onClick={() => setShowNovoForn(false)}>Cancelar</Btn>
                <Btn full variant="primary" onClick={salvarFornecedor}>Salvar Fornecedor</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
