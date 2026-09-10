'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from './translend-shell.module.css'
import { BusinessRecord, createBusinessRecord, deleteBusinessRecord, getBusinessRecords, updateBusinessRecord } from '@/lib/translend/business'

type FleetTab = 'Trucks' | 'Drivers'
type Field = { key: string; label: string; type?: 'text' | 'number' | 'date' | 'select'; required?: boolean; options?: string[] }

const TRUCK_FIELDS: Field[] = [
  { key: 'unit', label: 'Unit number', required: true },
  { key: 'registration', label: 'Registration', required: true },
  { key: 'type', label: 'Vehicle type', required: true },
  { key: 'make', label: 'Make' },
  { key: 'model', label: 'Model' },
  { key: 'year', label: 'Year', type: 'number' },
  { key: 'capacity', label: 'Capacity' },
  { key: 'odometer', label: 'Odometer', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'maintenance', 'inactive'] },
  { key: 'nextService', label: 'Next service', type: 'date' },
  { key: 'notes', label: 'Notes' },
]

const DRIVER_FIELDS: Field[] = [
  { key: 'name', label: 'Full name', required: true },
  { key: 'employeeId', label: 'Employee ID' },
  { key: 'phone', label: 'Phone' },
  { key: 'license', label: 'Licence number', required: true },
  { key: 'licenseClass', label: 'Licence class' },
  { key: 'licenseExpiry', label: 'Licence expiry', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'off-duty', 'inactive'] },
  { key: 'notes', label: 'Notes' },
]

export default function TranslendFleet({ organizationId, userId }: { organizationId: string; userId: string }) {
  const [tab, setTab] = useState<FleetTab>('Trucks')
  return <section className={styles.panel}>
    <div className={styles.panelHeader}>
      <div>
        <span className={styles.panelEyebrow}>Fleet & master data</span>
        <h2>{tab}</h2>
        <p style={{ marginTop: 5, color: '#718188', fontSize: 11 }}>
          Maintain the vehicles and drivers available to your operation. Assignments belong to dispatch and trips.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {(['Trucks', 'Drivers'] as FleetTab[]).map((item) => <button key={item} className={item === tab ? styles.primaryButton : styles.secondaryButton} onClick={() => setTab(item)}>{item}</button>)}
      </div>
    </div>
    <FleetRecords collection={tab === 'Trucks' ? 'trucks' : 'drivers'} fields={tab === 'Trucks' ? TRUCK_FIELDS : DRIVER_FIELDS} organizationId={organizationId} userId={userId} />
  </section>
}

function FleetRecords({ collection, fields, organizationId, userId }: { collection: 'trucks' | 'drivers'; fields: Field[]; organizationId: string; userId: string }) {
  const [rows, setRows] = useState<BusinessRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<BusinessRecord | null>(null)
  const [showForm, setShowForm] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setRows(await getBusinessRecords(organizationId, collection)) }
    catch (err) { setError(err instanceof Error ? err.message : `Unable to load ${collection}.`) }
    finally { setLoading(false) }
  }, [collection, organizationId])

  useEffect(() => { void refresh() }, [refresh])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return rows
    return rows.filter(row => fields.some(field => String(row[field.key] ?? '').toLowerCase().includes(term)))
  }, [fields, query, rows])

  const activeCount = rows.filter(row => row.status === 'active').length
  const attentionCount = rows.filter(row => row.status === 'maintenance' || row.status === 'off-duty' || row.status === 'inactive').length

  async function save(values: Record<string, string | number | null>) {
    try {
      if (editing) await updateBusinessRecord(organizationId, collection, editing.id, userId, values)
      else await createBusinessRecord(organizationId, collection, userId, values)
      setShowForm(false)
      setEditing(null)
      await refresh()
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed.') }
  }

  async function remove(row: BusinessRecord) {
    const label = String(row[fields[0].key] ?? 'this record')
    if (!window.confirm(`Delete ${label}? This removes the fleet master record.`)) return
    try { await deleteBusinessRecord(organizationId, collection, row.id, userId); await refresh() }
    catch (err) { setError(err instanceof Error ? err.message : 'Delete failed.') }
  }

  return <>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10, padding: '0 18px 14px' }}>
      <Metric label="Total" value={rows.length} />
      <Metric label="Active" value={activeCount} />
      <Metric label="Other status" value={attentionCount} />
    </div>
    <div style={{ display: 'flex', gap: 8, padding: '0 18px 14px' }}>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${collection}…`} style={{ flex: 1 }} />
      <button className={styles.primaryButton} onClick={() => { setEditing(null); setShowForm(true) }}>+ Add {collection === 'trucks' ? 'truck' : 'driver'}</button>
    </div>
    {error && <div style={{ margin: '0 18px 14px', padding: 10, borderRadius: 8, background: '#fff1f1', color: '#9b3030', fontSize: 12 }}>{error}</div>}
    <div className={styles.tableWrap}>
      {loading ? <Empty text={`Loading ${collection}…`} /> : filtered.length === 0 ? <Empty text={rows.length === 0 ? `No ${collection} yet. Add the first record to build the fleet.` : 'No matching records.'} /> : <table className={styles.table}><thead><tr>{fields.map(field => <th key={field.key}>{field.label}</th>)}<th>Action</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id}>{fields.map(field => <td key={field.key}>{String(row[field.key] ?? '—')}</td>)}<td><button className={styles.textButton} onClick={() => { setEditing(row); setShowForm(true) }}>Edit</button><button className={styles.textButton} style={{ marginLeft: 8 }} onClick={() => void remove(row)}>Delete</button></td></tr>)}</tbody></table>}
    </div>
    {showForm && <FleetForm fields={fields} initial={editing} title={editing ? `Edit ${collection === 'trucks' ? 'truck' : 'driver'}` : `Add ${collection === 'trucks' ? 'truck' : 'driver'}`} onCancel={() => { setShowForm(false); setEditing(null) }} onSave={save} />}
  </>
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div style={{ border: '1px solid #dfe7ea', borderRadius: 10, padding: '11px 13px', background: '#fbfcfc' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: '#718188' }}>{label}</div><strong style={{ display: 'block', marginTop: 4, fontSize: 20, color: '#18343a' }}>{value}</strong></div>
}

function Empty({ text }: { text: string }) { return <div style={{ padding: 34, textAlign: 'center', color: '#718188', fontSize: 12 }}>{text}</div> }

function FleetForm({ fields, initial, title, onCancel, onSave }: { fields: Field[]; initial: BusinessRecord | null; title: string; onCancel: () => void; onSave: (values: Record<string, string | number | null>) => Promise<void> }) {
  const [form, setForm] = useState<Record<string, string | number | null>>(() => Object.fromEntries(fields.map(field => [field.key, initial?.[field.key] ?? ''])))
  return <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,42,48,.32)', display: 'grid', placeItems: 'center', padding: 18, zIndex: 100 }}><form onSubmit={async e => { e.preventDefault(); await onSave(form) }} style={{ width: 'min(100%,760px)', maxHeight: '90dvh', overflow: 'auto', background: '#fff', borderRadius: 16, border: '1px solid #dfe7ea', boxShadow: '0 25px 80px rgba(14,42,48,.2)', padding: 22 }}><h2 style={{ margin: '0 0 18px', fontSize: 20 }}>{title}</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>{fields.map(field => <label key={field.key} style={{ display: 'grid', gap: 5, fontSize: 11, color: '#41545b', gridColumn: field.key === 'notes' ? '1 / -1' : undefined }}><span>{field.label}{field.required ? ' *' : ''}</span>{field.type === 'select' ? <select value={String(form[field.key] ?? '')} required={field.required} onChange={e => setForm({ ...form, [field.key]: e.target.value })}><option value="">Select…</option>{field.options?.map(option => <option key={option} value={option}>{option}</option>)}</select> : <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={String(form[field.key] ?? '')} required={field.required} onChange={e => setForm({ ...form, [field.key]: field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value })} />}</label>)}</div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}><button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancel</button><button type="submit" className={styles.primaryButton}>Save</button></div></form></div>
}
