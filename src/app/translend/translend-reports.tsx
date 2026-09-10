'use client'

import { useState } from 'react'
import { jsPDF } from 'jspdf'
import styles from './translend-shell.module.css'
import { BusinessCollection, BusinessRecord, getBusinessRecords } from '@/lib/translend/business'

type ReportKind = 'operations' | 'financial' | 'fleet' | 'customers'
const labels: Record<ReportKind, string> = { operations: 'Operations summary', financial: 'Revenue & costs', fleet: 'Fleet snapshot', customers: 'Customer balances' }

export default function TranslendReports({ organizationId }: { organizationId: string }) {
  const [kind, setKind] = useState<ReportKind>('operations')
  const [rows, setRows] = useState<string[][]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState('')

  async function generate() {
    setLoading(true); setError(''); setGenerated('')
    try {
      const names: BusinessCollection[] = kind === 'operations' ? ['jobs', 'dispatches', 'trips', 'deliveries', 'pods', 'exceptions'] : kind === 'financial' ? ['invoices', 'fuel', 'maintenance', 'tyres', 'expenses'] : kind === 'fleet' ? ['trucks', 'drivers', 'maintenance', 'inspections', 'compliance', 'tyres', 'fuel'] : ['customers', 'invoices', 'receipts']
      const result = await Promise.all(names.map((name) => getBusinessRecords(organizationId, name)))
      const data = buildRows(kind, names, result)
      setRows(data); setGenerated(new Date().toLocaleString())
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Unable to generate report.') }
    finally { setLoading(false) }
  }

  function downloadCsv() {
    if (!rows.length) return
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `${kind}-report.csv`; link.click(); URL.revokeObjectURL(url)
  }

  function downloadPdf() {
    if (!rows.length) return
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' }); const margin = 36; let y = 48
    pdf.setFontSize(18); pdf.text(`Translend — ${labels[kind]}`, margin, y); y += 18; pdf.setFontSize(9); pdf.text(`Generated ${generated}`, margin, y); y += 22
    rows.forEach((row, index) => { const line = row.join('  |  '); pdf.setFontSize(index === 0 ? 8 : 7); pdf.text(line.slice(0, 150), margin, y); y += 13; if (y > 800) { pdf.addPage(); y = 48 } })
    pdf.save(`${kind}-report.pdf`)
  }

  return <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Owner / operator reporting</span><h2>Reports</h2><p style={{ marginTop: 5, color: '#718188', fontSize: 11 }}>Generate practical reports directly from the company's live Firestore records, then export CSV or PDF.</p></div></div><div style={{ padding: 18, display: 'flex', flexWrap: 'wrap', gap: 9, alignItems: 'center' }}><select value={kind} onChange={(event) => setKind(event.target.value as ReportKind)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className={styles.primaryButton} onClick={() => void generate()} disabled={loading}>{loading ? 'Generating…' : 'Generate report'}</button><button className={styles.secondaryButton} onClick={downloadCsv} disabled={!rows.length}>Export CSV</button><button className={styles.secondaryButton} onClick={downloadPdf} disabled={!rows.length}>Export PDF</button></div>{error && <div style={{ margin: '0 18px 14px', padding: 10, color: '#9b3030', background: '#fff1f1' }}>{error}</div>}{generated && <div style={{ padding: '0 18px 14px', color: '#718188', fontSize: 10 }}>Generated {generated} · live records only</div>}<div className={styles.tableWrap}>{!rows.length ? <div style={{ padding: 38, textAlign: 'center', color: '#718188' }}>Choose a report and generate it when you need an up-to-date operational snapshot.</div> : <table className={styles.table}><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => index === 0 ? <th key={cellIndex}>{cell}</th> : <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table>}</div></section>
}

function buildRows(kind: ReportKind, names: BusinessCollection[], data: BusinessRecord[][]): string[][] {
  const get = (name: BusinessCollection) => data[names.indexOf(name)] || []
  if (kind === 'operations') return [['Metric', 'Count'], ['Jobs', String(get('jobs').filter((r) => !['delivered', 'cancelled'].includes(String(r.status))).length)], ['Dispatches', String(get('dispatches').length)], ['Trips', String(get('trips').length)], ['Deliveries', String(get('deliveries').length)], ['POD records', String(get('pods').length)], ['Open exceptions', String(get('exceptions').filter((r) => r.status !== 'resolved').length)]]
  if (kind === 'financial') { const inv = get('invoices').filter((r) => !['draft', 'void'].includes(String(r.status))); const revenue = inv.reduce((s, r) => s + Number(r.amount || 0), 0); const fuel = get('fuel').reduce((s, r) => s + Number(r.cost || 0), 0); const maintenance = get('maintenance').reduce((s, r) => s + Number(r.cost || 0), 0); const tyres = get('tyres').reduce((s, r) => s + Number(r.cost || 0), 0); const expenses = get('expenses').filter((r) => r.status !== 'draft').reduce((s, r) => s + Number(r.amount || 0), 0); return [['Metric', 'Amount'], ['Invoice revenue', revenue.toLocaleString()], ['Fuel', fuel.toLocaleString()], ['Maintenance', maintenance.toLocaleString()], ['Tyres', tyres.toLocaleString()], ['Other expenses', expenses.toLocaleString()], ['Net contribution', (revenue - fuel - maintenance - tyres - expenses).toLocaleString()]] }
  if (kind === 'fleet') return [['Metric', 'Count'], ['Trucks', String(get('trucks').length)], ['Active trucks', String(get('trucks').filter((r) => r.status === 'active').length)], ['Drivers', String(get('drivers').length)], ['Maintenance records', String(get('maintenance').length)], ['Inspections', String(get('inspections').length)], ['Compliance records', String(get('compliance').length)], ['Tyre records', String(get('tyres').length)], ['Fuel transactions', String(get('fuel').length)]]
  const customers = get('customers'); const invoices = get('invoices'); const receipts = get('receipts'); return [['Customer', 'Invoiced', 'Received', 'Balance'], ...customers.map((customer) => { const id = customer.id; const invoiced = invoices.filter((r) => r.customerId === id).reduce((s, r) => s + Number(r.amount || 0), 0); const received = receipts.filter((r) => r.customerId === id).reduce((s, r) => s + Number(r.amount || 0), 0); return [String(customer.name || customer.id), invoiced.toLocaleString(), received.toLocaleString(), (invoiced - received).toLocaleString()] })]
}
