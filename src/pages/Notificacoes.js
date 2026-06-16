import { useState, useMemo } from 'react'
import { T } from '../theme'
import { useNotif, timeAgo } from '../context/NotifContext'
import { NIcon } from '../components/NotifPanel'
import { EMPRESAS } from '../data'

const TIPOS = ['Todos', 'Financeiro', 'Sistema', 'Usuários', 'Empresas']
const STATUS = ['Todos', 'Não lidas', 'Lidas']
const TIPO_MAP = { financeiro: 'Financeiro', sistema: 'Sistema', usuarios: 'Usuários', empresas: 'Empresas' }

const PAGE_SIZE = 8

const TIPO_BG = {
  financeiro: '#ea580c', sistema: '#2563eb', usuarios: '#7c3aed', empresas: '#0891b2',
}

function getBadgeStyle(tipo) {
  const cor = TIPO_BG[tipo] || '#6b7280'
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
    color: cor, background: cor + '18',
  }
}

export default function Notificacoes({ setPage }) {
  const { notifs, marcarLida, marcarTodasLidas, remover, limparLidas, unreadCount } = useNotif()

  const [tipo, setTipo] = useState('Todos')
  const [status, setStatus] = useState('Todos')
  const [empresa, setEmpresa] = useState('Todas')
  const [busca, setBusca] = useState('')
  const [pg, setPg] = useState(1)

  const filtered = useMemo(() => notifs.filter(n => {
    if (tipo !== 'Todos' && TIPO_MAP[n.tipo] !== tipo) return false
    if (status === 'Não lidas' && n.lida) return false
    if (status === 'Lidas' && !n.lida) return false
    if (empresa !== 'Todas' && n.empresa !== empresa) return false
    if (busca && !n.titulo.toLowerCase().includes(busca.toLowerCase()) &&
        !n.descricao.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  }), [notifs, tipo, status, empresa, busca])

  const totalPgs = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const items = filtered.slice((pg - 1) * PAGE_SIZE, pg * PAGE_SIZE)

  const resetPg = () => setPg(1)

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: T.white, borderRadius: 16, padding: '24px 28px 20px',
        border: `1px solid ${T.border}`, boxShadow: T.shadow, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: T.blueL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <NIcon name="bell" size={20} color={T.blue} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.text }}>Central de Notificações</h2>
                <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Acompanhe todos os alertas e eventos do sistema.</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {unreadCount > 0 && (
              <button onClick={marcarTodasLidas}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: T.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>
                <NIcon name="check" size={14} color="#fff" />
                Marcar todas como lidas
              </button>
            )}
            <button onClick={limparLidas}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: T.bg, color: T.sub, border: `1px solid ${T.border}`, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>
              <NIcon name="trash" size={14} />
              Limpar lidas
            </button>
          </div>
        </div>

        {/* Stats chips */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', val: notifs.length, cor: T.text, bg: T.borderLight },
            { label: 'Não lidas', val: unreadCount, cor: '#dc2626', bg: '#fee2e2' },
            { label: 'Lidas', val: notifs.length - unreadCount, cor: T.primary, bg: T.primaryLight },
          ].map(({ label, val, cor, bg }) => (
            <div key={label} style={{ background: bg, borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: cor }}>{val}</span>
              <span style={{ fontSize: 12, color: cor, fontWeight: 500 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: T.white, borderRadius: 12, padding: '14px 18px',
        border: `1px solid ${T.border}`, boxShadow: T.shadow, marginBottom: 16,
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <NIcon name="filter" size={16} color={T.muted} />

        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}>
            <NIcon name="search" size={14} color={T.muted} />
          </span>
          <input value={busca} onChange={e => { setBusca(e.target.value); resetPg() }}
            placeholder="Pesquisar notificações..."
            style={{ width: '100%', padding: '7px 10px 7px 32px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text, background: 'var(--input-bg)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Tipo */}
        <select value={tipo} onChange={e => { setTipo(e.target.value); resetPg() }}
          style={{ padding: '7px 10px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text, background: 'var(--select-bg)', cursor: 'pointer' }}>
          {TIPOS.map(t => <option key={t}>{t}</option>)}
        </select>

        {/* Status */}
        <select value={status} onChange={e => { setStatus(e.target.value); resetPg() }}
          style={{ padding: '7px 10px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text, background: 'var(--select-bg)', cursor: 'pointer' }}>
          {STATUS.map(s => <option key={s}>{s}</option>)}
        </select>

        {/* Empresa */}
        <select value={empresa} onChange={e => { setEmpresa(e.target.value); resetPg() }}
          style={{ padding: '7px 10px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text, background: 'var(--select-bg)', cursor: 'pointer' }}>
          <option>Todas</option>
          {EMPRESAS.map(e => <option key={e.id} value={e.id}>{e.nome.split(' ').slice(0, 2).join(' ')}</option>)}
        </select>

        {(busca || tipo !== 'Todos' || status !== 'Todos' || empresa !== 'Todas') && (
          <button onClick={() => { setBusca(''); setTipo('Todos'); setStatus('Todos'); setEmpresa('Todas'); resetPg() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: T.primary, fontWeight: 600 }}>
            Limpar filtros
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: T.shadow, overflow: 'hidden' }}>
        {items.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <NIcon name="bell" size={44} color={T.border} />
            <p style={{ margin: '16px 0 0', fontSize: 15, color: T.muted, fontWeight: 500 }}>Nenhuma notificação encontrada</p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: T.muted }}>Tente ajustar os filtros.</p>
          </div>
        ) : items.map((n, i) => (
          <div key={n.id} style={{
            display: 'flex', gap: 14, padding: '16px 20px',
            borderBottom: i < items.length - 1 ? `1px solid ${T.borderLight}` : 'none',
            background: n.lida ? 'transparent' : 'rgba(37,99,235,0.035)',
            borderLeft: `4px solid ${n.lida ? 'transparent' : '#2563eb'}`,
            transition: 'background .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = T.bg}
            onMouseLeave={e => e.currentTarget.style.background = n.lida ? 'transparent' : 'rgba(37,99,235,0.035)'}>

            {/* Icon */}
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: n.cor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <NIcon name={n.icone} size={20} color={n.cor} />
            </div>

            {/* Body */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
                <span style={{ fontWeight: n.lida ? 500 : 700, fontSize: 14, color: T.text, flex: 1 }}>
                  {n.titulo}
                </span>
                {!n.lida && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />
                    <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700 }}>Nova</span>
                  </div>
                )}
              </div>

              <p style={{ margin: '0 0 8px', fontSize: 13, color: T.sub, lineHeight: 1.5 }}>{n.descricao}</p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={getBadgeStyle(n.tipo)}>{TIPO_MAP[n.tipo]}</span>
                <span style={{ fontSize: 12, color: T.muted }}>
                  {EMPRESAS.find(e => e.id === n.empresa)?.nome?.split(' ').slice(0, 2).join(' ') || n.empresa}
                </span>
                <span style={{ fontSize: 12, color: T.muted }}>{timeAgo(n.data)}</span>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  {n.acao && (
                    <button onClick={() => { marcarLida(n.id); setPage(n.acao.page) }}
                      style={{ fontSize: 12, fontWeight: 600, color: T.primary, background: T.primaryLight, border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                      {n.acao.label}
                    </button>
                  )}
                  {!n.lida && (
                    <button onClick={() => marcarLida(n.id)}
                      title="Marcar como lida"
                      style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.muted }}>
                      <NIcon name="check" size={13} />
                      Lida
                    </button>
                  )}
                  <button onClick={() => remover(n.id)}
                    title="Excluir notificação"
                    style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', color: T.muted }}
                    onMouseEnter={e => { e.currentTarget.style.background = T.redL; e.currentTarget.style.color = T.red; e.currentTarget.style.borderColor = T.red }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border }}>
                    <NIcon name="trash" size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPgs > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
          <button onClick={() => setPg(p => Math.max(1, p - 1))} disabled={pg === 1}
            style={{ padding: '7px 16px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.white, color: pg === 1 ? T.muted : T.text, cursor: pg === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
            ← Anterior
          </button>
          <span style={{ fontSize: 13, color: T.muted }}>
            Página {pg} de {totalPgs} · {filtered.length} notificação{filtered.length !== 1 ? 'ões' : ''}
          </span>
          <button onClick={() => setPg(p => Math.min(totalPgs, p + 1))} disabled={pg === totalPgs}
            style={{ padding: '7px 16px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.white, color: pg === totalPgs ? T.muted : T.text, cursor: pg === totalPgs ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
            Próxima →
          </button>
        </div>
      )}

      {/* Settings section */}
      <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: T.shadow, marginTop: 20, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <NIcon name="filter" size={16} color={T.muted} />
          <span style={{ fontWeight: 700, fontSize: 15, color: T.text }}>Configurações de Notificação</span>
        </div>
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
          {[
            { titulo: 'Financeiro', itens: ['Despesas vencendo', 'Despesas em atraso', 'Receitas recebidas', 'Receitas previstas', 'Metas financeiras'] },
            { titulo: 'Sistema', itens: ['Novo login', 'Alteração de senha', 'Usuário cadastrado', 'Empresa cadastrada', 'Relatórios gerados'] },
            { titulo: 'Canais', itens: ['Dentro do sistema', 'E-mail', 'WhatsApp', 'Push notification'] },
          ].map(({ titulo, itens }) => (
            <div key={titulo}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>{titulo}</div>
              {itens.map(item => (
                <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ accentColor: T.primary, width: 14, height: 14 }} />
                  <span style={{ fontSize: 13, color: T.text }}>{item}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.border}`, background: T.bg }}>
          <button style={{ padding: '8px 18px', background: T.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>
            Salvar preferências
          </button>
        </div>
      </div>
    </div>
  )
}
