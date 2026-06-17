import { useState, useMemo } from 'react'
import { T, uid } from '../theme'
import { Card, Btn, Input, Modal } from '../components/ui'
import { CATS_RECEITA, CATS_DESPESA } from '../data'

const ICONS_DESPESA = { marketing: '📣', comercial: '💼', administrativo: '🏛', trafego_pago: '📱', operacional: '⚙', tecnologia: '💻', folha_pagamento: '👥', aluguel_escritorio: '🏠', impostos: '📋' }
const ICONS_RECEITA = { venda_imoveis: '🏠', locacao: '🔑', alugueis: '🔑', comissoes: '💰', consultoria: '📊', prestacao_servicos: '🤝', outras_receitas: '💵' }

const EMPTY_CAT = { nome: '', tipo: 'despesa', descricao: '', cor: '#2563eb' }

export default function Categorias({ data, extraCats = [], onSaveCat, onDeleteCat }) {
  const lancamentos = useMemo(() => data.lancamentos || [], [data.lancamentos])
  const [tab, setTab] = useState('Todas')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_CAT)
  const [isEdit, setIsEdit] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const allCats = useMemo(() => {
    const despesas = CATS_DESPESA.map(c => ({ ...c, tipo: 'despesa', descricao: 'Categoria de despesa', icon: ICONS_DESPESA[c.id] || '📂', builtin: true }))
    const receitas = CATS_RECEITA.map(c => ({ ...c, tipo: 'receita', descricao: 'Categoria de receita', icon: ICONS_RECEITA[c.id] || '💵', builtin: true }))
    return [...despesas, ...receitas, ...extraCats]
  }, [extraCats])

  const usageCount = useMemo(() => {
    const map = {}
    lancamentos.forEach(l => { map[l.cat] = (map[l.cat] || 0) + 1 })
    return map
  }, [lancamentos])

  const filtered = useMemo(() => {
    let list = allCats
    if (tab === 'Despesas') list = list.filter(c => c.tipo === 'despesa')
    if (tab === 'Receitas') list = list.filter(c => c.tipo === 'receita')
    if (search) list = list.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [allCats, tab, search])

  const totalDespesas = allCats.filter(c => c.tipo === 'despesa').length
  const totalReceitas = allCats.filter(c => c.tipo === 'receita').length

  const topUsadas = useMemo(() => {
    return allCats
      .map(c => ({ ...c, usos: usageCount[c.id] || 0 }))
      .filter(c => c.usos > 0)
      .sort((a, b) => b.usos - a.usos)
      .slice(0, 4)
  }, [allCats, usageCount])

  const maxUsos = topUsadas[0]?.usos || 1

  const openAdd = () => { setForm(EMPTY_CAT); setIsEdit(false); setModal(true) }
  const openEdit = cat => { setForm({ ...cat }); setIsEdit(true); setModal(true) }

  const handleSave = () => {
    if (!form.nome.trim()) return
    const cat = isEdit ? form : { ...form, id: uid(), builtin: false, icon: '📂' }
    if (onSaveCat) onSaveCat(cat, isEdit)
    setModal(false)
  }

  const handleDelete = id => {
    if (onDeleteCat) onDeleteCat(id)
    setConfirm(null)
  }

  const TABS = ['Todas', 'Despesas', 'Receitas']

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: T.text }}>
      {/* Header */}
      <div className="page-hd">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Categorias</h1>
          <div style={{ color: T.sub, fontSize: 14 }}>Organize e gerencie todas as categorias de receitas e despesas.</div>
        </div>
        <Btn onClick={openAdd} icon="＋">Nova Categoria</Btn>
      </div>

      {/* KPIs */}
      <div className="g-4">
        {[
          { icon: '🏷', bg: T.blueL, label: 'Total de Categorias', value: allCats.length },
          { icon: '💸', bg: T.redL, label: 'Despesas', value: totalDespesas },
          { icon: '💵', bg: T.greenL, label: 'Receitas', value: totalReceitas },
          { icon: '⭐', bg: T.purpleL, label: 'Mais utilizadas', value: topUsadas.length },
        ].map(k => (
          <Card key={k.label} style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: k.bg, borderRadius: 10, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{k.icon}</div>
              <div>
                <div style={{ color: T.sub, fontSize: 12 }}>{k.label}</div>
                <div style={{ fontWeight: 800, fontSize: 24 }}>{k.value}</div>
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
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar categoria por nome..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', border: `1.5px solid ${T.border}`, borderRadius: 8, background: T.white, color: T.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Tabela */}
      <Card style={{ padding: 0, marginBottom: 20 }}>
        <div className="tbl-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {['Categoria', 'Tipo', 'Descrição', 'Status', 'Ações'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: T.sub, fontWeight: 600, borderBottom: `1px solid ${T.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(cat => (
              <tr key={cat.id} style={{ borderBottom: `1px solid ${T.borderLight}` }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: (cat.cor || T.primary) + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      {cat.icon || '📂'}
                    </div>
                    <span style={{ fontWeight: 600 }}>{cat.nome}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    background: cat.tipo === 'receita' ? T.greenL : T.redL,
                    color: cat.tipo === 'receita' ? T.green : T.red,
                    fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '3px 10px'
                  }}>{cat.tipo === 'receita' ? 'Receita' : 'Despesa'}</span>
                </td>
                <td style={{ padding: '12px 16px', color: T.sub, maxWidth: 240 }}>{cat.descricao}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: T.green, fontWeight: 600 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.green, display: 'inline-block' }} />Ativa
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(cat)} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                    {!cat.builtin && (
                      <button onClick={() => setConfirm(cat.id)} style={{ background: 'none', border: `1px solid ${T.redL}`, borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontSize: 14, color: T.red }}>🗑</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div style={{ padding: '12px 16px', color: T.muted, fontSize: 12 }}>
          Mostrando {filtered.length} de {allCats.length} categorias
        </div>
      </Card>

      {/* Bottom */}
      {topUsadas.length > 0 && (
        <div className="g-2">
          <Card style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ fontSize: 36 }}>⚙️</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Dica de organização</div>
                <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5 }}>Mantenha suas categorias organizadas para obter relatórios mais precisos e uma visão clara das finanças da sua empresa.</div>
              </div>
            </div>
          </Card>
          <Card style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Categorias mais utilizadas</div>
            {topUsadas.map(c => (
              <div key={c.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>{c.icon} {c.nome}</span>
                  <span style={{ fontWeight: 700 }}>{Math.round(c.usos / maxUsos * 100)}%</span>
                </div>
                <div style={{ height: 6, background: T.borderLight, borderRadius: 4 }}>
                  <div style={{ height: '100%', width: `${c.usos / maxUsos * 100}%`, background: c.tipo === 'receita' ? T.green : T.red, borderRadius: 4, transition: 'width .4s' }} />
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <Modal title={isEdit ? 'Editar Categoria' : 'Nova Categoria'} onClose={() => setModal(false)}
          footer={<><Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn><Btn onClick={handleSave}>{isEdit ? 'Salvar' : 'Criar'}</Btn></>}>
          <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Marketing Digital" />
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: T.text, marginBottom: 5 }}>Tipo</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['receita', 'despesa'].map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                  style={{ flex: 1, padding: '9px 0', border: `2px solid ${form.tipo === t ? T.primary : T.border}`, borderRadius: 8, background: form.tipo === t ? T.primaryLight : T.white, color: form.tipo === t ? T.primary : T.sub, fontWeight: form.tipo === t ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, textTransform: 'capitalize' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Input label="Descrição" value={form.descricao || ''} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Breve descrição da categoria" />
        </Modal>
      )}

      {confirm && (
        <Modal title="Excluir categoria" onClose={() => setConfirm(null)}
          footer={<><Btn variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Btn><Btn variant="danger" onClick={() => handleDelete(confirm)}>Excluir</Btn></>}>
          <p style={{ color: T.sub }}>Tem certeza que deseja excluir esta categoria?</p>
        </Modal>
      )}
    </div>
  )
}
