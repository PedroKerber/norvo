import { useState } from 'react'
import * as XLSX from 'xlsx'
import { T, fmt, fd, uid, errMsgAcao } from '../../theme'
import { Card, Btn, Toast, EmptyState } from '../../components/ui'
import { PageHeader } from '../pfui'

// Normaliza chave de coluna: minúsculo, sem acento, sem espaço
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

export default function PersonalImportar({ accounts = [], catsReceita = [], catsDespesa = [], onSaveTxBatch }) {
  const [rows, setRows] = useState([])
  const [toast, setToast] = useState(null)
  const [importando, setImportando] = useState(false)

  const matchConta = (nome) => accounts.find(a => norm(a.nome) === norm(nome))?.id || ''
  const matchCat = (tipo, nome) => {
    const list = tipo === 'receita' ? catsReceita : catsDespesa
    return list.find(c => norm(c.nome) === norm(nome))?.id || nome || ''
  }
  const parseValor = (v) => {
    if (typeof v === 'number') return v
    const s = String(v || '').replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.')
    return parseFloat(s) || 0
  }
  const parseData = (v) => {
    if (v instanceof Date) return v.toISOString().slice(0, 10)
    const s = String(v || '').trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
    const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)  // dd/mm/aaaa
    if (m) { const [, d, mo, y] = m; const yy = y.length === 2 ? '20' + y : y; return `${yy}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}` }
    return new Date().toISOString().slice(0, 10)
  }

  const onFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary', cellDates: true })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        const parsed = json.map(raw => {
          const r = {}; Object.keys(raw).forEach(k => { r[norm(k)] = raw[k] })
          const tipo = norm(r['tipo']).startsWith('rec') ? 'receita' : 'despesa'
          return {
            _key: uid(), tipo,
            data: parseData(r['data']),
            desc: String(r['descricao'] || r['descrição'] || r['desc'] || '').trim(),
            categoria: matchCat(tipo, r['categoria'] || ''),
            categoriaRaw: String(r['categoria'] || '').trim(),
            valor: parseValor(r['valor']),
            accountId: matchConta(r['conta'] || ''),
            contaRaw: String(r['conta'] || '').trim(),
          }
        }).filter(r => r.valor > 0)
        setRows(parsed)
        setToast({ msg: `${parsed.length} linha(s) lida(s). Confira e importe.`, type: 'success' })
      } catch (err) { setToast({ msg: 'Não foi possível ler o arquivo. Use colunas: data, tipo, descrição, categoria, valor, conta.', type: 'error' }) }
    }
    reader.readAsBinaryString(file)
  }

  const importar = async () => {
    if (rows.length === 0) return
    setImportando(true)
    try {
      const items = rows.map(r => ({
        id: uid(), tipo: r.tipo, valor: r.valor, data: r.data, categoria: r.categoria,
        desc: r.desc, accountId: r.accountId, status: r.tipo === 'receita' ? 'Recebida' : 'Pago',
      }))
      await onSaveTxBatch(items)
      setRows([]); setToast({ msg: `${items.length} lançamentos importados!`, type: 'success' })
    } catch (e) { setToast({ msg: errMsgAcao(e), type: 'error' }) }
    setImportando(false)
  }

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <PageHeader title="Importar" subtitle="Importe receitas e despesas de um arquivo Excel/CSV." />

      <Card style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: T.sub, marginBottom: 12 }}>
          Colunas esperadas (primeira linha = cabeçalho): <strong>data</strong>, <strong>tipo</strong> (receita/despesa), <strong>descrição</strong>, <strong>categoria</strong>, <strong>valor</strong>, <strong>conta</strong>.
          Categoria e conta são casadas pelo nome; se não existir, a categoria é mantida como texto.
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.primary, color: '#fff', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          📄 Escolher arquivo (.xlsx / .csv)
          <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} style={{ display: 'none' }} />
        </label>
      </Card>

      {rows.length === 0 ? (
        <Card style={{ padding: 0 }}>
          <EmptyState icon="📥" title="Nenhum arquivo carregado" sub="Selecione um .xlsx ou .csv para pré-visualizar antes de importar." />
        </Card>
      ) : (
        <Card style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Pré-visualização — {rows.length} lançamento(s)</div>
            <Btn onClick={importar} disabled={importando}>{importando ? 'Importando…' : `Importar ${rows.length}`}</Btn>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>{['Data', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Valor'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: T.sub, fontSize: 12 }}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.slice(0, 100).map(r => (
                  <tr key={r._key} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                    <td style={{ padding: '7px 10px' }}>{fd(r.data)}</td>
                    <td style={{ padding: '7px 10px', color: r.tipo === 'receita' ? T.green : T.red }}>{r.tipo}</td>
                    <td style={{ padding: '7px 10px' }}>{r.desc || '—'}</td>
                    <td style={{ padding: '7px 10px' }}>{(r.tipo === 'receita' ? catsReceita : catsDespesa).find(c => c.id === r.categoria)?.nome || r.categoriaRaw || '—'}</td>
                    <td style={{ padding: '7px 10px', color: r.accountId ? T.text : T.muted }}>{accounts.find(a => a.id === r.accountId)?.nome || r.contaRaw || '—'}</td>
                    <td style={{ padding: '7px 10px', fontWeight: 700, color: r.tipo === 'receita' ? T.green : T.red }}>{fmt(r.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 100 && <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>Mostrando 100 de {rows.length}. Todas serão importadas.</div>}
          </div>
        </Card>
      )}
    </div>
  )
}
