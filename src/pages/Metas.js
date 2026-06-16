import { useState, useMemo } from 'react'
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts'
import { T, fmtS, fmtPct, fd, uid } from '../theme'
import { Card, Btn, KpiCard, Badge, Input, Modal } from '../components/ui'

const TIPOS = [
  { id: 'receita', nome: 'Receita', cor: T.green, icon: '↑' },
  { id: 'lucro', nome: 'Lucro Líquido', cor: T.blue, icon: '💰' },
  { id: 'margem', nome: 'Margem', cor: T.purple, icon: '%' },
  { id: 'despesa', nome: 'Redução de Despesa', cor: T.orange, icon: '↓' },
  { id: 'caixa', nome: 'Saldo em Caixa', cor: T.cyan, icon: '🏦' },
  { id: 'investimento', nome: 'Investimento', cor: T.yellow, icon: '📈' },
]

const tipoInfo = id => TIPOS.find(t => t.id === id) || TIPOS[0]

const CircleProgress = ({ pct, cor, size = 80 }) => {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(pct / 100, 1) * circ
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.borderLight} strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={cor} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize={13} fontWeight={800} fill={cor}>
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

const EMPTY = { nome: '', tipo: 'receita', objetivo: '', acumulado: '', prazo: '2026-12-31', descricao: '' }

export default function Metas({ empresa, data, onSave, onDelete }) {
  const metas = useMemo(() => data.metas || [], [data.metas])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [isEdit, setIsEdit] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const atingidas = metas.filter(m => m.acumulado >= m.objetivo).length
  const emAndamento = metas.filter(m => m.acumulado < m.objetivo).length
  const progGeral = metas.length
    ? metas.reduce((s, m) => s + Math.min(m.acumulado / m.objetivo, 1), 0) / metas.length * 100
    : 0

  const openAdd = () => { setForm(EMPTY); setIsEdit(false); setModal(true) }
  const openEdit = m => { setForm({ ...m }); setIsEdit(true); setModal(true) }

  const handleSave = () => {
    if (!form.nome.trim() || !form.objetivo) return
    const item = {
      ...form,
      id: isEdit ? form.id : uid(),
      objetivo: parseFloat(form.objetivo) || 0,
      acumulado: parseFloat(form.acumulado) || 0,
      empId: empresa.id,
    }
    onSave(item, isEdit, 'meta')
    setModal(false)
  }

  const handleDelete = id => {
    onDelete(id, 'meta')
    setConfirm(null)
  }

  const isMargem = form.tipo === 'margem'

  const chartData = metas.map(m => ({
    name: m.nome,
    value: Math.min(Math.round(m.acumulado / m.objetivo * 100), 100),
    fill: tipoInfo(m.tipo).cor,
  }))

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: T.text }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Metas Financeiras</h1>
          <div style={{ color: T.sub, fontSize: 14 }}>Acompanhe e gerencie os objetivos da empresa.</div>
        </div>
        <Btn onClick={openAdd} icon="＋">Nova Meta</Btn>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard icon="🎯" iconBg={T.primaryLight} label="Total de metas" value={metas.length} />
        <KpiCard icon="✅" iconBg={T.greenL} label="Metas atingidas" value={atingidas} delta={atingidas > 0 ? 100 : 0} deltaLabel="concluídas" />
        <KpiCard icon="⏳" iconBg={T.yellowL} label="Em andamento" value={emAndamento} />
        <KpiCard icon="📊" iconBg={T.blueL} label="Progresso geral" value={fmtPct(progGeral)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: metas.length > 0 ? '1fr 300px' : '1fr', gap: 18 }}>
        {/* Cards de metas */}
        <div>
          {metas.length === 0 ? (
            <Card style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Nenhuma meta cadastrada</div>
              <div style={{ color: T.sub, fontSize: 14, marginBottom: 20 }}>Crie metas financeiras para acompanhar o desempenho da empresa.</div>
              <Btn onClick={openAdd} icon="＋">Criar primeira meta</Btn>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {metas.map(m => {
                const info = tipoInfo(m.tipo)
                const pct = m.objetivo > 0 ? Math.min(m.acumulado / m.objetivo * 100, 100) : 0
                const atingida = m.acumulado >= m.objetivo
                const isMg = m.tipo === 'margem'
                const diasRestantes = m.prazo
                  ? Math.ceil((new Date(m.prazo) - new Date()) / 86400000)
                  : null

                return (
                  <Card key={m.id} style={{ padding: 20 }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div style={{ background: info.cor + '18', color: info.cor, borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                            {info.icon}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{m.nome}</div>
                            <Badge label={info.nome} color={info.cor} />
                          </div>
                        </div>
                      </div>
                      <CircleProgress pct={pct} cor={atingida ? T.green : info.cor} size={72} />
                    </div>

                    {/* Valores */}
                    <div style={{ background: T.bg, borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                        <span style={{ color: T.sub }}>Objetivo</span>
                        <span style={{ fontWeight: 700, color: T.text }}>
                          {isMg ? fmtPct(m.objetivo) : fmtS(m.objetivo)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: T.sub }}>Acumulado</span>
                        <span style={{ fontWeight: 700, color: atingida ? T.green : info.cor }}>
                          {isMg ? fmtPct(m.acumulado) : fmtS(m.acumulado)}
                        </span>
                      </div>
                    </div>

                    {/* Barra de progresso */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ height: 6, background: T.borderLight, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: atingida ? T.green : info.cor, borderRadius: 4, transition: 'width .5s' }} />
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 12, color: T.muted }}>
                        {m.prazo && (
                          <span style={{ color: diasRestantes !== null && diasRestantes < 30 ? T.orange : T.muted }}>
                            📅 {fd(m.prazo)}
                            {diasRestantes !== null && diasRestantes > 0 && ` · ${diasRestantes}d restantes`}
                            {diasRestantes !== null && diasRestantes <= 0 && <span style={{ color: T.red }}> · Vencida</span>}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn sm variant="ghost" onClick={() => openEdit(m)}>Editar</Btn>
                        <Btn sm variant="danger" onClick={() => setConfirm(m.id)}>✕</Btn>
                      </div>
                    </div>

                    {atingida && (
                      <div style={{ marginTop: 10, background: T.greenL, color: T.green, borderRadius: 6, padding: '6px 10px', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
                        🏆 Meta atingida!
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Painel lateral — gráfico radial */}
        {metas.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Visão Geral</div>
              <div style={{ color: T.sub, fontSize: 12, marginBottom: 16 }}>Progresso por meta</div>
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart innerRadius={20} outerRadius={90} data={chartData} startAngle={90} endAngle={-270}>
                  <RadialBar minAngle={5} dataKey="value" cornerRadius={4} />
                  <Tooltip formatter={v => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${T.border}` }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {metas.map(m => {
                  const info = tipoInfo(m.tipo)
                  const pct = m.objetivo > 0 ? Math.min(m.acumulado / m.objetivo * 100, 100) : 0
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: info.cor, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nome}</span>
                      <span style={{ fontWeight: 700, color: info.cor }}>{Math.round(pct)}%</span>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Resumo</div>
              {[
                { label: 'Metas atingidas', value: `${atingidas} / ${metas.length}`, cor: T.green },
                { label: 'Em andamento', value: emAndamento, cor: T.yellow },
                { label: 'Progresso geral', value: fmtPct(progGeral), cor: T.blue },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.borderLight}`, fontSize: 13 }}>
                  <span style={{ color: T.sub }}>{r.label}</span>
                  <span style={{ fontWeight: 700, color: r.cor }}>{r.value}</span>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>

      {/* Modal add/edit */}
      {modal && (
        <Modal title={isEdit ? 'Editar Meta' : 'Nova Meta'} onClose={() => setModal(false)}
          footer={<><Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn><Btn onClick={handleSave}>{isEdit ? 'Salvar' : 'Criar Meta'}</Btn></>}>
          <Input label="Nome da meta" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Meta de Receita Anual" />

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: T.text, marginBottom: 5 }}>Tipo</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {TIPOS.map(t => (
                <div key={t.id} onClick={() => setForm(f => ({ ...f, tipo: t.id }))}
                  style={{ border: `2px solid ${form.tipo === t.id ? t.cor : T.border}`, borderRadius: 8, padding: '8px 10px', cursor: 'pointer', background: form.tipo === t.id ? t.cor + '12' : T.white, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: form.tipo === t.id ? 700 : 400, color: form.tipo === t.id ? t.cor : T.sub }}>
                  <span>{t.icon}</span>{t.nome}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label={isMargem ? 'Objetivo (%)' : 'Objetivo (R$)'} type="number" value={form.objetivo}
              onChange={e => setForm(f => ({ ...f, objetivo: e.target.value }))} placeholder={isMargem ? '45' : '1000000'} />
            <Input label={isMargem ? 'Acumulado (%)' : 'Acumulado (R$)'} type="number" value={form.acumulado}
              onChange={e => setForm(f => ({ ...f, acumulado: e.target.value }))} placeholder={isMargem ? '39.8' : '750000'} />
          </div>

          <Input label="Prazo" type="date" value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))} />
        </Modal>
      )}

      {/* Confirm delete */}
      {confirm && (
        <Modal title="Excluir meta" onClose={() => setConfirm(null)}
          footer={<><Btn variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Btn><Btn variant="danger" onClick={() => handleDelete(confirm)}>Excluir</Btn></>}>
          <p style={{ color: T.sub }}>Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.</p>
        </Modal>
      )}
    </div>
  )
}
