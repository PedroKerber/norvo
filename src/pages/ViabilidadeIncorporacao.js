import { useState, useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import { T, uid } from '../theme'
import { Card, Btn, Toast, Confirm } from '../components/ui'
import { useMobile } from '../context/MobileContext'

// ── Formatação ────────────────────────────────────────────────────────────────
const R = n =>
  'R$ ' + (typeof n === 'number' && !isNaN(n) ? n : 0)
    .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const Pct = n =>
  (typeof n === 'number' && !isNaN(n) ? n : 0).toFixed(2).replace('.', ',') + '%'
const parseN = v =>
  parseFloat(String(v || '').replace(/\./g, '').replace(',', '.')) || 0

function maskMoney(raw) {
  const digits = String(raw).replace(/\D/g, '')
  const num = parseInt(digits || '0', 10)
  return (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Matemática financeira ─────────────────────────────────────────────────────
function calcIRR(flows) {
  if (!flows || flows.length < 2 || flows.every(f => f >= 0)) return null
  let r = 0.05
  for (let i = 0; i < 500; i++) {
    let npv = 0; let dnpv = 0
    for (let t = 0; t < flows.length; t++) {
      const cf = flows[t]
      const d = Math.pow(1 + r, t)
      npv  += cf / d
      dnpv -= t * cf / (d * (1 + r))
    }
    if (Math.abs(dnpv) < 1e-10) break
    const nr = r - npv / dnpv
    if (Math.abs(nr - r) < 1e-7) return nr
    r = Math.max(-0.99, nr)
  }
  return r
}

function calcNPV(flows, monthlyRate) {
  if (!flows || !flows.length) return 0
  return flows.reduce((s, cf, t) => s + cf / Math.pow(1 + monthlyRate, t), 0)
}

// ── Constantes ────────────────────────────────────────────────────────────────
const COST_DEFAULTS = [
  'Projetos', 'Aprovações', 'Fundação', 'Estrutura', 'Alvenaria',
  'Cobertura', 'Instalações Elétricas', 'Instalações Hidráulicas',
  'Esquadrias', 'Acabamentos', 'Pintura', 'Paisagismo',
  'Área de Lazer', 'Elevadores', 'Marketing', 'Jurídico',
  'Comissão de Vendas', 'Administração da Obra', 'Contingência',
]

const COMP_RATES = [
  { id: 'cdi',     label: 'CDI',               rate: 0.1065, color: T.blue   },
  { id: 'selic',   label: 'Tesouro Selic',      rate: 0.1075, color: T.purple },
  { id: 'fii',     label: 'Fundo Imobiliário',  rate: 0.12,   color: T.cyan  },
  { id: 'locacao', label: 'Imóvel p/ Locação',  rate: 0.08,   color: T.green },
]

const TIPO_OPT   = ['Casas','Apartamentos','Comercial','Misto','Loteamento','Minha Casa Minha Vida']
const STATUS_OPT = ['Estudo','Aprovação','Lançamento','Obra','Entrega']

const TABS = [
  { id: 'dados',        label: 'Empreendimento', short: 'Dados'     },
  { id: 'terreno',      label: 'Terreno',         short: 'Terreno'   },
  { id: 'custos',       label: 'Custos da Obra',  short: 'Custos'    },
  { id: 'receitas',     label: 'Receitas / VGV',  short: 'VGV'       },
  { id: 'fluxo',        label: 'Fluxo de Caixa',  short: 'Fluxo'     },
  { id: 'viabilidade',  label: 'Viabilidade',     short: 'Análise'   },
  { id: 'investidores', label: 'Investidores',    short: 'Invest.'   },
  { id: 'dashboard',    label: 'Dashboard',       short: 'Dashboard' },
]

// ── Sub-componentes ───────────────────────────────────────────────────────────
function FLabel({ children, req }) {
  return (
    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-sub)', marginBottom: 5, letterSpacing: '.02em' }}>
      {children}{req && <span style={{ color: T.red }}> *</span>}
    </div>
  )
}

function FInput({ label, value, onChange, placeholder, type = 'text', note, req, mask }) {
  const [foc, setFoc] = useState(false)
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <FLabel req={req}>{label}</FLabel>}
      <input
        type={mask ? 'text' : type}
        inputMode={mask ? 'numeric' : undefined}
        value={value}
        onChange={e => {
          if (mask) { onChange(maskMoney(e.target.value.replace(/\D/g, ''))) }
          else { onChange(e.target.value) }
        }}
        placeholder={placeholder || (mask ? '0,00' : '')}
        onFocus={() => setFoc(true)}
        onBlur={() => setFoc(false)}
        style={{
          width: '100%', background: 'var(--card)',
          border: `1.5px solid ${foc ? T.primary : 'var(--border)'}`,
          borderRadius: 8, padding: '10px 12px', color: 'var(--text)',
          fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
        }}
      />
      {note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{note}</div>}
    </div>
  )
}

function FSelect({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <FLabel>{label}</FLabel>}
      <div style={{ position: 'relative' }}>
        <select value={value} onChange={e => onChange(e.target.value)} style={{
          width: '100%', background: 'var(--card)', border: `1.5px solid var(--border)`,
          borderRadius: 8, padding: '10px 28px 10px 12px', color: 'var(--text)',
          fontSize: 14, outline: 'none', appearance: 'none', fontFamily: 'inherit',
        }}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 12 }}>▾</span>
      </div>
    </div>
  )
}

function KBlock({ label, value, sub, color, size = 'md' }) {
  const fs = size === 'lg' ? 21 : size === 'sm' ? 13 : 16
  return (
    <div style={{ padding: '14px 16px', background: 'var(--card)', borderRadius: 12, border: `1px solid var(--border)` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: .7, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: fs, fontWeight: 800, color: color || 'var(--text)', wordBreak: 'break-word', lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ViabilidadeIncorporacao() {
  const isMobile = useMobile()
  const [tab, setTab] = useState('dados')
  const [scenTab, setScenTab] = useState('realista')
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState(null)

  // Empreendimento
  const [emp, setEmp] = useState({
    nome: '', empresa: '', cidade: '', bairro: '', endereco: '',
    tipo: 'Apartamentos', status: 'Estudo',
    areaTerreno: '', areaConstruida: '', unidades: '', areaMedia: '', prazoObra: '',
  })
  const se = (k, v) => setEmp(p => ({ ...p, [k]: v }))

  // Terreno
  const [ter, setTer] = useState({
    valor: '', itbi: '', escritura: '', registro: '',
    comissao: '', terraplenagem: '', infraestrutura: '', outros: '',
  })
  const st = (k, v) => setTer(p => ({ ...p, [k]: v }))

  // Custos
  const [custos, setCustos] = useState(() =>
    COST_DEFAULTS.map(nome => ({ id: uid(), nome, valor: '' }))
  )
  const [novoCusto, setNovoCusto] = useState('')
  const [editCustoId, setEditCustoId] = useState(null)
  const [editCustoNome, setEditCustoNome] = useState('')

  // Receitas
  const [rec, setRec] = useState({ unidades: '', valorMedio: '', reajuste: '0', inadimplencia: '2', desconto: '3' })
  const sr = (k, v) => setRec(p => ({ ...p, [k]: v }))

  // Fluxo de caixa
  const [fluxo, setFluxo] = useState([])
  const addFluxoRow = () => setFluxo(p => [...p, { id: uid(), mes: p.length + 1, entradas: '', saidas: '' }])
  const updFluxo = (id, k, v) => setFluxo(p => p.map(r => r.id === id ? { ...r, [k]: v } : r))
  const delFluxo = id => setFluxo(p => p.filter(r => r.id !== id))
  const initFluxo = () => {
    const m = parseInt(emp.prazoObra) || 12
    setFluxo(Array.from({ length: m }, (_, i) => ({ id: uid(), mes: i + 1, entradas: '', saidas: '' })))
    setToast({ msg: `${m} meses criados!`, type: 'success' })
  }

  // Investidores
  const [investidores, setInvestidores] = useState([])
  const [invF, setInvF] = useState({ nome: '', valor: '', data: '', participacao: '', obs: '' })
  const [editInvId, setEditInvId] = useState(null)
  const sif = (k, v) => setInvF(p => ({ ...p, [k]: v }))

  const saveInv = () => {
    if (!invF.nome.trim()) return
    if (editInvId) {
      setInvestidores(p => p.map(i => i.id === editInvId ? { ...invF, id: editInvId } : i))
      setEditInvId(null)
    } else {
      setInvestidores(p => [...p, { ...invF, id: uid() }])
    }
    setInvF({ nome: '', valor: '', data: '', participacao: '', obs: '' })
    setToast({ msg: editInvId ? 'Investidor atualizado!' : 'Investidor adicionado!', type: 'success' })
  }

  // ── Cálculos centrais ─────────────────────────────────────────────────────
  const calc = useMemo(() => {
    const tT = Object.values(ter).reduce((s, v) => s + parseN(v), 0)
    const tC = custos.reduce((s, c) => s + parseN(c.valor), 0)
    const investTotal = tT + tC

    const unid   = parseN(rec.unidades)
    const vm     = parseN(rec.valorMedio)
    const reaj   = parseN(rec.reajuste) / 100
    const inadim = parseN(rec.inadimplencia) / 100
    const desc   = parseN(rec.desconto) / 100
    const vgv     = unid * vm * (1 + reaj)
    const recPrev = vgv * (1 - inadim)
    const recLiq  = recPrev * (1 - desc)

    const TAX = 0.073
    const lucroBruto = recLiq - investTotal
    const impostos   = recLiq * TAX
    const lucroLiq   = lucroBruto - impostos
    const margBruta  = recLiq > 0 ? (lucroBruto / recLiq) * 100 : 0
    const margLiq    = recLiq > 0 ? (lucroLiq  / recLiq) * 100 : 0
    const roi = investTotal > 0 ? (lucroLiq / investTotal) * 100 : 0

    const prazoMeses = parseN(emp.prazoObra) || 24
    const recMensal  = recLiq / prazoMeses
    const paybackM   = recMensal > 0 ? investTotal / recMensal : null

    let acc = 0
    const fluxoCalc = fluxo.map(r => {
      const ent = parseN(r.entradas); const sai = parseN(r.saidas)
      const saldo = ent - sai; acc += saldo
      return { ...r, ent, sai, saldo, acumulado: acc }
    })
    const picoCaixa = fluxoCalc.length > 0 ? Math.min(0, ...fluxoCalc.map(r => r.acumulado)) : 0

    const cashFlows = [-investTotal, ...fluxo.map(r => parseN(r.entradas) - parseN(r.saidas))]
    const irr      = calcIRR(cashFlows)
    const irrAnual = irr !== null && irr > -1 ? Math.pow(1 + irr, 12) - 1 : null
    const vpl      = calcNPV(cashFlows, 0.01)

    const prazoAnos = prazoMeses / 12
    const comparativos = COMP_RATES.map(cr => ({
      ...cr,
      retorno: investTotal * (Math.pow(1 + cr.rate, prazoAnos) - 1),
    }))

    const makeScen = (rF, cF) => {
      const receita = recLiq * rF
      const custo   = investTotal * cF
      const lb  = receita - custo
      const imp = receita * TAX
      const ll  = lb - imp
      const rmF = recMensal * rF
      return {
        receita, custo,
        lucroBruto: lb, impostos: imp, lucroLiq: ll,
        margBruta: receita > 0 ? (lb / receita) * 100 : 0,
        roi: custo > 0 ? (ll / custo) * 100 : 0,
        payback: rmF > 0 ? custo / rmF : null,
      }
    }
    const scenarios = {
      conservador: { ...makeScen(0.90, 1.10), label: 'Conservador', color: T.red     },
      realista:    { ...makeScen(1.00, 1.00), label: 'Realista',    color: T.primary },
      otimista:    { ...makeScen(1.10, 0.95), label: 'Otimista',    color: T.green   },
    }

    const areaCons = parseN(emp.areaConstruida)
    return {
      tT, tC, investTotal, vgv, recPrev, recLiq,
      lucroBruto, impostos, lucroLiq, margBruta, margLiq, roi,
      paybackM, prazoMeses, irr, irrAnual, vpl,
      fluxoCalc, picoCaixa, comparativos, scenarios,
      custoM2: tC > 0 && areaCons > 0 ? tC / areaCons : 0,
      vgvM2:   vgv > 0 && areaCons > 0 ? vgv / areaCons : 0,
    }
  }, [ter, custos, rec, fluxo, emp])

  const invCalc = useMemo(() => investidores.map(inv => {
    const pct    = parseN(inv.participacao) / 100
    const valorN = parseN(inv.valor)
    return {
      ...inv, valorN,
      participacaoN: parseN(inv.participacao),
      lucroProj:  calc.lucroLiq * pct,
      retornoN:   valorN > 0 ? (calc.lucroLiq * pct / valorN) * 100 : 0,
    }
  }), [investidores, calc.lucroLiq])

  // ── Exportar PDF ──────────────────────────────────────────────────────────
  const exportPDF = () => {
    const sc   = calc.scenarios
    const nome = emp.nome || 'Empreendimento'
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Viabilidade — ${nome}</title><style>
body{font-family:Arial,sans-serif;font-size:11px;margin:28px;color:#111}
h1{font-size:20px;margin:0 0 4px;color:#0D2545}h2{font-size:13px;margin:24px 0 8px;color:#0D2545;border-bottom:2px solid #F47B20;padding-bottom:4px}
.sub{color:#666;font-size:12px;margin:0 0 20px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
.kpi{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px}
.kl{font-size:9px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}.kv{font-size:14px;font-weight:700}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th{background:#f3f4f6;text-align:left;padding:7px 10px;font-size:10px;border-bottom:2px solid #e5e7eb;font-weight:700;text-transform:uppercase}
td{padding:7px 10px;border-bottom:1px solid #f3f4f6;font-size:11px}
.g{color:#16a34a;font-weight:700}.r{color:#dc2626;font-weight:700}.p{color:#F47B20;font-weight:700}
.sc{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
.scb{border:2px solid;border-radius:8px;padding:14px;text-align:center}
footer{margin-top:24px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}
@media print{@page{margin:20px}}</style></head><body>
<h1>Estudo de Viabilidade — ${nome}</h1>
<p class="sub">${[emp.tipo, [emp.cidade,emp.bairro].filter(Boolean).join(', '), 'Status: '+emp.status].filter(Boolean).join(' · ')}</p>
<h2>Indicadores de Viabilidade</h2>
<div class="kpis">
  <div class="kpi"><div class="kl">Investimento Total</div><div class="kv p">${R(calc.investTotal)}</div></div>
  <div class="kpi"><div class="kl">VGV</div><div class="kv">${R(calc.vgv)}</div></div>
  <div class="kpi"><div class="kl">Receita Líquida</div><div class="kv">${R(calc.recLiq)}</div></div>
  <div class="kpi"><div class="kl">Lucro Bruto</div><div class="kv g">${R(calc.lucroBruto)}</div></div>
  <div class="kpi"><div class="kl">Impostos (~7,3%)</div><div class="kv r">${R(calc.impostos)}</div></div>
  <div class="kpi"><div class="kl">Lucro Líquido</div><div class="kv g">${R(calc.lucroLiq)}</div></div>
  <div class="kpi"><div class="kl">Margem Bruta</div><div class="kv">${Pct(calc.margBruta)}</div></div>
  <div class="kpi"><div class="kl">Margem Líquida</div><div class="kv">${Pct(calc.margLiq)}</div></div>
  <div class="kpi"><div class="kl">ROI</div><div class="kv p">${Pct(calc.roi)}</div></div>
  <div class="kpi"><div class="kl">Payback</div><div class="kv">${calc.paybackM ? Math.ceil(calc.paybackM)+' meses' : '—'}</div></div>
  <div class="kpi"><div class="kl">TIR (a.a.)</div><div class="kv">${calc.irrAnual !== null ? Pct(calc.irrAnual*100) : '—'}</div></div>
  <div class="kpi"><div class="kl">VPL (1% a.m.)</div><div class="kv">${R(calc.vpl)}</div></div>
</div>
<h2>Análise de Cenários</h2>
<div class="sc">
  ${['conservador','realista','otimista'].map(k => {
    const s = sc[k]
    return `<div class="scb" style="border-color:${s.color}"><div style="font-weight:700;font-size:12px;color:${s.color};margin-bottom:8px">${s.label}</div><div style="font-size:16px;font-weight:900;color:${s.color}">${R(s.lucroLiq)}</div><div style="font-size:10px;color:#666;margin-top:4px">ROI: ${Pct(s.roi)}</div></div>`
  }).join('')}
</div>
<h2>Aquisição do Terreno</h2>
<table><tr><th>Item</th><th>Valor</th></tr>
  ${[['Valor do Terreno',ter.valor],['ITBI',ter.itbi],['Escritura',ter.escritura],['Registro',ter.registro],
     ['Comissão',ter.comissao],['Terraplenagem',ter.terraplenagem],['Infraestrutura',ter.infraestrutura],['Outros',ter.outros]]
    .filter(([,v]) => parseN(v)>0)
    .map(([l,v]) => `<tr><td>${l}</td><td class="r">${R(parseN(v))}</td></tr>`).join('')}
  <tr style="background:#f3f4f6"><td style="font-weight:700">Total Terreno</td><td style="font-weight:700">${R(calc.tT)}</td></tr>
</table>
<h2>Custos da Incorporação</h2>
<table><tr><th>Categoria</th><th>Valor</th></tr>
  ${custos.filter(c => parseN(c.valor)>0).map(c => `<tr><td>${c.nome}</td><td class="r">${R(parseN(c.valor))}</td></tr>`).join('')}
  <tr style="background:#f3f4f6"><td style="font-weight:700">Total Custos</td><td style="font-weight:700">${R(calc.tC)}</td></tr>
</table>
${investidores.length > 0 ? `
<h2>Investidores</h2>
<table><tr><th>Nome</th><th>Aporte</th><th>Participação</th><th>Lucro Projetado</th><th>Retorno</th></tr>
  ${invCalc.map(i => `<tr><td>${i.nome}</td><td>${R(i.valorN)}</td><td>${Pct(i.participacaoN)}</td><td class="g">${R(i.lucroProj)}</td><td>${Pct(i.retornoN)}</td></tr>`).join('')}
</table>` : ''}
${calc.fluxoCalc.length > 0 ? `
<h2>Fluxo de Caixa</h2>
<table><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Saldo</th><th>Acumulado</th></tr>
  ${calc.fluxoCalc.map(r => `<tr><td>Mês ${r.mes}</td><td class="g">${R(r.ent)}</td><td class="r">${R(r.sai)}</td><td class="${r.saldo>=0?'g':'r'}">${R(r.saldo)}</td><td class="${r.acumulado>=0?'g':'r'}">${R(r.acumulado)}</td></tr>`).join('')}
</table>` : ''}
<footer>Gerado pelo NORVO — ${new Date().toLocaleDateString('pt-BR')} · Estudo de viabilidade para fins analíticos.</footer>
</body></html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 400) }
  }

  // ── Tab nav ───────────────────────────────────────────────────────────────
  const renderTabNav = () => (
    <div style={{
      display: 'flex', gap: 4,
      overflowX: isMobile ? 'auto' : 'visible',
      flexWrap: isMobile ? 'nowrap' : 'wrap',
      marginBottom: 20, paddingBottom: isMobile ? 6 : 0, scrollbarWidth: 'none',
    }}>
      {TABS.map(t => {
        const active = tab === t.id
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 14px', borderRadius: 8, fontSize: 13,
            fontWeight: active ? 700 : 500,
            border: active ? 'none' : `1.5px solid var(--border)`,
            background: active ? T.primary : 'var(--card)',
            color: active ? '#fff' : 'var(--text-sub)',
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            flexShrink: 0, WebkitTapHighlightColor: 'transparent', minHeight: 38,
          }}>
            {isMobile ? t.short : t.label}
          </button>
        )
      })}
    </div>
  )

  // ── Aba: Dados ────────────────────────────────────────────────────────────
  const renderDados = () => (
    <Card style={{ padding: 24 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Dados do Empreendimento</div>
      <div className="form-grid-2">
        <FInput label="Nome do Empreendimento" value={emp.nome} onChange={v => se('nome', v)} placeholder="Ex.: Residencial Jardins" req />
        <FInput label="Empresa Responsável" value={emp.empresa} onChange={v => se('empresa', v)} placeholder="Ex.: Kazole Incorporadora" />
      </div>
      <div className="form-grid-3">
        <FInput label="Cidade" value={emp.cidade} onChange={v => se('cidade', v)} placeholder="Ex.: Goiânia" />
        <FInput label="Bairro" value={emp.bairro} onChange={v => se('bairro', v)} placeholder="Ex.: Setor Bueno" />
        <FInput label="Endereço" value={emp.endereco} onChange={v => se('endereco', v)} placeholder="Rua / Avenida" />
      </div>
      <div className="form-grid-2">
        <FSelect label="Tipo de Empreendimento" value={emp.tipo} onChange={v => se('tipo', v)} options={TIPO_OPT} />
        <FSelect label="Status" value={emp.status} onChange={v => se('status', v)} options={STATUS_OPT} />
      </div>
      <div className="form-grid-3">
        <FInput label="Área do Terreno (m²)" value={emp.areaTerreno} onChange={v => se('areaTerreno', v)} type="number" placeholder="0" />
        <FInput label="Área Construída Prevista (m²)" value={emp.areaConstruida} onChange={v => se('areaConstruida', v)} type="number" placeholder="0" />
        <FInput label="Quantidade de Unidades" value={emp.unidades} onChange={v => se('unidades', v)} type="number" placeholder="0" />
      </div>
      <div className="form-grid-2">
        <FInput label="Área Média por Unidade (m²)" value={emp.areaMedia} onChange={v => se('areaMedia', v)} type="number" placeholder="0" />
        <FInput label="Prazo Estimado da Obra (meses)" value={emp.prazoObra} onChange={v => se('prazoObra', v)} type="number" placeholder="24" req note="Usado para calcular payback e fluxo de caixa" />
      </div>
      <Btn onClick={() => { setToast({ msg: 'Salvo!', type: 'success' }); setTab('terreno') }}>Salvar e Continuar →</Btn>
    </Card>
  )

  // ── Aba: Terreno ──────────────────────────────────────────────────────────
  const renderTerreno = () => {
    const items = [
      ['valor','Valor do Terreno'],['itbi','ITBI'],['escritura','Escritura'],['registro','Registro'],
      ['comissao','Comissão de Aquisição'],['terraplenagem','Terraplenagem'],
      ['infraestrutura','Infraestrutura Inicial'],['outros','Outros Custos'],
    ]
    return (
      <Card style={{ padding: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Aquisição do Terreno</div>
        <div className="form-grid-2">
          {items.map(([key, label]) => (
            <FInput key={key} label={label} value={ter[key]} onChange={v => st(key, v)} mask />
          ))}
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Total de Aquisição do Terreno</span>
          <span style={{ fontWeight: 900, fontSize: 20, color: T.primary }}>{R(calc.tT)}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" onClick={() => setTab('dados')}>← Voltar</Btn>
          <Btn onClick={() => { setToast({ msg: 'Salvo!', type: 'success' }); setTab('custos') }}>Salvar e Continuar →</Btn>
        </div>
      </Card>
    )
  }

  // ── Aba: Custos ───────────────────────────────────────────────────────────
  const renderCustos = () => {
    const th = { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: .5 }
    return (
      <Card style={{ padding: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Custos da Incorporação</div>
        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 360 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid var(--border)` }}>
                <th style={th}>Categoria</th>
                <th style={{ ...th, textAlign: 'right' }}>Valor (R$)</th>
                <th style={{ width: 70 }}></th>
              </tr>
            </thead>
            <tbody>
              {custos.map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid var(--border-light)` }}>
                  <td style={{ padding: '8px 12px' }}>
                    {editCustoId === c.id ? (
                      <input value={editCustoNome} autoFocus
                        onChange={e => setEditCustoNome(e.target.value)}
                        onBlur={() => { setCustos(p => p.map(x => x.id === c.id ? { ...x, nome: editCustoNome } : x)); setEditCustoId(null) }}
                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
                        style={{ border: `1.5px solid ${T.primary}`, borderRadius: 6, padding: '4px 8px', fontFamily: 'inherit', fontSize: 13, background: 'var(--card)', color: 'var(--text)', outline: 'none' }}
                      />
                    ) : (
                      <span style={{ fontSize: 14 }}>{c.nome}</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <input type="text" inputMode="numeric" value={c.valor} placeholder="0,00"
                      onChange={e => setCustos(p => p.map(x => x.id === c.id ? { ...x, valor: maskMoney(e.target.value.replace(/\D/g,'')) } : x))}
                      style={{ width: isMobile ? 110 : 150, border: `1.5px solid var(--border)`, borderRadius: 6, padding: '6px 8px', fontFamily: 'inherit', fontSize: 13, background: 'var(--card)', color: 'var(--text)', textAlign: 'right', outline: 'none' }}
                    />
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <button onClick={() => { setEditCustoId(c.id); setEditCustoNome(c.nome) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, marginRight: 6, color: 'var(--text-sub)' }}>✏️</button>
                    <button onClick={() => setCustos(p => p.filter(x => x.id !== c.id))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: T.red }}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input value={novoCusto} onChange={e => setNovoCusto(e.target.value)} placeholder="Nova categoria..."
            onKeyDown={e => { if (e.key === 'Enter' && novoCusto.trim()) { setCustos(p => [...p, { id: uid(), nome: novoCusto.trim(), valor: '' }]); setNovoCusto('') } }}
            style={{ flex: 1, border: `1.5px solid var(--border)`, borderRadius: 8, padding: '9px 12px', fontFamily: 'inherit', fontSize: 13, background: 'var(--card)', color: 'var(--text)', outline: 'none' }}
          />
          <Btn variant="outline" sm onClick={() => { if (novoCusto.trim()) { setCustos(p => [...p, { id: uid(), nome: novoCusto.trim(), valor: '' }]); setNovoCusto('') } }}>+ Adicionar</Btn>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Custo Total da Obra</span>
          <span style={{ fontWeight: 900, fontSize: 20, color: T.red }}>{R(calc.tC)}</span>
        </div>
        {calc.custoM2 > 0 && <div style={{ fontSize: 12, color: 'var(--text-sub)', marginBottom: 14 }}>Custo/m²: <strong>{R(calc.custoM2)}</strong></div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setTab('terreno')}>← Voltar</Btn>
          <Btn onClick={() => { setToast({ msg: 'Salvo!', type: 'success' }); setTab('receitas') }}>Salvar e Continuar →</Btn>
        </div>
      </Card>
    )
  }

  // ── Aba: Receitas ─────────────────────────────────────────────────────────
  const renderReceitas = () => (
    <Card style={{ padding: 24 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Receitas e VGV</div>
      <div className="form-grid-2">
        <FInput label="Quantidade de Unidades" value={rec.unidades} onChange={v => sr('unidades', v)} type="number" placeholder="0" req />
        <FInput label="Valor Médio por Unidade (R$)" value={rec.valorMedio} onChange={v => sr('valorMedio', v)} mask req />
      </div>
      <div className="form-grid-3">
        <FInput label="Reajuste Esperado (%)" value={rec.reajuste} onChange={v => sr('reajuste', v)} type="number" placeholder="0" note="% de valorização nas vendas" />
        <FInput label="Inadimplência Estimada (%)" value={rec.inadimplencia} onChange={v => sr('inadimplencia', v)} type="number" placeholder="2" />
        <FInput label="Desconto Comercial (%)" value={rec.desconto} onChange={v => sr('desconto', v)} type="number" placeholder="3" />
      </div>
      <div className="g-3" style={{ marginTop: 8 }}>
        <KBlock label="VGV" value={R(calc.vgv)} color={T.primary} size="lg" />
        <KBlock label="Receita Prevista" value={R(calc.recPrev)} color={T.blue} size="lg" />
        <KBlock label="Receita Líquida Estimada" value={R(calc.recLiq)} color={T.green} size="lg" />
      </div>
      {calc.vgvM2 > 0 && <div style={{ fontSize: 12, color: 'var(--text-sub)', marginBottom: 8 }}>VGV/m²: <strong>{R(calc.vgvM2)}</strong></div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <Btn variant="ghost" onClick={() => setTab('custos')}>← Voltar</Btn>
        <Btn onClick={() => { setToast({ msg: 'Salvo!', type: 'success' }); setTab('fluxo') }}>Salvar e Continuar →</Btn>
      </div>
    </Card>
  )

  // ── Aba: Fluxo de Caixa ───────────────────────────────────────────────────
  const renderFluxo = () => {
    const totEnt = calc.fluxoCalc.reduce((s, r) => s + r.ent, 0)
    const totSai = calc.fluxoCalc.reduce((s, r) => s + r.sai, 0)
    return (
      <div>
        <Card style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Fluxo de Caixa da Incorporação</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {emp.prazoObra && <Btn variant="outline" sm onClick={initFluxo}>Gerar {emp.prazoObra} meses</Btn>}
              <Btn sm onClick={addFluxoRow}>+ Mês</Btn>
            </div>
          </div>
          {fluxo.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-sub)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📅</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Nenhum mês cadastrado</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {emp.prazoObra ? `Clique em "Gerar ${emp.prazoObra} meses" para criar automaticamente.` : 'Informe o prazo da obra na aba Empreendimento.'}
              </div>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', marginBottom: 14 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid var(--border)` }}>
                      {['Mês','Entradas','Saídas','Saldo','Acumulado',''].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: h==='Mês'?'left':'right', fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: .5, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calc.fluxoCalc.map(r => (
                      <tr key={r.id} style={{ borderBottom: `1px solid var(--border-light)` }}>
                        <td style={{ padding: '7px 10px', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>Mês {r.mes}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                          <input type="text" inputMode="numeric" value={r.entradas} placeholder="0,00"
                            onChange={e => updFluxo(r.id,'entradas',maskMoney(e.target.value.replace(/\D/g,'')))}
                            style={{ width: isMobile?88:120,border:`1.5px solid var(--border)`,borderRadius:6,padding:'5px 7px',fontFamily:'inherit',fontSize:12,background:'var(--card)',color:T.green,textAlign:'right',outline:'none' }}
                          />
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                          <input type="text" inputMode="numeric" value={r.saidas} placeholder="0,00"
                            onChange={e => updFluxo(r.id,'saidas',maskMoney(e.target.value.replace(/\D/g,'')))}
                            style={{ width: isMobile?88:120,border:`1.5px solid var(--border)`,borderRadius:6,padding:'5px 7px',fontFamily:'inherit',fontSize:12,background:'var(--card)',color:T.red,textAlign:'right',outline:'none' }}
                          />
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, fontSize: 13, color: r.saldo>=0?T.green:T.red }}>{R(r.saldo)}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: r.acumulado>=0?T.green:T.red }}>{R(r.acumulado)}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                          <button onClick={() => delFluxo(r.id)} style={{ background:'none',border:'none',cursor:'pointer',color:T.red,fontSize:14 }}>🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="g-3">
                <KBlock label="Total Entradas"          value={R(totEnt)}                   color={T.green}   />
                <KBlock label="Total Saídas"            value={R(totSai)}                   color={T.red}     />
                <KBlock label="Necessidade Máx. Caixa" value={R(Math.abs(calc.picoCaixa))} color={T.primary} sub="Pico de investimento" />
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setTab('receitas')}>← Voltar</Btn>
            <Btn onClick={() => { setToast({ msg: 'Salvo!', type: 'success' }); setTab('viabilidade') }}>Ver Viabilidade →</Btn>
          </div>
        </Card>
        {calc.fluxoCalc.length > 1 && (
          <Card style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Fluxo Financeiro</div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={calc.fluxoCalc} margin={{ top:4,right:4,left:-10,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" tickFormatter={v=>`M${v}`} tick={{ fill:'var(--text-muted)',fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text-muted)',fontSize:9 }} axisLine={false} tickLine={false}
                  tickFormatter={v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'k':v} />
                <Tooltip formatter={(v,n)=>[R(v),n==='ent'?'Entradas':n==='sai'?'Saídas':'Acumulado']}
                  contentStyle={{ background:'var(--card)',border:`1px solid var(--border)`,borderRadius:8,fontSize:12 }} />
                <Bar dataKey="ent" name="ent" fill={T.green} opacity={0.75} radius={[3,3,0,0]} maxBarSize={16} />
                <Bar dataKey="sai" name="sai" fill={T.red} opacity={0.75} radius={[3,3,0,0]} maxBarSize={16} />
                <Line type="monotone" dataKey="acumulado" name="acumulado" stroke={T.blue} strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    )
  }

  // ── Aba: Viabilidade ──────────────────────────────────────────────────────
  const renderViabilidade = () => {
    const sc = calc.scenarios
    const active = sc[scenTab]
    const scenTabs = [
      { id: 'conservador', label: '📉 Conservador' },
      { id: 'realista',    label: '📊 Realista'    },
      { id: 'otimista',    label: '📈 Otimista'    },
    ]
    const bestComp = calc.comparativos.length > 0
      ? calc.comparativos.reduce((b, c) => c.retorno > b.retorno ? c : b)
      : null
    const fator = bestComp && bestComp.retorno > 0 && calc.lucroLiq > 0
      ? calc.lucroLiq / bestComp.retorno
      : null
    const compBarData = [
      { name: 'Empreendimento', valor: calc.lucroLiq, color: T.primary },
      ...calc.comparativos.map(c => ({ name: c.label, valor: c.retorno, color: c.color })),
    ]

    return (
      <div>
        <div className="g-kpi" style={{ marginBottom: 20 }}>
          <KBlock label="Investimento Total" value={R(calc.investTotal)}  color={T.primary} />
          <KBlock label="VGV"                value={R(calc.vgv)}          color={T.blue}    />
          <KBlock label="Receita Líquida"    value={R(calc.recLiq)}       color={T.blue}    />
          <KBlock label="Lucro Bruto"        value={R(calc.lucroBruto)}   color={calc.lucroBruto>=0?T.green:T.red} />
          <KBlock label="Impostos (~7,3%)"   value={R(calc.impostos)}     color={'var(--text-sub)'} />
          <KBlock label="Lucro Líquido"      value={R(calc.lucroLiq)}     color={calc.lucroLiq>=0?T.green:T.red} size="lg" />
          <KBlock label="Margem Bruta"       value={Pct(calc.margBruta)}  color={calc.margBruta>=20?T.green:calc.margBruta>=10?T.primary:T.red} />
          <KBlock label="Margem Líquida"     value={Pct(calc.margLiq)}    color={calc.margLiq>=15?T.green:calc.margLiq>=8?T.primary:T.red} />
          <KBlock label="ROI"                value={Pct(calc.roi)}        color={calc.roi>=30?T.green:calc.roi>=15?T.primary:T.red} />
          <KBlock label="Payback"            value={calc.paybackM?Math.ceil(calc.paybackM)+' meses':'—'} sub={calc.paybackM?(calc.paybackM/12).toFixed(1)+' anos':undefined} />
          <KBlock label="TIR (a.a.)"         value={calc.irrAnual!==null?Pct(calc.irrAnual*100):'—'} color={T.purple} />
          <KBlock label="VPL (1% a.m.)"      value={R(calc.vpl)} color={calc.vpl>0?T.green:T.red} />
        </div>

        {/* Cenários */}
        <Card style={{ marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid var(--border)` }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Análise de Cenários</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {scenTabs.map(s => (
                <button key={s.id} onClick={() => setScenTab(s.id)} style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: 13,
                  fontWeight: scenTab===s.id ? 700 : 500,
                  border: scenTab===s.id ? 'none' : `1.5px solid var(--border)`,
                  background: scenTab===s.id ? sc[s.id].color : 'var(--card)',
                  color: scenTab===s.id ? '#fff' : 'var(--text-sub)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                }}>{s.label}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: 'var(--text-sub)' }}>
              {scenTab==='conservador' && 'Receitas −10% e custos +10% em relação ao cenário realista.'}
              {scenTab==='realista'    && 'Dados cadastrados sem alterações.'}
              {scenTab==='otimista'    && 'Receitas +10% e custos −5% em relação ao cenário realista.'}
            </div>
            <div className="g-kpi">
              <KBlock label="Receita Líquida"  value={R(active.receita)}    color={T.blue} />
              <KBlock label="Custos Totais"     value={R(active.custo)}      color={T.red}  />
              <KBlock label="Lucro Bruto"       value={R(active.lucroBruto)} color={active.lucroBruto>=0?T.green:T.red} />
              <KBlock label="Lucro Líquido"     value={R(active.lucroLiq)}   color={active.lucroLiq>=0?T.green:T.red} size="lg" />
              <KBlock label="Margem Bruta"      value={Pct(active.margBruta)} color={active.margBruta>=20?T.green:T.red} />
              <KBlock label="ROI"               value={Pct(active.roi)}       color={active.roi>=20?T.green:T.red} />
              <KBlock label="Payback"           value={active.payback?Math.ceil(active.payback)+' meses':'—'} />
            </div>
            <Card style={{ padding: 16, marginTop: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Lucro Líquido por Cenário</div>
              <ResponsiveContainer width="100%" height={170}>
                <ComposedChart data={Object.values(sc).map(s => ({ name: s.label, valor: s.lucroLiq, color: s.color }))}
                  margin={{ top:4,right:4,left:-10,bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill:'var(--text-sub)',fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'var(--text-muted)',fontSize:9 }} axisLine={false} tickLine={false}
                    tickFormatter={v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'k':v} />
                  <Tooltip formatter={v=>[R(v),'Lucro Líquido']} contentStyle={{ background:'var(--card)',border:`1px solid var(--border)`,borderRadius:8,fontSize:12 }} />
                  <Bar dataKey="valor" radius={[6,6,0,0]} maxBarSize={70}>
                    {Object.values(sc).map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </Card>

        {/* Comparativo */}
        <Card style={{ marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid var(--border)`, fontWeight: 700, fontSize: 15 }}>
            Comparação de Rentabilidade
          </div>
          {fator && (
            <div style={{ padding: '10px 20px', background: T.primary+'18', borderBottom: `1px solid var(--border)`, fontSize: 13 }}>
              🏆 Este empreendimento possui retorno estimado <strong style={{ color: T.primary }}>{fator.toFixed(1)}×</strong> superior ao melhor comparativo ({bestComp?.label}).
            </div>
          )}
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text-sub)', marginBottom: 14 }}>
              Investimento de {R(calc.investTotal)} pelo período de {(calc.prazoMeses/12).toFixed(1)} anos.
            </div>
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid var(--border)` }}>
                    {['Investimento','Taxa a.a.','Retorno Estimado','Dif. vs Empreendimento'].map(h => (
                      <th key={h} style={{ padding:'8px 12px',textAlign:'left',fontSize:11,fontWeight:700,color:'var(--text-sub)',textTransform:'uppercase',letterSpacing:.5,whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom:`1px solid var(--border-light)`,background:T.primary+'0D' }}>
                    <td style={{ padding:'10px 12px',fontWeight:700,color:T.primary }}>🏗 Empreendimento</td>
                    <td style={{ padding:'10px 12px',fontWeight:600,color:T.primary }}>
                      {calc.roi>0&&calc.prazoMeses>0 ? Pct(Math.pow(1+calc.roi/100, 12/calc.prazoMeses)*100-100) : '—'}
                    </td>
                    <td style={{ padding:'10px 12px',fontWeight:800,color:T.primary }}>{R(calc.lucroLiq)}</td>
                    <td style={{ padding:'10px 12px',fontWeight:600,color:T.green }}>Base</td>
                  </tr>
                  {calc.comparativos.map(c => {
                    const dif = calc.lucroLiq - c.retorno
                    return (
                      <tr key={c.id} style={{ borderBottom:`1px solid var(--border-light)` }}>
                        <td style={{ padding:'10px 12px' }}>{c.label}</td>
                        <td style={{ padding:'10px 12px',color:'var(--text-sub)' }}>{Pct(c.rate*100)}</td>
                        <td style={{ padding:'10px 12px',color:'var(--text-sub)' }}>{R(c.retorno)}</td>
                        <td style={{ padding:'10px 12px',fontWeight:600,color:dif>0?T.green:T.red }}>{dif>0?'+':''}{R(dif)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Card style={{ padding: 16 }}>
              <ResponsiveContainer width="100%" height={190}>
                <ComposedChart data={compBarData} layout="vertical" margin={{ top:4,right:60,left:0,bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill:'var(--text-muted)',fontSize:9 }} axisLine={false} tickLine={false}
                    tickFormatter={v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'k':v} />
                  <YAxis type="category" dataKey="name" tick={{ fill:'var(--text-sub)',fontSize:10 }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip formatter={v=>[R(v),'Retorno']} contentStyle={{ background:'var(--card)',border:`1px solid var(--border)`,borderRadius:8,fontSize:12 }} />
                  <Bar dataKey="valor" radius={[0,6,6,0]} maxBarSize={32}>
                    {compBarData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </Card>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn variant="ghost" onClick={() => setTab('fluxo')}>← Voltar</Btn>
          <Btn variant="outline" onClick={exportPDF}>📄 Exportar PDF</Btn>
          <Btn onClick={() => setTab('investidores')}>Ver Investidores →</Btn>
        </div>
      </div>
    )
  }

  // ── Aba: Investidores ─────────────────────────────────────────────────────
  const renderInvestidores = () => {
    const totalAport = investidores.reduce((s, i) => s + parseN(i.valor), 0)
    const totalPart  = invCalc.reduce((s, i) => s + i.participacaoN, 0)
    return (
      <div>
        <Card style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{editInvId ? 'Editar Investidor' : 'Adicionar Investidor'}</div>
          <div className="form-grid-2">
            <FInput label="Nome do Investidor" value={invF.nome} onChange={v => sif('nome', v)} placeholder="Ex.: João Silva" req />
            <FInput label="Valor do Aporte (R$)" value={invF.valor} onChange={v => sif('valor', v)} mask />
          </div>
          <div className="form-grid-3">
            <FInput label="Data do Aporte" value={invF.data} onChange={v => sif('data', v)} type="date" />
            <FInput label="Participação (%)" value={invF.participacao} onChange={v => sif('participacao', v)} type="number" placeholder="25" />
            <FInput label="Observações" value={invF.obs} onChange={v => sif('obs', v)} placeholder="Opcional" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {editInvId && <Btn variant="ghost" onClick={() => { setEditInvId(null); setInvF({ nome:'',valor:'',data:'',participacao:'',obs:'' }) }}>Cancelar</Btn>}
            <Btn onClick={saveInv}>{editInvId ? 'Atualizar' : '+ Adicionar'}</Btn>
          </div>
        </Card>

        {investidores.length > 0 && (
          <>
            <div className="g-4" style={{ marginBottom: 16 }}>
              <KBlock label="Investidores"      value={investidores.length} />
              <KBlock label="Total Aportado"     value={R(totalAport)}  color={T.primary} />
              <KBlock label="Participação Total" value={Pct(totalPart)} color={totalPart>100?T.red:totalPart===100?T.green:T.primary} />
              <KBlock label="Lucro a Distribuir" value={R(calc.lucroLiq)} color={T.green} />
            </div>
            <Card style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)', borderBottom: `2px solid var(--border)` }}>
                      {['Investidor','Aporte','Part. %','Lucro Projetado','Retorno',''].map(h => (
                        <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'var(--text-sub)',textTransform:'uppercase',letterSpacing:.5,whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invCalc.map(inv => (
                      <tr key={inv.id} style={{ borderBottom: `1px solid var(--border-light)` }}>
                        <td style={{ padding:'12px 14px',fontWeight:600 }}>{inv.nome}</td>
                        <td style={{ padding:'12px 14px' }}>{R(inv.valorN)}</td>
                        <td style={{ padding:'12px 14px' }}>
                          <span style={{ background:T.primary+'18',color:T.primary,borderRadius:6,padding:'2px 8px',fontSize:12,fontWeight:700 }}>{Pct(inv.participacaoN)}</span>
                        </td>
                        <td style={{ padding:'12px 14px',fontWeight:700,color:inv.lucroProj>=0?T.green:T.red }}>{R(inv.lucroProj)}</td>
                        <td style={{ padding:'12px 14px',fontWeight:600,color:inv.retornoN>=0?T.green:T.red }}>{Pct(inv.retornoN)}</td>
                        <td style={{ padding:'12px 14px',textAlign:'right' }}>
                          <button onClick={() => { setEditInvId(inv.id); setInvF({ nome:inv.nome,valor:inv.valor,data:inv.data,participacao:inv.participacao,obs:inv.obs }) }}
                            style={{ background:'none',border:'none',cursor:'pointer',fontSize:14,color:'var(--text-sub)',marginRight:8 }}>✏️</button>
                          <button onClick={() => setConfirm({ id: inv.id, msg: `Excluir "${inv.nome}"?` })}
                            style={{ background:'none',border:'none',cursor:'pointer',fontSize:14,color:T.red }}>🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
        {investidores.length === 0 && (
          <Card style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
            <div style={{ fontWeight: 600, color: 'var(--text-sub)' }}>Nenhum investidor cadastrado</div>
          </Card>
        )}
      </div>
    )
  }

  // ── Aba: Dashboard ────────────────────────────────────────────────────────
  const renderDashboard = () => {
    const totEnt = calc.fluxoCalc.reduce((s, r) => s + r.ent, 0)
    const totSai = calc.fluxoCalc.reduce((s, r) => s + r.sai, 0)
    const pieData = [
      { name: 'Terreno', value: calc.tT, color: T.blue },
      { name: 'Obra',    value: calc.tC, color: T.red  },
    ].filter(d => d.value > 0)
    const resultData = [
      { name:'VGV',          value: calc.vgv,         color: T.blue    },
      { name:'Rec. Líquida', value: calc.recLiq,       color: T.cyan    },
      { name:'Custo Total',  value: -calc.investTotal, color: T.red     },
      { name:'Lucro Bruto',  value: calc.lucroBruto,   color: T.green   },
      { name:'Lucro Líq.',   value: calc.lucroLiq,     color: T.primary },
    ]
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontWeight: 800, fontSize: 22, margin: '0 0 4px', color: 'var(--text)' }}>{emp.nome || 'Empreendimento'}</h2>
          <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>
            {emp.tipo}{emp.cidade?` · ${emp.cidade}`:''}{emp.bairro?`, ${emp.bairro}`:''} · Status: <strong style={{ color: T.primary }}>{emp.status}</strong>
          </div>
        </div>
        <div className="g-kpi" style={{ marginBottom: 20 }}>
          <KBlock label="Total Investido"    value={R(calc.investTotal)} color={T.primary} />
          <KBlock label="VGV"                value={R(calc.vgv)}         color={T.blue}   />
          <KBlock label="Receita Prevista"   value={R(calc.recLiq)}      color={T.blue}   />
          <KBlock label="Lucro Bruto"        value={R(calc.lucroBruto)}  color={T.green}  />
          <KBlock label="Lucro Líquido"      value={R(calc.lucroLiq)}    color={calc.lucroLiq>=0?T.green:T.red} size="lg" />
          <KBlock label="ROI"                value={Pct(calc.roi)}       color={calc.roi>=25?T.green:T.primary} />
          <KBlock label="Payback"            value={calc.paybackM?Math.ceil(calc.paybackM)+' meses':'—'} />
          <KBlock label="TIR (a.a.)"         value={calc.irrAnual!==null?Pct(calc.irrAnual*100):'—'} color={T.purple} />
          <KBlock label="Total Unidades"     value={parseN(emp.unidades)||'—'} sub={emp.areaMedia?emp.areaMedia+' m² médio':undefined} />
          <KBlock label="Investidores"       value={investidores.length} />
        </div>

        <div className="g-2" style={{ marginBottom: 20 }}>
          <Card style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Distribuição de Custos</div>
            {pieData.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <PieChart width={140} height={140}>
                  <Pie data={pieData} cx={70} cy={70} innerRadius={42} outerRadius={66} dataKey="value" startAngle={90} endAngle={-270}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
                <div style={{ flex: 1 }}>
                  {pieData.map(d => (
                    <div key={d.name} style={{ display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:13 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                        <div style={{ width:10,height:10,borderRadius:'50%',background:d.color,flexShrink:0 }} />
                        <span>{d.name}</span>
                      </div>
                      <strong style={{ color: d.color }}>{R(d.value)}</strong>
                    </div>
                  ))}
                  <div style={{ paddingTop:8,borderTop:`1px solid var(--border)`,display:'flex',justifyContent:'space-between',fontSize:13 }}>
                    <strong>Total</strong><strong>{R(calc.investTotal)}</strong>
                  </div>
                </div>
              </div>
            ) : <div style={{ color:'var(--text-sub)',fontSize:13 }}>Preencha os custos para visualizar.</div>}
          </Card>
          <Card style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Resultado Financeiro</div>
            <ResponsiveContainer width="100%" height={160}>
              <ComposedChart data={resultData} layout="vertical" margin={{ top:4,right:40,left:-20,bottom:0 }}>
                <XAxis type="number" tick={{ fill:'var(--text-muted)',fontSize:9 }} axisLine={false} tickLine={false}
                  tickFormatter={v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'k':v} />
                <YAxis type="category" dataKey="name" tick={{ fill:'var(--text-sub)',fontSize:10 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip formatter={v=>[R(Math.abs(v)),'Valor']} contentStyle={{ background:'var(--card)',border:`1px solid var(--border)`,borderRadius:8,fontSize:12 }} />
                <Bar dataKey="value" radius={[0,6,6,0]} maxBarSize={28}>
                  {resultData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {calc.fluxoCalc.length > 1 && (
          <Card style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Fluxo de Caixa</div>
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={calc.fluxoCalc} margin={{ top:4,right:4,left:-10,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" tickFormatter={v=>`M${v}`} tick={{ fill:'var(--text-muted)',fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text-muted)',fontSize:9 }} axisLine={false} tickLine={false}
                  tickFormatter={v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'k':v} />
                <Tooltip formatter={(v,n)=>[R(v),n==='ent'?'Entradas':n==='sai'?'Saídas':'Acumulado']} contentStyle={{ background:'var(--card)',border:`1px solid var(--border)`,borderRadius:8,fontSize:12 }} />
                <Bar dataKey="ent" name="ent" fill={T.green} opacity={0.75} radius={[3,3,0,0]} maxBarSize={14} />
                <Bar dataKey="sai" name="sai" fill={T.red} opacity={0.75} radius={[3,3,0,0]} maxBarSize={14} />
                <Line type="monotone" dataKey="acumulado" name="acumulado" stroke={T.blue} strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        )}

        {calc.fluxoCalc.length > 0 && (
          <div className="g-3" style={{ marginBottom: 20 }}>
            <KBlock label="Total Entradas"    value={R(totEnt)}                   color={T.green}   />
            <KBlock label="Total Saídas"      value={R(totSai)}                   color={T.red}     />
            <KBlock label="Necessidade Caixa" value={R(Math.abs(calc.picoCaixa))} color={T.primary} sub="Pico de investimento" />
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn variant="outline" onClick={exportPDF}>📄 Exportar PDF Executivo</Btn>
          <Btn onClick={() => setTab('viabilidade')}>Ver Análise Completa</Btn>
        </div>
      </div>
    )
  }

  // ── Render principal ──────────────────────────────────────────────────────
  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {confirm && (
        <Confirm
          msg={confirm.msg}
          onYes={() => { setInvestidores(p => p.filter(i => i.id !== confirm.id)); setConfirm(null) }}
          onNo={() => setConfirm(null)}
        />
      )}
      <div className="page-hd">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Viabilidade de Incorporação</h1>
          {emp.nome && <div style={{ color: 'var(--text-sub)', fontSize: 14 }}>{emp.nome}{emp.cidade?` · ${emp.cidade}`:''}</div>}
        </div>
        <div className="page-actions">
          <Btn variant="outline" onClick={exportPDF}>📄 PDF</Btn>
          <Btn onClick={() => setTab('dashboard')}>Dashboard</Btn>
        </div>
      </div>
      {renderTabNav()}
      {tab === 'dados'        && renderDados()}
      {tab === 'terreno'      && renderTerreno()}
      {tab === 'custos'       && renderCustos()}
      {tab === 'receitas'     && renderReceitas()}
      {tab === 'fluxo'        && renderFluxo()}
      {tab === 'viabilidade'  && renderViabilidade()}
      {tab === 'investidores' && renderInvestidores()}
      {tab === 'dashboard'    && renderDashboard()}
    </div>
  )
}
