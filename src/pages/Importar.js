import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { T, uid, fmtS, fd } from '../theme'
import { Card, Btn } from '../components/ui'
import { CATS_RECEITA, CATS_DESPESA } from '../data'

const COLS = ['Tipo','Descrição','Valor','Data','Categoria','Status','Vencimento','Forma de Pagamento','Conta','Cliente','Fornecedor','Centro de Custo','Observações']

const fmtDate = (val) => {
  if (!val) return ''
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  const s = String(val).trim()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) { const [d, m, y] = s.split('/'); return `${y}-${m}-${d}` }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return ''
}

const parseStatus = (val, tipo) => {
  const v = String(val || '').toLowerCase()
  if (tipo === 'receita') return (v.includes('receb') && !v.includes('a receb')) ? 'Recebida' : 'A Receber'
  return (v.includes('pag') && !v.includes('a pag')) ? 'Pago' : 'A Pagar'
}

const parseRow = (row, empId) => {
  const tipoRaw = String(row['Tipo'] || '').toLowerCase()
  const tipo = tipoRaw.includes('receita') ? 'receita' : 'despesa'
  const catNome = String(row['Categoria'] || '').trim()
  const cats = tipo === 'receita' ? CATS_RECEITA : CATS_DESPESA
  const catMatch = cats.find(c => c.nome.toLowerCase() === catNome.toLowerCase())
  const desc = String(row['Descrição'] || '').trim()
  const valorRaw = String(row['Valor'] || '').replace(/\./g, '').replace(',', '.')
  const valor = parseFloat(valorRaw) || 0
  const data = fmtDate(row['Data'])
  const errors = []
  if (!desc) errors.push('Descrição vazia')
  if (!valor || valor <= 0) errors.push('Valor inválido')
  if (!data) errors.push('Data inválida')
  if (!tipoRaw) errors.push('Tipo obrigatório')
  return {
    id: uid(), empId, tipo,
    cat: catMatch ? catMatch.id : (tipo === 'receita' ? 'outras_receitas' : 'administrativo'),
    catNome: catMatch ? catMatch.nome : (catNome || (tipo === 'receita' ? 'Outras Receitas' : 'Administrativo')),
    desc, valor, data,
    vencimento: fmtDate(row['Vencimento']),
    status: parseStatus(row['Status'], tipo),
    forma: String(row['Forma de Pagamento'] || ''),
    conta: String(row['Conta'] || ''),
    cliente: String(row['Cliente'] || ''),
    fornecedor: String(row['Fornecedor'] || ''),
    centroCusto: String(row['Centro de Custo'] || ''),
    obs: String(row['Observações'] || ''),
    _errors: errors,
  }
}

const downloadTemplate = () => {
  const wb = XLSX.utils.book_new()
  const wsData = [
    COLS,
    ['receita', 'Venda de imóvel rua das flores', 150000, '15/01/2026', 'Venda de Imóveis', 'Recebida', '', 'Transferência', 'Conta Corrente Itaú', 'João Silva', '', 'Comercial', ''],
    ['despesa', 'Aluguel escritório centro', 5000, '05/01/2026', 'Aluguel Escritório', 'Pago', '05/01/2026', 'Débito', 'Conta Corrente Itaú', '', 'Imobiliária XYZ', 'Administrativo', ''],
    ['receita', 'Comissão venda', 8500, '20/01/2026', 'Comissões', 'A Receber', '25/01/2026', '', '', 'Maria Santos', '', '', ''],
    ['despesa', 'Folha de pagamento', 25000, '30/01/2026', 'Folha de Pagamento', 'A Pagar', '30/01/2026', 'Transferência', 'Conta Corrente BB', '', '', 'Administrativo', ''],
  ]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = [{ wch: 12 }, { wch: 32 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Lançamentos')
  XLSX.writeFile(wb, 'template_norvo.xlsx')
}

export default function Importar({ empresa, onImport }) {
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const handleFile = (file) => {
    if (!file) return
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('Use um arquivo .xlsx, .xls ou .csv')
      return
    }
    setFileName(file.name)
    setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' })
        setRows(json.map(r => parseRow(r, empresa.id)))
      } catch {
        alert('Erro ao ler o arquivo. Use o template fornecido.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const valid = rows.filter(r => r._errors.length === 0)
  const invalid = rows.filter(r => r._errors.length > 0)

  const handleImport = async () => {
    if (!valid.length) return
    setLoading(true)
    try {
      await onImport(valid)
      setResult({ ok: valid.length, fail: invalid.length })
      setRows([])
      setFileName('')
    } catch (e) {
      alert('Erro ao importar: ' + e.message)
    }
    setLoading(false)
  }

  const reset = () => { setRows([]); setFileName(''); setResult(null) }

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: T.text }}>
      {/* Header */}
      <div className="page-hd">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Importar Planilha</h1>
          <div style={{ color: T.sub, fontSize: 14 }}>Importe lançamentos em massa a partir de um arquivo Excel.</div>
        </div>
        <Btn variant="outline" onClick={downloadTemplate} icon="⬇">Baixar Template</Btn>
      </div>

      {/* Sucesso */}
      {result && (
        <Card style={{ padding: 28, textAlign: 'center', marginBottom: 20, border: `2px solid ${T.green}` }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: T.green, marginBottom: 8 }}>
            {result.ok} lançamentos importados com sucesso!
          </div>
          {result.fail > 0 && (
            <div style={{ color: T.orange, fontSize: 14, marginBottom: 12 }}>
              {result.fail} linha{result.fail > 1 ? 's' : ''} ignorada{result.fail > 1 ? 's' : ''} por erro de formato.
            </div>
          )}
          <Btn onClick={reset} variant="outline">Importar outro arquivo</Btn>
        </Card>
      )}

      {/* Upload area */}
      {!result && rows.length === 0 && (
        <Card style={{ padding: 0 }}>
          <div
            onClick={() => inputRef.current.click()}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            style={{
              border: `2px dashed ${dragging ? T.primary : T.border}`,
              borderRadius: 12, padding: '56px 40px', textAlign: 'center',
              cursor: 'pointer', transition: 'all .2s',
              background: dragging ? T.primaryLight : 'transparent',
            }}
          >
            <div style={{ fontSize: 52, marginBottom: 12 }}>📂</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              Arraste seu arquivo aqui ou clique para selecionar
            </div>
            <div style={{ color: T.sub, fontSize: 13, marginBottom: 16 }}>
              Aceita .xlsx, .xls e .csv · Máximo 10.000 linhas
            </div>
            <Btn onClick={e => { e.stopPropagation(); downloadTemplate() }} variant="outline" icon="⬇">
              Baixar template de exemplo
            </Btn>
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])} />
        </Card>
      )}

      {/* Instruções de formato */}
      {!result && rows.length === 0 && (
        <Card style={{ padding: 20, marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Formato esperado na planilha</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {['Coluna', 'Obrigatório', 'Valores aceitos'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: T.sub, fontWeight: 600, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Tipo', 'Sim', 'receita  ou  despesa'],
                  ['Descrição', 'Sim', 'Texto livre'],
                  ['Valor', 'Sim', 'Número (ex: 1500 ou 1500,00)'],
                  ['Data', 'Sim', 'DD/MM/AAAA ou AAAA-MM-DD'],
                  ['Categoria', 'Não', 'Nome da categoria (ex: Marketing)'],
                  ['Status', 'Não', 'Recebida · A Receber · Pago · A Pagar'],
                  ['Vencimento', 'Não', 'DD/MM/AAAA'],
                  ['Forma de Pagamento', 'Não', 'Texto livre (ex: Transferência)'],
                  ['Conta', 'Não', 'Nome da conta bancária'],
                  ['Cliente / Fornecedor', 'Não', 'Nome da pessoa ou empresa'],
                ].map(([col, req, vals]) => (
                  <tr key={col} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                    <td style={{ padding: '7px 12px', fontWeight: 600 }}>{col}</td>
                    <td style={{ padding: '7px 12px', color: req === 'Sim' ? T.red : T.muted }}>{req}</td>
                    <td style={{ padding: '7px 12px', color: T.sub }}>{vals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Preview */}
      {rows.length > 0 && !result && (
        <>
          {/* Stats */}
          <div className="g-3">
            {[
              { label: 'Total de linhas', value: rows.length, cor: T.text },
              { label: 'Prontas para importar', value: valid.length, cor: T.green },
              { label: 'Com erro (serão ignoradas)', value: invalid.length, cor: invalid.length > 0 ? T.red : T.muted },
            ].map(s => (
              <Card key={s.label} style={{ padding: '16px 20px' }}>
                <div style={{ color: T.sub, fontSize: 12, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontWeight: 800, fontSize: 26, color: s.cor }}>{s.value}</div>
              </Card>
            ))}
          </div>

          {/* Arquivo + ações */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📄</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{fileName}</div>
                <div style={{ color: T.muted, fontSize: 12 }}>{rows.length} linhas encontradas</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="ghost" onClick={reset}>Cancelar</Btn>
              <Btn onClick={handleImport} disabled={loading || !valid.length}>
                {loading ? 'Importando...' : `Importar ${valid.length} lançamento${valid.length !== 1 ? 's' : ''}`}
              </Btn>
            </div>
          </div>

          {/* Tabela preview */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.bg }}>
                    {['Status', 'Tipo', 'Descrição', 'Valor', 'Data', 'Categoria', 'Situação'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: T.sub, fontWeight: 600, borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const ok = r._errors.length === 0
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${T.borderLight}`, background: ok ? 'transparent' : 'rgba(220,38,38,0.12)' }}>
                        <td style={{ padding: '9px 14px' }}>
                          <span style={{ fontSize: 16 }}>{ok ? '✅' : '❌'}</span>
                        </td>
                        <td style={{ padding: '9px 14px' }}>
                          <span style={{
                            background: r.tipo === 'receita' ? T.greenL : T.redL,
                            color: r.tipo === 'receita' ? T.green : T.red,
                            borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700
                          }}>{r.tipo}</span>
                        </td>
                        <td style={{ padding: '9px 14px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.desc || <span style={{ color: T.muted }}>—</span>}</td>
                        <td style={{ padding: '9px 14px', fontWeight: 600, color: r.tipo === 'receita' ? T.green : T.red }}>
                          {r.valor > 0 ? fmtS(r.valor) : <span style={{ color: T.red }}>inválido</span>}
                        </td>
                        <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                          {r.data ? fd(r.data) : <span style={{ color: T.red }}>inválida</span>}
                        </td>
                        <td style={{ padding: '9px 14px', color: T.sub }}>{r.catNome}</td>
                        <td style={{ padding: '9px 14px' }}>
                          {ok
                            ? <span style={{ color: T.green, fontSize: 12, fontWeight: 600 }}>OK</span>
                            : <span style={{ color: T.red, fontSize: 11 }}>{r._errors.join(' · ')}</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
