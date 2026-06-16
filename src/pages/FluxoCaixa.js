import { useMemo, useState } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { T, fmt, fmtS } from '../theme'
import { genFluxoCaixaData } from '../data'
import { Card, KpiCard } from '../components/ui'
import CompetenciaSelector, { COMPETENCIA_DEFAULT, filterByCompetencia } from '../components/CompetenciaSelector'

export default function FluxoCaixa({ data }) {
  const [comp, setComp] = useState(COMPETENCIA_DEFAULT)
  const [view, setView] = useState('diario')
  const allLancs = useMemo(() => data.lancamentos || [], [data.lancamentos])
  const lancs = useMemo(() => filterByCompetencia(allLancs, comp), [allLancs, comp])
  const fluxoData = useMemo(() => genFluxoCaixaData(lancs), [lancs])

  const totalEnt = fluxoData.reduce((s, d) => s + d.entradas, 0)
  const totalSaid = fluxoData.reduce((s, d) => s + d.saidas, 0)
  const saldoPer = totalEnt - totalSaid
  const saldoAcum = fluxoData[fluxoData.length - 1]?.saldo || 320000

  const displayData = view === 'diario'
    ? fluxoData.filter((_, i) => i % 2 === 0)
    : view === 'semanal'
      ? [0, 7, 14, 21, 28].map(i => ({
        dia: `Sem ${Math.floor(i / 7) + 1}`,
        entradas: fluxoData.slice(i, i + 7).reduce((s, d) => s + d.entradas, 0),
        saidas: fluxoData.slice(i, i + 7).reduce((s, d) => s + d.saidas, 0),
        saldo: fluxoData[Math.min(i + 6, 30)]?.saldo || 0,
      }))
      : [{ dia: 'Maio/2026', entradas: totalEnt, saidas: totalSaid, saldo: saldoAcum }]

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: T.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Fluxo de Caixa</h1>
          <div style={{ color: T.sub, fontSize: 14 }}>Controle de entradas, saídas e saldo acumulado.</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <CompetenciaSelector {...comp} onChange={setComp} />
          <button style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
            ↑ Exportar
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard icon="↑" iconBg={T.greenL} label="Total de entradas" value={fmt(totalEnt)} delta={18.2} />
        <KpiCard icon="↓" iconBg={T.redL} label="Total de saídas" value={fmt(totalSaid)} delta={-6.8} />
        <KpiCard icon="=" iconBg={T.blueL} label="Saldo do período" value={fmt(saldoPer)} delta={42.1} />
        <KpiCard icon="🏦" iconBg={T.yellowL} label="Saldo acumulado" value={fmt(saldoAcum)} delta={12.6} />
      </div>

      <Card style={{ padding: 20, marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Fluxo de Caixa - Maio/2026</div>
            <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
              {[['Entradas', T.green], ['Saídas', T.red], ['Saldo acumulado', T.primary]].map(([l, c]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: T.sub }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />{l}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['diario', 'Diário'], ['semanal', 'Semanal'], ['mensal', 'Mensal']].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{ background: view === v ? T.primary : T.bg, color: view === v ? '#fff' : T.sub, border: `1px solid ${view === v ? T.primary : T.border}`, borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: view === v ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={displayData} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
            <XAxis dataKey="dia" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} />
            <Tooltip formatter={v => fmt(v)} contentStyle={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="entradas" fill={T.green} opacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={20} name="Entradas" />
            <Bar dataKey="saidas" fill={T.red} opacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={20} name="Saídas" />
            <Line type="monotone" dataKey="saldo" stroke={T.primary} strokeWidth={2.5} dot={{ r: 3, fill: T.primary }} name="Saldo" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Projeções */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { periodo: '30 dias', entradas: totalEnt * 1.05, saidas: totalSaid * 0.98, cor: T.green },
          { periodo: '60 dias', entradas: totalEnt * 2.1, saidas: totalSaid * 1.95, cor: T.blue },
          { periodo: '90 dias', entradas: totalEnt * 3.2, saidas: totalSaid * 2.9, cor: T.purple },
        ].map(p => (
          <Card key={p.periodo} style={{ padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: p.cor }}>Projeção {p.periodo}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: T.sub }}>Entradas previstas</span>
              <span style={{ color: T.green, fontWeight: 600 }}>{fmtS(p.entradas)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
              <span style={{ color: T.sub }}>Saídas previstas</span>
              <span style={{ color: T.red, fontWeight: 600 }}>{fmtS(p.saidas)}</span>
            </div>
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>Saldo projetado</span>
                <span style={{ fontWeight: 800, color: p.cor }}>{fmtS(p.entradas - p.saidas)}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
