import { useState, useMemo, useEffect, useCallback } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { T, uid, fmtS } from '../theme'
import { Card, Btn, Input, Modal } from '../components/ui'
import { getCentroCustos, saveCentroCusto, deleteCentroCusto } from '../supabase'

// Centros demo — semeados no Supabase, por empresa, na 1ª carga (idempotente)
const CENTROS_INICIAIS = [
  { id: 'adm', nome: 'Administrativo', desc: 'Despesas administrativas gerais', ativo: true, responsavel: '', email: '', empresaId: 'kz' },
  { id: 'com', nome: 'Comercial', desc: 'Despesas do setor comercial', ativo: true, responsavel: '', email: '', empresaId: 'kz' },
  { id: 'mkt', nome: 'Marketing', desc: 'Ações de marketing e publicidade', ativo: true, responsavel: '', email: '', empresaId: 'kz' },
  { id: 'ope', nome: 'Operacional', desc: 'Despesas operacionais', ativo: true, responsavel: '', email: '', empresaId: 'kzl' },
  { id: 'fin', nome: 'Financeiro', desc: 'Despesas financeiras', ativo: true, responsavel: '', email: '', empresaId: 'kz' },
  { id: 'rh', nome: 'Recursos Humanos', desc: 'Despesas com pessoal', ativo: true, responsavel: '', email: '', empresaId: 'kz' },
  { id: 'tec', nome: 'Tecnologia', desc: 'Infraestrutura e sistemas', ativo: true, responsavel: '', email: '', empresaId: 'ax' },
]

const ICONS_CC = { adm: '🏛', com: '💼', mkt: '📣', ope: '⚙', fin: '💰', rh: '👥', tec: '💻' }
const PIE_COLORS = [T.orange, T.blue, T.red, T.green, T.purple, T.cyan, T.yellow]

const EMPTY = { nome: '', desc: '', responsavel: '', email: '', ativo: true }

export default function CentroCusto({ empresa, data }) {
  const lancamentos = useMemo(() => data.lancamentos || [], [data.lancamentos])
  const [centros, setCentros] = useState([])
  const [tab, setTab] = useState('Todos')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [isEdit, setIsEdit] = useState(false)
  const [confirm, setConfirm] = useState(null)

  // Carrega os centros de custo da empresa (Fase 1 — Supabase, por empresa)
  useEffect(() => {
    if (!empresa?.id) return
    const empId = empresa.id
    ;(async () => {
      try {
        let cc = await getCentroCustos(empId)
        // Semeia os centros demo desta empresa na 1ª carga (uma vez)
        const flag = `x8_cc_seed_${empId}`
        if (cc.length === 0 && localStorage.getItem(flag) !== '1') {
          const demo = CENTROS_INICIAIS.filter(c => c.empresaId === empId)
          for (const c of demo) { try { await saveCentroCusto(c, empId) } catch {} }
          localStorage.setItem(flag, '1')
          if (demo.length > 0) cc = await getCentroCustos(empId)
        }
        setCentros(cc)
      } catch { setCentros([]) }
    })()
  }, [empresa])

  const gastos = useMemo(() => {
    const map = {}
    lancamentos.filter(l => l.tipo === 'despesa').forEach(l => {
      const cc = l.centroCusto || ''
      if (cc) map[cc.toLowerCase()] = (map[cc.toLowerCase()] || 0) + l.valor
    })
    return map
  }, [lancamentos])

  const gastoTotal = Object.values(gastos).reduce((s, v) => s + v, 0)
  const getCentroCustoGasto = (nome) => gastos[nome.toLowerCase()] || 0

  const filtered = useMemo(() => {
    let list = centros
    if (tab === 'Ativos') list = list.filter(c => c.ativo)
    if (tab === 'Inativos') list = list.filter(c => !c.ativo)
    if (search) list = list.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [centros, tab, search])

  const ativos = centros.filter(c => c.ativo).length
  const inativos = centros.length - ativos

  const pieData = centros.filter(c => c.ativo).map(c => ({
    name: c.nome, value: getCentroCustoGasto(c.nome)
  })).filter(d => d.value > 0).sort((a, b) => b.value - a.value)

  const openAdd = () => { setForm(EMPTY); setIsEdit(false); setModal(true) }
  const openEdit = c => { setForm({ ...c }); setIsEdit(true); setModal(true) }

  const handleSave = useCallback(async () => {
    if (!form.nome.trim() || !empresa?.id) return
    const cc = isEdit ? form : { ...form, id: uid() }
    try { await saveCentroCusto(cc, empresa.id) } catch {}
    setCentros(prev => isEdit ? prev.map(c => c.id === cc.id ? cc : c) : [...prev, cc])
    setModal(false)
  }, [form, isEdit, empresa])

  const handleDelete = useCallback(async (id) => {
    try { await deleteCentroCusto(id) } catch {}
    setCentros(prev => prev.filter(c => c.id !== id))
    setConfirm(null)
  }, [])

  const toggleAtivo = useCallback(async (c) => {
    const cc = { ...c, ativo: !c.ativo }
    try { await saveCentroCusto(cc, empresa?.id) } catch {}
    setCentros(prev => prev.map(x => x.id === cc.id ? cc : x))
  }, [empresa])

  const TABS = ['Todos', 'Ativos', 'Inativos']

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: T.text }}>
      {/* Header */}
      <div className="page-hd">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Centro de Custo</h1>
          <div style={{ color: T.sub, fontSize: 14 }}>Organize e analise seus gastos por centro de custo.</div>
        </div>
        <Btn onClick={openAdd} icon="＋">Novo Centro de Custo</Btn>
      </div>

      {/* KPIs */}
      <div className="g-4">
        {[
          { icon: '📊', bg: T.blueL, label: 'Total de Centros', value: centros.length, sub: 'Centros cadastrados' },
          { icon: '✅', bg: T.greenL, label: 'Centros Ativos', value: ativos, sub: `${Math.round(ativos / Math.max(centros.length, 1) * 100)}% do total` },
          { icon: '⏸', bg: T.borderLight, label: 'Centros Inativos', value: inativos, sub: `${Math.round(inativos / Math.max(centros.length, 1) * 100)}% do total` },
          { icon: '💸', bg: T.purpleL, label: 'Gasto Total (Mês)', value: fmtS(gastoTotal), sub: 'Todos os centros' },
        ].map(k => (
          <Card key={k.label} style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: k.bg, borderRadius: 10, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{k.icon}</div>
              <div>
                <div style={{ color: T.sub, fontSize: 11 }}>{k.label}</div>
                <div style={{ fontWeight: 800, fontSize: typeof k.value === 'string' ? 16 : 24 }}>{k.value}</div>
                <div style={{ color: T.muted, fontSize: 11 }}>{k.sub}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 18, borderBottom: `2px solid ${T.borderLight}` }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: tab === t ? 700 : 400,
            color: tab === t ? T.primary : T.sub, borderBottom: tab === t ? `2px solid ${T.primary}` : '2px solid transparent', marginBottom: -2,
          }}>{t}</button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar centro de custo por nome..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', border: `1.5px solid ${T.border}`, borderRadius: 8, background: T.white, color: T.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Tabela */}
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.bg }}>
                {['Centro de Custo', 'Responsável', 'Status', 'Gasto (Mês)', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: T.sub, fontWeight: 600, borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const gasto = getCentroCustoGasto(c.nome)
                return (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${T.borderLight}` }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: PIE_COLORS[i % PIE_COLORS.length] + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                          {ICONS_CC[c.id] || '📊'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.nome}</div>
                          <div style={{ color: T.muted, fontSize: 11 }}>{c.desc}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {c.responsavel ? (
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.responsavel}</div>
                          <div style={{ color: T.muted, fontSize: 11 }}>{c.email}</div>
                        </div>
                      ) : <span style={{ color: T.muted }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: c.ativo ? T.green : T.muted, fontWeight: 600 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.ativo ? T.green : T.muted, display: 'inline-block' }} />
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: gasto > 0 ? T.text : T.muted }}>
                      {gasto > 0 ? fmtS(gasto) : 'R$ 0,00'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(c)} title="Editar" style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                        <button onClick={() => toggleAtivo(c)}
                          style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: c.ativo ? T.sub : T.green, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                          {c.ativo ? 'Desativar' : 'Reativar'}
                        </button>
                        <button onClick={() => setConfirm(c.id)} title="Excluir" style={{ background: 'none', border: `1px solid ${T.redL}`, borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontSize: 14, color: T.red }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', color: T.muted, fontSize: 12 }}>
          Mostrando 1 a {filtered.length} de {centros.length} centros de custo
        </div>
      </Card>

      {/* Bottom */}
      <div className="g-2">
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ fontSize: 36 }}>💡</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Dica de gestão</div>
              <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5 }}>Utilize centros de custo para ter visibilidade detalhada dos gastos e tomar decisões mais assertivas para o seu negócio.</div>
            </div>
          </div>
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Gastos por Centro de Custo (Mês)</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => fmtS(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${T.border}` }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 13 }}>
              Nenhum gasto registrado por centro de custo
            </div>
          )}
        </Card>
      </div>

      {/* Modal */}
      {modal && (
        <Modal title={isEdit ? 'Editar Centro de Custo' : 'Novo Centro de Custo'} onClose={() => setModal(false)}
          footer={<><Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn><Btn onClick={handleSave}>{isEdit ? 'Salvar' : 'Criar'}</Btn></>}>
          <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Operacional" />
          <Input label="Descrição" value={form.desc || ''} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="Breve descrição" />
          <Input label="Responsável" value={form.responsavel || ''} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Nome do responsável" />
          <Input label="E-mail" type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com.br" />
        </Modal>
      )}

      {confirm && (
        <Modal title="Excluir centro de custo" onClose={() => setConfirm(null)}
          footer={<><Btn variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Btn><Btn variant="danger" onClick={() => handleDelete(confirm)}>Excluir</Btn></>}>
          <p style={{ color: T.sub }}>Tem certeza que deseja excluir este centro de custo?</p>
        </Modal>
      )}
    </div>
  )
}
