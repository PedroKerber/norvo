import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { T, fmt, fd, uid } from '../theme'
import { Card, Btn, Badge, StatusBadge, KpiCard, Toast, Confirm, SearchInput, Table } from '../components/ui'
import { CATS_RETIRADA, CONTAS } from '../data'
import AdvancedFilters, { defaultFilter, filterLancamentos, loadSavedFilter } from '../components/AdvancedFilters'

const TODAY = new Date().toISOString().slice(0, 10)

const TIPOS_RETIRADA = [
  { id: 'prolabore',      label: 'Pró-labore' },
  { id: 'distribuicao',   label: 'Distribuição de Lucros' },
  { id: 'adiantamento',   label: 'Adiantamento de Lucros' },
  { id: 'extraordinaria', label: 'Retirada Extraordinária' },
]

const SOCIOS = [
  { id: 'pedro', label: 'Pedro Kerber', cor: '#7c3aed' },
  { id: 'leo',   label: 'Léo Ricardo',  cor: '#2563eb' },
]

const TIPO_CORES = {
  prolabore: '#7c3aed',
  distribuicao: '#2563eb',
  adiantamento: '#ea580c',
  extraordinaria: '#9ca3af',
}

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
  return <div style={{ fontWeight: 600, fontSize: 11, color: 'var(--text-sub)', marginBottom: 4, letterSpacing: '.04em', textTransform: 'uppercase' }}>{children}</div>
}

function getCatEntry(socio, tipoRet) {
  return CATS_RETIRADA.find(c => c.socio === socio && c.tipoRet === tipoRet)
}
function getSocio(l) {
  const cat = CATS_RETIRADA.find(c => c.id === l.cat)
  if (cat?.socio) return cat.socio
  const forn = (l.fornecedor || '').toLowerCase()
  if (forn.includes('pedro')) return 'pedro'
  if (forn.includes('leo') || forn.includes('léo')) return 'leo'
  return null
}
function getTipoRet(l) {
  return CATS_RETIRADA.find(c => c.id === l.cat)?.tipoRet || null
}

function newForm() {
  return {
    socio: 'pedro', tipoRet: 'prolabore', desc: '', valor: '',
    data: TODAY, contaBancaria: CONTAS[0]?.nome || '',
    obs: '', status: 'Pago', anexo: '',
  }
}

export default function RetiradaSocios({ empresa, data, onSave, onDelete }) {
  const [filter, setFilter]     = useState(() => loadSavedFilter('x8_filter_retirada') || defaultFilter())
  const [search, setSearch]     = useState('')
  const [fSocio, setFSocio]     = useState('')
  const [fTipo, setFTipo]       = useState('')
  const [fStatus, setFStatus]   = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm]         = useState(newForm)
  const [confirm, setConfirm]   = useState(null)
  const [toast, setToast]       = useState(null)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const allLancs     = useMemo(() => data.lancamentos || [], [data.lancamentos])
  const allRetiradas = useMemo(() => allLancs.filter(l => l.tipo === 'retirada'), [allLancs])

  const filtered = useMemo(() => {
    let l = filterLancamentos(allRetiradas, filter)
    if (search)  l = l.filter(x => [x.desc, x.catNome, x.fornecedor].filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase())))
    if (fSocio)  l = l.filter(x => getSocio(x) === fSocio)
    if (fTipo)   l = l.filter(x => getTipoRet(x) === fTipo)
    if (fStatus) l = l.filter(x => x.status === fStatus)
    return [...l].sort((a, b) => (b.data || '').localeCompare(a.data || ''))
  }, [allRetiradas, filter, search, fSocio, fTipo, fStatus])

  // KPIs — seguem o filtro ativo
  const tTotal      = filtered.reduce((s, l) => s + l.valor, 0)
  const tPedro      = filtered.filter(l => getSocio(l) === 'pedro').reduce((s, l) => s + l.valor, 0)
  const tLeo        = filtered.filter(l => getSocio(l) === 'leo').reduce((s, l) => s + l.valor, 0)
  const tProlabore  = filtered.filter(l => getTipoRet(l) === 'prolabore').reduce((s, l) => s + l.valor, 0)
  const tDistrib    = filtered.filter(l => getTipoRet(l) === 'distribuicao').reduce((s, l) => s + l.valor, 0)

  // Saldo disponível = receitas recebidas − despesas pagas − retiradas do período
  const allPeriodLancs = useMemo(() => filterLancamentos(allLancs, filter), [allLancs, filter])
  const tRecPeriod     = allPeriodLancs.filter(l => l.tipo === 'receita' && l.status === 'Recebida').reduce((s, l) => s + l.valor, 0)
  const tDespPeriod    = allPeriodLancs.filter(l => l.tipo === 'despesa' && l.status === 'Paga').reduce((s, l) => s + l.valor, 0)
  const saldoDisp      = tRecPeriod - tDespPeriod - tTotal

  const openNew  = () => { setEditItem(null); setForm(newForm()); setShowForm(true) }
  const openEdit = item => {
    setEditItem(item)
    setForm({
      socio: getSocio(item) || 'pedro',
      tipoRet: getTipoRet(item) || 'prolabore',
      desc: item.desc || '',
      valor: item.valor ? item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
      data: item.data || TODAY,
      contaBancaria: item.contaBancaria || CONTAS[0]?.nome || '',
      obs: item.obs || '',
      status: item.status || 'Pago',
      anexo: item.anexo || '',
    })
    setShowForm(true)
  }

  const marcarPago = (item) => {
    if (item.status === 'Pago') return
    onSave({ ...item, status: 'Pago' }, true)
    setToast({ msg: 'Retirada marcada como paga!', type: 'success' })
  }

  const salvar = () => {
    const v = parseR(form.valor)
    if (!form.desc.trim() || v <= 0) return
    const catEntry = getCatEntry(form.socio, form.tipoRet) || CATS_RETIRADA[0]
    onSave({
      id: editItem?.id || uid(),
      tipo: 'retirada',
      cat: catEntry?.id || 'retirada_socios',
      catNome: catEntry?.nome || 'Retirada dos Sócios',
      desc: form.desc,
      valor: v,
      data: form.data,
      status: form.status,
      contaBancaria: form.contaBancaria,
      fornecedor: form.socio === 'pedro' ? 'Pedro Kerber' : 'Léo Ricardo',
      obs: form.obs,
      anexo: form.anexo,
      empId: empresa.id,
    }, !!editItem)
    setShowForm(false)
    setToast({ msg: editItem ? 'Retirada atualizada!' : 'Retirada registrada!', type: 'success' })
    setEditItem(null)
  }

  const duplicar = item => {
    onSave({ ...item, id: uid(), data: TODAY, desc: `${item.desc} (cópia)` }, false)
    setToast({ msg: 'Retirada duplicada!', type: 'success' })
  }

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(filtered.map(l => ({
      'Data':        fd(l.data) || '',
      'Sócio':       getSocio(l) === 'pedro' ? 'Pedro Kerber' : getSocio(l) === 'leo' ? 'Léo Ricardo' : '—',
      'Tipo':        TIPOS_RETIRADA.find(t => t.id === getTipoRet(l))?.label || '—',
      'Categoria':   l.catNome || '',
      'Descrição':   l.desc || '',
      'Conta':       l.contaBancaria || '',
      'Valor (R$)':  l.valor || 0,
      'Status':      l.status || '',
    })))
    XLSX.utils.book_append_sheet(wb, ws, 'Retiradas')
    XLSX.writeFile(wb, `retiradas_${filter.inicio}_${filter.fim}.xlsx`)
  }

  const chip = (val, active, setFn, label) => (
    <button key={val} onClick={() => setFn(active === val ? '' : val)} style={{
      background: active === val ? T.primary : 'var(--card)',
      border: `1.5px solid ${active === val ? T.primary : 'var(--border)'}`,
      color: active === val ? '#fff' : 'var(--text-sub)',
      borderRadius: 20, padding: '5px 14px', fontSize: 12,
      fontWeight: active === val ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit',
      whiteSpace: 'nowrap', transition: 'all .12s',
    }}>{label}</button>
  )

  const columns = [
    {
      key: 'data', label: 'Data',
      render: v => <span style={{ fontSize: 13, color: T.sub, whiteSpace: 'nowrap' }}>{fd(v)}</span>
    },
    {
      key: 'cat', label: 'Sócio',
      render: (_, row) => {
        const socio = getSocio(row)
        const info = SOCIOS.find(s => s.id === socio)
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: info?.cor || '#9ca3af', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{info?.label || '—'}</span>
          </div>
        )
      }
    },
    {
      key: '_tipo', label: 'Tipo',
      render: (_, row) => {
        const tipoRet = getTipoRet(row)
        const label = TIPOS_RETIRADA.find(t => t.id === tipoRet)?.label || '—'
        return <Badge label={label} color={TIPO_CORES[tipoRet] || '#9ca3af'} />
      }
    },
    {
      key: 'catNome', label: 'Categoria',
      render: v => <span style={{ fontSize: 12, color: T.sub }}>{v || '—'}</span>
    },
    {
      key: 'desc', label: 'Descrição',
      render: v => <span style={{ fontWeight: 500, fontSize: 13 }}>{v}</span>
    },
    {
      key: 'contaBancaria', label: 'Conta',
      render: v => <span style={{ fontSize: 12, color: T.sub }}>{v || '—'}</span>
    },
    {
      key: 'valor', label: 'Valor',
      render: v => <span style={{ fontWeight: 700, fontSize: 14, color: T.primary }}>{fmt(v)}</span>
    },
    {
      key: 'status', label: 'Status',
      render: v => <StatusBadge status={v} />
    },
    {
      key: 'id', label: 'Ações',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={e => { e.stopPropagation(); openEdit(row) }} title="Editar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: T.primary, fontSize: 13 }}>✏️</button>
          {row.status !== 'Pago' && (
            <button onClick={e => { e.stopPropagation(); marcarPago(row) }} title="Marcar como pago"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: T.green, fontSize: 14, fontWeight: 700 }}>✓</button>
          )}
          <button onClick={e => { e.stopPropagation(); duplicar(row) }} title="Duplicar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: T.sub, fontSize: 13 }}>⧉</button>
          <button onClick={e => { e.stopPropagation(); setConfirm(row) }} title="Excluir"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: T.red, fontSize: 13 }}>🗑</button>
        </div>
      )
    },
  ]

  const catEntry = getCatEntry(form.socio, form.tipoRet)

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: T.text }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {confirm && <Confirm msg={`Excluir "${confirm.desc}"?`}
        onYes={() => { onDelete(confirm.id); setConfirm(null); setToast({ msg: 'Retirada excluída!', type: 'success' }) }}
        onNo={() => setConfirm(null)} />}

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: T.primaryLight, borderRadius: 12, width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💸</div>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 26, margin: 0 }}>Retirada dos Sócios</h1>
            <div style={{ color: 'var(--text-sub)', fontSize: 14 }}>Pró-labore, distribuição de lucros e adiantamentos</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" icon="📊" onClick={exportExcel}>Excel</Btn>
          <Btn onClick={openNew}>+ Nova Retirada</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div className="g-3" style={{ marginBottom: 22 }}>
        <KpiCard icon="💸" iconBg={T.primaryLight}  label="Total retirado no período"    value={fmt(tTotal)} />
        <KpiCard icon="👤" iconBg="#f3e8ff"          label="Pedro Kerber"                 value={fmt(tPedro)} />
        <KpiCard icon="👤" iconBg="#eff6ff"          label="Léo Ricardo"                  value={fmt(tLeo)} />
        <KpiCard icon="💼" iconBg="#ede9fe"          label="Pró-labore pago"              value={fmt(tProlabore)} />
        <KpiCard icon="📈" iconBg="#eff6ff"          label="Distribuição de lucros"       value={fmt(tDistrib)} />
        <KpiCard icon={saldoDisp >= 0 ? '✅' : '⚠️'} iconBg={saldoDisp >= 0 ? T.greenL : T.redL} label="Saldo disponível p/ retirada" value={fmt(saldoDisp)} />
      </div>

      <AdvancedFilters tipo="all" filter={filter} onApply={setFilter} storageKey="x8_filter_retirada" />

      {/* FILTROS RÁPIDOS */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar retirada..." />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Sócio:</span>
            {chip('', fSocio, setFSocio, 'Todos')}
            {SOCIOS.map(s => chip(s.id, fSocio, setFSocio, s.label))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Tipo:</span>
            {chip('', fTipo, setFTipo, 'Todos')}
            {TIPOS_RETIRADA.map(t => chip(t.id, fTipo, setFTipo, t.label))}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Status:</span>
            {chip('', fStatus, setFStatus, 'Todos')}
            {chip('Pago', fStatus, setFStatus, 'Pago')}
            {chip('Pendente', fStatus, setFStatus, 'Pendente')}
          </div>
        </div>
      </Card>

      {/* TABELA */}
      <Card>
        <Table columns={columns} data={filtered} onRow={openEdit}
          emptyState={
            <div style={{ padding: 56, textAlign: 'center', color: T.muted, fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>💸</div>
              Nenhuma retirada encontrada no período selecionado.
            </div>
          }
        />
        <div style={{ padding: '12px 20px', borderTop: `1px solid var(--border)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: T.sub }}>
          <span>{filtered.length} retirada{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <span>Saldo: <strong style={{ color: saldoDisp >= 0 ? T.green : T.red }}>{fmt(saldoDisp)}</strong></span>
            <span style={{ fontWeight: 700, fontSize: 14, color: T.primary }}>Total: {fmt(tTotal)}</span>
          </div>
        </div>
      </Card>

      {/* MODAL */}
      {showForm && (
        <div onClick={e => e.target === e.currentTarget && setShowForm(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--card)', borderRadius: 16, width: '100%', maxWidth: 500, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: T.primaryLight, borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💸</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{editItem ? 'Editar Retirada' : 'Nova Retirada de Sócio'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>{empresa?.nome || 'Empresa'}</div>
                </div>
              </div>
              <button onClick={() => { setShowForm(false); setEditItem(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: T.muted, lineHeight: 1, padding: 4 }}>×</button>
            </div>

            {/* Sócio */}
            <div style={{ marginBottom: 14 }}>
              <SLabel>Sócio</SLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {SOCIOS.map(s => (
                  <button key={s.id} onClick={() => sf('socio', s.id)} style={{
                    padding: '11px 0', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                    background: form.socio === s.id ? s.cor : 'var(--bg)',
                    color: form.socio === s.id ? '#fff' : T.sub,
                    border: `2px solid ${form.socio === s.id ? s.cor : 'var(--border)'}`,
                    transition: 'all .15s',
                  }}>{s.label}</button>
                ))}
              </div>
            </div>

            {/* Tipo */}
            <div style={{ marginBottom: 14 }}>
              <SLabel>Tipo da Retirada</SLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {TIPOS_RETIRADA.map(t => (
                  <button key={t.id} onClick={() => sf('tipoRet', t.id)} style={{
                    padding: '9px 0', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                    background: form.tipoRet === t.id ? T.primary : 'var(--bg)',
                    color: form.tipoRet === t.id ? '#fff' : T.sub,
                    border: `2px solid ${form.tipoRet === t.id ? T.primary : 'var(--border)'}`,
                    transition: 'all .15s',
                  }}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* Categoria auto-detectada */}
            {catEntry && (
              <div style={{ marginBottom: 14, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 12, color: T.sub, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 600, color: T.text }}>Categoria:</span> {catEntry.nome}
              </div>
            )}

            {/* Descrição */}
            <div style={{ marginBottom: 14 }}>
              <SLabel>Descrição</SLabel>
              <input type="text" value={form.desc}
                placeholder={`Ex: Pró-labore ${form.socio === 'pedro' ? 'Pedro' : 'Léo'} — Junho/2026`}
                onChange={e => sf('desc', e.target.value)} style={iStyle(false)} />
            </div>

            {/* Valor + Data */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <SLabel>Valor (R$)</SLabel>
                <input type="text" value={form.valor} placeholder="0,00"
                  onChange={e => { const raw = e.target.value.replace(/\D/g, ''); sf('valor', maskR(raw)) }}
                  style={iStyle(false)} />
              </div>
              <div>
                <SLabel>Data</SLabel>
                <input type="date" value={form.data} onChange={e => sf('data', e.target.value)} style={iStyle(false)} />
              </div>
            </div>

            {/* Conta + Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <SLabel>Conta de Saída</SLabel>
                <div style={{ position: 'relative' }}>
                  <select value={form.contaBancaria} onChange={e => sf('contaBancaria', e.target.value)}
                    style={{ ...iStyle(false), appearance: 'none', paddingRight: 28, cursor: 'pointer' }}>
                    {CONTAS.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </select>
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.muted }}>▾</span>
                </div>
              </div>
              <div>
                <SLabel>Status</SLabel>
                <div style={{ position: 'relative' }}>
                  <select value={form.status} onChange={e => sf('status', e.target.value)}
                    style={{ ...iStyle(false), appearance: 'none', paddingRight: 28, cursor: 'pointer' }}>
                    <option value="Pago">Pago</option>
                    <option value="Pendente">Pendente</option>
                  </select>
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.muted }}>▾</span>
                </div>
              </div>
            </div>

            {/* Observações + Comprovante */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
              <div>
                <SLabel>Observações</SLabel>
                <textarea value={form.obs} onChange={e => sf('obs', e.target.value)}
                  placeholder="Informações adicionais..." rows={2}
                  style={{ ...iStyle(false), resize: 'vertical', minHeight: 60 }} />
              </div>
              <div>
                <SLabel>Comprovante (opcional)</SLabel>
                <input type="text" value={form.anexo}
                  placeholder="Nº do recibo, NF ou arquivo..."
                  onChange={e => sf('anexo', e.target.value)}
                  style={iStyle(false)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: `1px solid var(--border)`, paddingTop: 18 }}>
              <Btn variant="ghost" onClick={() => { setShowForm(false); setEditItem(null) }}>Cancelar</Btn>
              <Btn onClick={salvar} disabled={!form.desc.trim() || !parseR(form.valor)}>
                {editItem ? 'Salvar Alterações' : 'Registrar Retirada'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
