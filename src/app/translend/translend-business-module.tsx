'use client'
import { useEffect, useState } from 'react'
import styles from './translend-shell.module.css'
import { BUSINESS_CONFIG, BusinessCollection, BusinessField, BusinessRecord, createBusinessRecord, deleteBusinessRecord, getBusinessRecords, updateBusinessRecord } from '@/lib/translend/business'

type Props = { collectionName: BusinessCollection; organizationId: string; userId: string }

export default function TranslendBusinessModule({ collectionName, organizationId, userId }: Props) {
  const config = BUSINESS_CONFIG[collectionName]
  const [rows, setRows] = useState<BusinessRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<BusinessRecord | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      setRows(await getBusinessRecords(organizationId, collectionName))
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to load ${config.title.toLowerCase()}.`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [organizationId, collectionName])

  const singular = config.title.endsWith('s') ? config.title.slice(0, -1) : config.title

  async function remove(row: BusinessRecord) {
    if (!window.confirm(`Delete ${String(row[config.fields[0].key] ?? 'this record')}?`)) return
    try {
      await deleteBusinessRecord(organizationId, collectionName, row.id, userId)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  async function save(values: Record<string, string | number | null>) {
    try {
      if (editing) {
        await updateBusinessRecord(organizationId, collectionName, editing.id, userId, values)
      } else {
        await createBusinessRecord(organizationId, collectionName, userId, values)
      }
      setShowForm(false)
      setEditing(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    }
  }

  return <section className={styles.panel}>
    <div className={styles.panelHeader}>
      <div>
        <span className={styles.panelEyebrow}>Connected business data</span>
        <h2>{config.title}</h2>
        <p style={{ marginTop: 5, color: '#718188', fontSize: 11 }}>{config.description}</p>
      </div>
      <button className={styles.primaryButton} onClick={() => { setEditing(null); setShowForm(true) }}>+ Add {singular.toLowerCase()}</button>
    </div>
    {error && <div style={{ margin: '0 18px 14px', padding: 10, borderRadius: 8, background: '#fff1f1', color: '#9b3030', fontSize: 12 }}>{error}</div>}
    <div className={styles.tableWrap}>
      {loading ? <Empty text={`Loading ${config.title.toLowerCase()}…`} /> : rows.length === 0 ? <Empty text={`No ${config.title.toLowerCase()} yet. Add the company's first record.`} /> : <table className={styles.table}><thead><tr>{config.fields.map(field => <th key={field.key}>{field.label}</th>)}<th>Action</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>{config.fields.map(field => <td key={field.key}>{String(row[field.key] ?? '—')}</td>)}<td><button className={styles.textButton} onClick={() => { setEditing(row); setShowForm(true) }}>Edit</button><button className={styles.textButton} onClick={() => void remove(row)} style={{ marginLeft: 8 }}>Delete</button></td></tr>)}</tbody></table>}
    </div>
    {showForm && <BusinessForm fields={config.fields} initial={editing} title={editing ? `Edit ${singular}` : `Add ${singular}`} onCancel={() => { setShowForm(false); setEditing(null) }} onSave={save} />}
  </section>
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: 34, textAlign: 'center', color: '#718188', fontSize: 12 }}>{text}</div>
}

function BusinessForm({ fields, initial, title, onCancel, onSave }: { fields: BusinessField[]; initial: BusinessRecord | null; title: string; onCancel: () => void; onSave: (values: Record<string, string | number | null>) => Promise<void> }) {
  const [form, setForm] = useState<Record<string, string | number | null>>(() => Object.fromEntries(fields.map(field => [field.key, initial?.[field.key] ?? ''])))
  return <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,42,48,.32)', display: 'grid', placeItems: 'center', padding: 18, zIndex: 100 }}><form onSubmit={async e => { e.preventDefault(); await onSave(form) }} style={{ width: 'min(100%,680px)', maxHeight: '90dvh', overflow: 'auto', background: '#fff', borderRadius: 16, border: '1px solid #dfe7ea', boxShadow: '0 25px 80px rgba(14,42,48,.2)', padding: 22 }}><h2 style={{ margin: '0 0 18px', fontSize: 20 }}>{title}</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>{fields.map(field => <label key={field.key} style={{ display: 'grid', gap: 5, fontSize: 11, color: '#41545b', gridColumn: field.key === 'notes' ? '1 / -1' : undefined }}><span>{field.label}{field.required ? ' *' : ''}</span>{field.type === 'select' ? <select value={String(form[field.key] ?? '')} required={field.required} onChange={e => setForm({ ...form, [field.key]: e.target.value })}><option value="">Select…</option>{field.options?.map(o => <option key={o} value={o}>{o}</option>)}</option></select> : <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={String(form[field.key] ?? '')} required={field.required} onChange={e => setForm({ ...form, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })} />}</label>)}</div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}><button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancel</button><button type="submit" className={styles.primaryButton}>Save</button></div></form></div>
}
