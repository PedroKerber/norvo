import { useState, useEffect } from 'react'
import { T } from '../theme'
import { Card } from '../components/ui'
import { PLANOS, MODULE_CONFIG, labelPlano, getCorPlano, getLimitesPlano } from '../modules'
import { apiFetch } from '../supabase'

const PLANOS_ORDEM = ['basico', 'profissional', 'enterprise']

// Módulos que aparecem na sidebar (visíveis ao usuário)
const MODULOS_SIDEBAR = [
  'dashboard', 'receitas', 'despesas', 'transacoes', 'retirada_socios', 'fluxo',
  'relatorios', 'comparativo_empresas', 'mes_fechado',
  'metas', 'importar', 'scanner', 'categorias', 'centro_custo',
  'fornecedores', 'clientes',
  'viabilidade_inc', 'controle_obras', 'investidores',
  'captacao_imoveis', 'crm_vendas', 'comissoes',
  'planos_alunos', 'agendamentos', 'controle_alunos',
  'projetos',
]

function BarLimit({ value, max, cor }) {
  const pct = max === Infinity ? 20 : Math.min(100, Math.round((value / max) * 100))
  const warn = pct >= 80
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 8, height: 8, overflow: 'hidden', marginTop: 6 }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: warn ? T.red : cor,
        borderRadius: 8, transition: 'width .4s ease',
      }} />
    </div>
  )
}

function PlanoCard({ p, atual, onSelect }) {
  const cfg = PLANOS[p]
  if (!cfg) return null
  const isAtual = p === atual
  const isUpgrade = PLANOS_ORDEM.indexOf(p) > PLANOS_ORDEM.indexOf(atual)
  return (
    <div style={{
      border: `2px solid ${isAtual ? cfg.cor : 'var(--border)'}`,
      borderRadius: 14, padding: '20px 20px 18px',
      background: isAtual ? cfg.corBg + '33' : 'var(--card)',
      position: 'relative', cursor: isUpgrade ? 'pointer' : 'default',
      transition: 'border-color .2s',
    }}
      onClick={() => isUpgrade && onSelect && onSelect(p)}
      onMouseEnter={e => { if (isUpgrade) e.currentTarget.style.borderColor = cfg.cor }}
      onMouseLeave={e => { if (!isAtual && isUpgrade) e.currentTarget.style.borderColor = 'var(--border)' }}>
      {isAtual && (
        <div style={{ position: 'absolute', top: -10, left: 14, background: cfg.cor, color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 20, letterSpacing: .5 }}>
          PLANO ATUAL
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.cor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cfg.cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: cfg.cor }}>{cfg.label}</div>
          <div style={{ color: 'var(--text-sub)', fontSize: 12 }}>
            {cfg.limites.empresas === Infinity ? 'Empresas ilimitadas' : `Até ${cfg.limites.empresas} empresa${cfg.limites.empresas !== 1 ? 's' : ''}`}
            {' · '}
            {cfg.limites.usuarios === Infinity ? 'Usuários ilimitados' : `${cfg.limites.usuarios} usuários`}
          </div>
        </div>
      </div>
      {isUpgrade && (
        <div style={{ background: cfg.cor, color: '#fff', borderRadius: 8, padding: '8px 14px', textAlign: 'center', fontSize: 13, fontWeight: 700 }}>
          Solicitar Upgrade →
        </div>
      )}
    </div>
  )
}

export default function MeuPlano({ empresa, empresas = [], usuario, setPage }) {
  const plano   = empresa?.plano || 'basico'
  const limites = getLimitesPlano(plano)
  const corP    = getCorPlano(plano)
  const segmento = empresa?.segmento

  const [numUsuarios, setNumUsuarios] = useState(null)
  const [loadingU, setLoadingU] = useState(true)
  const [upgradeModal, setUpgradeModal] = useState(null)

  useEffect(() => {
    // list-users agora exige master; para não-master retorna 403 → contagem fica '—'.
    apiFetch('/api/list-users')
      .then(r => r.ok ? r.json() : { users: null })
      .then(d => { setNumUsuarios(Array.isArray(d.users) ? d.users.length : null) })
      .catch(() => setNumUsuarios(null))
      .finally(() => setLoadingU(false))
  }, [])

  // Módulos liberados e bloqueados para este plano+segmento
  const modulos = MODULOS_SIDEBAR.map(id => {
    const cfg = MODULE_CONFIG[id]
    if (!cfg) return null
    if (cfg.segmentos !== 'todos' && segmento && !cfg.segmentos.includes(segmento)) return null
    const liberado = cfg.planos && cfg.planos.includes(plano)
    return { id, label: cfg.label, liberado }
  }).filter(Boolean)

  const liberados = modulos.filter(m => m.liberado)
  const bloqueados = modulos.filter(m => !m.liberado)

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: 'var(--text)', maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <div className="page-hd">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Meu Plano</h1>
          <div style={{ color: 'var(--text-sub)', fontSize: 14 }}>Gerencie sua assinatura e os recursos disponíveis.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ background: corP + '18', color: corP, fontWeight: 800, fontSize: 13, padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${corP}33` }}>
            {labelPlano(plano)}
          </span>
          <span style={{ background: T.greenL, color: T.green, fontWeight: 700, fontSize: 12, padding: '5px 12px', borderRadius: 20 }}>
            ● Ativo
          </span>
        </div>
      </div>

      {/* KPIs de uso */}
      <div className="g-2" style={{ marginBottom: 24 }}>

        <Card style={{ padding: '20px 22px' }}>
          <div style={{ color: 'var(--text-sub)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 10 }}>Empresas</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontWeight: 900, fontSize: 36, color: 'var(--text)' }}>{empresas.length}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 15 }}>
              / {limites.empresas === Infinity ? '∞' : limites.empresas}
            </span>
          </div>
          <BarLimit value={empresas.length} max={limites.empresas} cor={corP} />
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
            {limites.empresas === Infinity
              ? 'Sem limite de empresas'
              : `${Math.max(0, limites.empresas - empresas.length)} vagas restantes`
            }
          </div>
        </Card>

        <Card style={{ padding: '20px 22px' }}>
          <div style={{ color: 'var(--text-sub)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 10 }}>Usuários</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontWeight: 900, fontSize: 36, color: 'var(--text)' }}>
              {loadingU ? '—' : (numUsuarios ?? '—')}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 15 }}>
              / {limites.usuarios === Infinity ? '∞' : limites.usuarios}
            </span>
          </div>
          <BarLimit value={numUsuarios || 0} max={limites.usuarios} cor={corP} />
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
            {limites.usuarios === Infinity
              ? 'Sem limite de usuários'
              : numUsuarios != null
                ? `${Math.max(0, limites.usuarios - numUsuarios)} vagas restantes`
                : 'Carregando...'
            }
          </div>
        </Card>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Recursos liberados */}
        <Card style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: T.greenL, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.green, fontWeight: 900, fontSize: 15 }}>✓</div>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Recursos Incluídos</span>
            <span style={{ marginLeft: 'auto', background: T.greenL, color: T.green, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 9px' }}>{liberados.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 260, overflowY: 'auto' }}>
            {liberados.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0' }}>
                <span style={{ color: T.green, fontSize: 14, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{m.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recursos bloqueados */}
        <Card style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🔒</div>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Recursos Bloqueados</span>
            <span style={{ marginLeft: 'auto', background: '#f3f4f6', color: '#6b7280', fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 9px' }}>{bloqueados.length}</span>
          </div>
          {bloqueados.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              Todos os recursos disponíveis estão liberados.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 260, overflowY: 'auto' }}>
              {bloqueados.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0' }}>
                  <span style={{ color: '#9ca3af', fontSize: 13, flexShrink: 0 }}>🔒</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{m.label}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>

      {/* Comparativo de planos */}
      <Card style={{ padding: '22px 24px', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
          Comparativo de Planos
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {PLANOS_ORDEM.map(p => (
            <PlanoCard key={p} p={p} atual={plano} onSelect={p2 => setUpgradeModal(p2)} />
          ))}
        </div>

        {plano !== 'enterprise' && (
          <div style={{ marginTop: 20, background: 'var(--bg)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 24 }}>💡</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>Precisa de mais recursos?</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Entre em contato com nosso time comercial para solicitar um upgrade ou tirar dúvidas sobre os planos.
              </div>
            </div>
            <a href="mailto:pedrork22@icloud.com"
              style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Falar com Comercial
            </a>
          </div>
        )}
      </Card>

      {/* Tabela de limites por plano */}
      <Card style={{ padding: '22px 24px' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
          Limites por Plano
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-sub)', fontWeight: 600, fontSize: 12 }}>Recurso</th>
              {PLANOS_ORDEM.map(p => (
                <th key={p} style={{
                  textAlign: 'center', padding: '8px 12px', fontWeight: 800,
                  color: PLANOS[p].cor,
                  background: p === plano ? PLANOS[p].cor + '10' : 'transparent',
                  borderRadius: p === plano ? '6px 6px 0 0' : 0,
                }}>
                  {PLANOS[p].label}
                  {p === plano && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: .5, marginTop: 2 }}>ATUAL</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Empresas', key: 'empresas' },
              { label: 'Usuários', key: 'usuarios' },
            ].map(row => (
              <tr key={row.key} style={{ borderTop: '1px solid var(--border-light)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 500 }}>{row.label}</td>
                {PLANOS_ORDEM.map(p => {
                  const val = PLANOS[p].limites[row.key]
                  return (
                    <td key={p} style={{
                      padding: '10px 12px', textAlign: 'center', fontWeight: 700,
                      color: p === plano ? PLANOS[p].cor : 'var(--text-sub)',
                      background: p === plano ? PLANOS[p].cor + '08' : 'transparent',
                    }}>
                      {val === Infinity ? 'Ilimitado' : val}
                    </td>
                  )
                })}
              </tr>
            ))}
            {[
              { label: 'Módulos Básicos', basico: '✓', profissional: '✓', enterprise: '✓' },
              { label: 'Metas e Fechamento', basico: '—', profissional: '✓', enterprise: '✓' },
              { label: 'Transações e Retiradas', basico: '—', profissional: '✓', enterprise: '✓' },
              { label: 'Comparativo e Importação', basico: '—', profissional: '✓', enterprise: '✓' },
              { label: 'Módulos de Segmento', basico: '—', profissional: '—', enterprise: '✓' },
              { label: 'IA e Recursos Avançados', basico: '—', profissional: '—', enterprise: '✓' },
            ].map(row => (
              <tr key={row.label} style={{ borderTop: '1px solid var(--border-light)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 500 }}>{row.label}</td>
                {PLANOS_ORDEM.map(p => (
                  <td key={p} style={{
                    padding: '10px 12px', textAlign: 'center', fontWeight: 700,
                    color: row[p] === '✓' ? (p === plano ? PLANOS[p].cor : T.green) : '#d1d5db',
                    background: p === plano ? PLANOS[p].cor + '08' : 'transparent',
                  }}>
                    {row[p]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Modal de upgrade */}
      {upgradeModal && (
        <div onClick={() => setUpgradeModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'var(--card)', borderRadius: 16, padding: 28, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 14 }}>⭐</div>
            <h3 style={{ textAlign: 'center', fontWeight: 800, fontSize: 20, margin: '0 0 10px', color: PLANOS[upgradeModal]?.cor }}>
              Upgrade para {PLANOS[upgradeModal]?.label}
            </h3>
            <p style={{ textAlign: 'center', color: 'var(--text-sub)', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
              Para realizar o upgrade do seu plano, entre em contato com o time comercial do NORVO.
              A integração com gateway de pagamento estará disponível em breve.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setUpgradeModal(null)}
                style={{ flex: 1, background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)' }}>
                Fechar
              </button>
              <a href={`mailto:pedrork22@icloud.com?subject=Upgrade NORVO - Plano ${PLANOS[upgradeModal]?.label || ''}`}
                style={{ flex: 1, background: PLANOS[upgradeModal]?.cor, color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Falar com Comercial
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
