import { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react'
import { T, fmt, fd, uid } from '../theme'

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function addMesesYM(ym, n) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function fmtMesAno(ym) {
  if (!ym) return '—'
  const [y, m] = ym.split('-').map(Number)
  return `${MESES_PT[m - 1]}/${y}`
}

function vencParaMes(baseVenc, ym) {
  if (!baseVenc || !ym) return ym ? ym + '-01' : ''
  const day = parseInt(baseVenc.slice(8, 10), 10)
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`
}

const Toggle = ({ checked, onChange }) => (
  <div onClick={() => onChange(!checked)} style={{
    width: 46, height: 26, borderRadius: 13, cursor: 'pointer',
    background: checked ? '#16a34a' : 'var(--border)',
    position: 'relative', transition: 'background .2s', flexShrink: 0,
  }}>
    <div style={{
      position: 'absolute', top: 3, left: checked ? 23 : 3,
      width: 20, height: 20, borderRadius: '50%', background: '#fff',
      transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.3)',
    }} />
  </div>
)

const RLabel = ({ children }) => (
  <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-sub)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
    {children}
  </div>
)

const RadioRow = ({ value, current, onChange, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }} onClick={() => onChange(value)}>
    <div style={{
      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
      border: `2px solid ${current === value ? T.primary : 'var(--border)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {current === value && <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.primary }} />}
    </div>
    <span style={{ fontSize: 13, color: current === value ? T.primary : 'var(--text)' }}>{label}</span>
  </div>
)

const CheckRow = ({ checked, onChange, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }} onClick={() => onChange(!checked)}>
    <div style={{
      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
      border: `2px solid ${checked ? T.primary : 'var(--border)'}`,
      background: checked ? T.primary : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {checked && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</span>}
    </div>
    <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{label}</span>
  </div>
)

const RecorrenciaPanel = forwardRef(function RecorrenciaPanel(
  { baseVencimento, baseMesAno, baseValor = 0, tipo = 'despesa', onDataChange },
  ref
) {
  const baseMes = baseMesAno || new Date().toISOString().slice(0, 7)
  const accent = tipo === 'despesa' ? T.red : T.green
  const accentLight = tipo === 'despesa' ? T.redL : T.greenL

  const [active, setActive] = useState(false)
  const [tipoRec, setTipoRec] = useState('mensal')
  const [periodoGer, setPeriodoGer] = useState('proximos')
  const [quantidade, setQuantidade] = useState(6)
  const [mesesSel, setMesesSel] = useState([])
  const [opcoes, setOpcoes] = useState({
    mesmaDataVenc: true,
    editarValorMes: false,
    manterStatus: true,
    criarVinculo: true,
    gerarParcelas: false,
  })
  const [reajuste, setReajuste] = useState({ ativo: false, tipo: 'percentual', valor: 8 })
  const [showPrevia, setShowPrevia] = useState(false)

  const gridMeses = useMemo(() => {
    let start
    if (periodoGer === 'proximos') start = addMesesYM(baseMes, 1)
    else if (periodoGer === 'anteriores') start = addMesesYM(baseMes, -11)
    else start = addMesesYM(baseMes, -5)
    return Array.from({ length: 12 }, (_, i) => addMesesYM(start, i))
  }, [baseMes, periodoGer])

  useEffect(() => {
    if (!active) return
    let months
    if (periodoGer === 'proximos') {
      months = Array.from({ length: quantidade }, (_, i) => addMesesYM(baseMes, i + 1))
    } else if (periodoGer === 'anteriores') {
      months = Array.from({ length: quantidade }, (_, i) => addMesesYM(baseMes, -(i + 1))).reverse()
    } else {
      const half = Math.floor(quantidade / 2)
      const prev = Array.from({ length: half }, (_, i) => addMesesYM(baseMes, -(i + 1))).reverse()
      const next = Array.from({ length: quantidade - half }, (_, i) => addMesesYM(baseMes, i + 1))
      months = [...prev, ...next]
    }
    setMesesSel(months)
  }, [active, quantidade, periodoGer, baseMes])

  const toggleMes = ym => setMesesSel(p =>
    p.includes(ym) ? p.filter(m => m !== ym) : [...p, ym].sort()
  )

  const lancamentosPrevia = useMemo(() => {
    if (!active || mesesSel.length === 0) return []
    const sorted = [...mesesSel].sort()
    const baseYear = parseInt(baseMes.slice(0, 4), 10)
    return sorted.map((ym, idx) => {
      let valor = baseValor
      if (reajuste.ativo) {
        const targetYear = parseInt(ym.slice(0, 4), 10)
        const yearDiff = targetYear - baseYear
        if (yearDiff > 0) {
          valor = reajuste.tipo === 'percentual'
            ? baseValor * Math.pow(1 + reajuste.valor / 100, yearDiff)
            : baseValor + reajuste.valor * yearDiff
        }
      }
      const vencimento = opcoes.mesmaDataVenc ? vencParaMes(baseVencimento, ym) : ym + '-01'
      return {
        mesAno: ym,
        vencimento,
        valor: Math.round(valor * 100) / 100,
        status: tipo === 'despesa' ? 'A Pagar' : 'A Receber',
        parcela: opcoes.gerarParcelas ? { atual: idx + 1, total: sorted.length } : null,
      }
    })
  }, [active, mesesSel, baseValor, baseVencimento, opcoes, reajuste, baseMes, tipo])

  const totalValor = lancamentosPrevia.reduce((s, l) => s + l.valor, 0)
  const periodoStr = lancamentosPrevia.length > 0
    ? `${fmtMesAno(lancamentosPrevia[0].mesAno)} até ${fmtMesAno(lancamentosPrevia[lancamentosPrevia.length - 1].mesAno)}`
    : '—'
  const tipoLabel = { mensal: 'Mensal', semanal: 'Semanal', quinzenal: 'Quinzenal', anual: 'Anual', personalizado: 'Personalizado' }[tipoRec]
  const reajusteLabel = reajuste.ativo
    ? `${reajuste.valor}${reajuste.tipo === 'percentual' ? '%' : ' R$'} ao ano`
    : 'Sem reajuste'

  useEffect(() => {
    onDataChange?.({ active, count: lancamentosPrevia.length, total: totalValor, periodo: periodoStr, tipo: tipoLabel, reajuste: reajusteLabel })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, lancamentosPrevia.length, totalValor, periodoStr, tipoLabel, reajusteLabel])

  useImperativeHandle(ref, () => ({
    isActive: () => active,
    getLancamentos: (baseItem) => {
      const recId = uid()
      return lancamentosPrevia.map(l => ({
        ...baseItem,
        id: uid(),
        mesAno: l.mesAno,
        data: l.vencimento,
        vencimento: l.vencimento,
        valor: l.valor,
        status: l.status,
        recorrenciaId: recId,
        parcela: l.parcela,
      }))
    },
  }), [active, lancamentosPrevia])

  if (!active) {
    return (
      <div style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#16a34a18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🔄</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Lançamento Recorrente</div>
            <div style={{ color: 'var(--text-sub)', fontSize: 12, marginTop: 2 }}>
              Gere automaticamente lançamentos para múltiplos meses com um clique.
            </div>
          </div>
          <Toggle checked={false} onChange={setActive} />
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ── PANEL ATIVO ── */}
      <div style={{ background: 'var(--card)', borderRadius: 12, border: '2px solid #16a34a40', padding: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#16a34a18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🔄</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Lançamento Recorrente</div>
            <div style={{ color: '#16a34a', fontSize: 12, marginTop: 2, fontWeight: 600 }}>
              Ativo — {mesesSel.length} {mesesSel.length === 1 ? 'mês selecionado' : 'meses selecionados'}
            </div>
          </div>
          <Toggle checked={true} onChange={setActive} />
        </div>

        {/* 4 colunas de opções */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 22 }}>

          {/* Tipo de Repetição */}
          <div>
            <RLabel>Tipo de Repetição</RLabel>
            {[['mensal','Mensal'],['semanal','Semanal'],['quinzenal','Quinzenal'],['anual','Anual'],['personalizado','Personalizado']].map(([k,l]) => (
              <RadioRow key={k} value={k} current={tipoRec} onChange={setTipoRec} label={l} />
            ))}
          </div>

          {/* Gerar Lançamentos */}
          <div>
            <RLabel>Gerar Lançamentos</RLabel>
            {[['proximos','Próximos meses'],['anteriores','Meses anteriores'],['ambos','Ambos']].map(([k,l]) => (
              <RadioRow key={k} value={k} current={periodoGer} onChange={setPeriodoGer} label={l} />
            ))}
          </div>

          {/* Quantidade */}
          <div>
            <RLabel>Quantidade</RLabel>
            <div style={{ fontSize: 12, color: 'var(--text-sub)', marginBottom: 6 }}>Repetir por</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <input
                type="number" min={1} max={60}
                value={quantidade}
                onChange={e => setQuantidade(Math.max(1, Math.min(60, Number(e.target.value))))}
                style={{
                  width: 60, padding: '7px 8px', border: '1.5px solid var(--border)',
                  borderRadius: 8, background: 'var(--card)', color: 'var(--text)',
                  fontSize: 14, fontWeight: 700, textAlign: 'center', outline: 'none', fontFamily: 'inherit',
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>meses</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[3, 6, 12].map(n => (
                <button key={n} onClick={() => setQuantidade(n)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  fontFamily: 'inherit', cursor: 'pointer',
                  background: quantidade === n ? T.primary : 'var(--bg)',
                  color: quantidade === n ? '#fff' : 'var(--text-sub)',
                  border: quantidade === n ? 'none' : '1.5px solid var(--border)',
                }}>{n}</button>
              ))}
            </div>
          </div>

          {/* Opções Adicionais */}
          <div>
            <RLabel>Opções Adicionais</RLabel>
            <CheckRow checked={opcoes.mesmaDataVenc} onChange={v => setOpcoes(o => ({ ...o, mesmaDataVenc: v }))} label="Aplicar mesma data de vencimento" />
            <CheckRow checked={opcoes.editarValorMes} onChange={v => setOpcoes(o => ({ ...o, editarValorMes: v }))} label="Permitir editar valor por mês" />
            <CheckRow checked={opcoes.manterStatus} onChange={v => setOpcoes(o => ({ ...o, manterStatus: v }))} label="Manter mesmo status" />
            <CheckRow checked={opcoes.criarVinculo} onChange={v => setOpcoes(o => ({ ...o, criarVinculo: v }))} label="Criar vínculo entre lançamentos" />
            <CheckRow checked={opcoes.gerarParcelas} onChange={v => setOpcoes(o => ({ ...o, gerarParcelas: v }))} label="Gerar parcelas (opcional)" />
          </div>
        </div>

        {/* Seleção visual dos meses */}
        <div style={{ marginBottom: 18 }}>
          <RLabel>Seleção dos Meses</RLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {gridMeses.map(ym => {
              const [y, m] = ym.split('-').map(Number)
              const sel = mesesSel.includes(ym)
              return (
                <div key={ym} onClick={() => toggleMes(ym)} style={{
                  border: `2px solid ${sel ? '#16a34a' : 'var(--border)'}`,
                  borderRadius: 10, padding: '10px 6px', cursor: 'pointer', textAlign: 'center',
                  background: sel ? '#16a34a18' : 'var(--bg)', transition: 'all .15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 3 }}>
                    {sel && <span style={{ color: '#16a34a', fontSize: 11 }}>✓</span>}
                    <span style={{ fontWeight: 700, fontSize: 13, color: sel ? '#16a34a' : 'var(--text)' }}>
                      {MESES_PT[m - 1].slice(0, 3)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: sel ? '#16a34a' : 'var(--text-muted)', fontWeight: sel ? 600 : 400 }}>{y}</div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
            • {mesesSel.length} {mesesSel.length === 1 ? 'mês selecionado' : 'meses selecionados'}
          </div>
        </div>

        {/* Reajuste Automático */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: reajuste.ativo ? 16 : 0 }}>
            <Toggle checked={reajuste.ativo} onChange={v => setReajuste(r => ({ ...r, ativo: v }))} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Reajuste Automático</div>
              <div style={{ color: 'var(--text-sub)', fontSize: 12 }}>Aplicar reajuste anual no valor</div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg)', borderRadius: 6, padding: '2px 8px', border: '1px solid var(--border)' }}>opcional</span>
          </div>

          {reajuste.ativo && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 4 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 11, color: 'var(--text-sub)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>Tipo de Reajuste</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[['percentual','Percentual (%)'],['fixo','Valor Fixo (R$)']].map(([k,l]) => (
                    <button key={k} onClick={() => setReajuste(r => ({ ...r, tipo: k }))} style={{
                      padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
                      background: reajuste.tipo === k ? T.primary : 'var(--bg)',
                      color: reajuste.tipo === k ? '#fff' : 'var(--text-sub)',
                      border: reajuste.tipo === k ? 'none' : '1.5px solid var(--border)',
                    }}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 11, color: 'var(--text-sub)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {reajuste.tipo === 'percentual' ? 'Percentual' : 'Valor'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <input
                    type="number" min={0} max={100} step={0.5}
                    value={reajuste.valor}
                    onChange={e => setReajuste(r => ({ ...r, valor: Number(e.target.value) }))}
                    style={{
                      flex: 1, padding: '9px 12px', border: 'none', outline: 'none',
                      background: 'var(--card)', color: 'var(--text)', fontSize: 16,
                      fontFamily: 'inherit', fontWeight: 700,
                    }}
                  />
                  <span style={{ padding: '0 12px', color: 'var(--text-sub)', fontSize: 14, fontWeight: 700, background: 'var(--bg)', alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>
                    {reajuste.tipo === 'percentual' ? '%' : 'R$'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 26 }}>
                <div style={{ background: '#2563eb12', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: T.blue, lineHeight: 1.5 }}>
                  ℹ O reajuste será aplicado anualmente no mês de aniversário da recorrência ({fmtMesAno(addMesesYM(baseMes, 12))}).
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botão prévia / tabela prévia */}
      {!showPrevia ? (
        <button onClick={() => setShowPrevia(true)} style={{
          width: '100%', padding: '10px', background: 'transparent',
          border: '1.5px dashed var(--border)', borderRadius: 10,
          color: 'var(--text-sub)', fontSize: 13, cursor: 'pointer',
          fontFamily: 'inherit', fontWeight: 600,
        }}>
          👁 Visualizar {lancamentosPrevia.length} lançamento{lancamentosPrevia.length !== 1 ? 's' : ''} que serão criados
        </button>
      ) : (
        <div style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>📋 Prévia dos Lançamentos</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>{lancamentosPrevia.length} lançamentos · Total: <strong style={{ color: accent }}>{fmt(totalValor)}</strong></span>
              <button onClick={() => setShowPrevia(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub)', fontSize: 14 }}>✕</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  {['#', 'Competência', 'Vencimento', 'Valor', 'Status'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-sub)', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lancamentosPrevia.map((l, i) => (
                  <tr key={l.mesAno} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{fmtMesAno(l.mesAno)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-sub)' }}>{fd(l.vencimento)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: accent }}>{fmt(l.valor)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        background: accentLight, color: accent,
                        borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                      }}>{l.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right', borderTop: '2px solid var(--border)', color: 'var(--text-sub)' }}>Total estimado</td>
                  <td style={{ padding: '10px 12px', fontWeight: 800, fontSize: 15, color: accent, borderTop: '2px solid var(--border)' }}>{fmt(totalValor)}</td>
                  <td style={{ borderTop: '2px solid var(--border)' }} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </>
  )
})

export default RecorrenciaPanel
