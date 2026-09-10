'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from './translend-shell.module.css'
import { BusinessCollection, BusinessRecord, createBusinessRecord, deleteBusinessRecord, getBusinessRecords, updateBusinessRecord } from '@/lib/translend/business'

type Tab = 'Deliveries' | 'POD' | 'Exceptions'
type Field = { key: string; label: string; type?: 'text' | 'number' | 'date' | 'select'; required?: boolean; options?: string[]; source?: BusinessCollection }
type Lookup = { id: string; label: string }

const CONFIG: Record<Tab, { collection: BusinessCollection; description: string; fields: Field[] }> = {
  Deliveries: { collection: 'deliveries', description: 'Track delivery execution and completion against operational trips.', fields: [
    { key: 'reference', label: 'Delivery reference', required: true }, { key: 'tripId', label: 'Trip', type: 'select', source: 'trips', required: true }, { key: 'jobId', label: 'Job', type: 'select', source: 'jobs', required: true }, { key: 'destination', label: 'Destination', required: true }, { key: 'status', label: 'Status', type: 'select', options: ['planned', 'out-for-delivery', 'delivered', 'failed'] }, { key: 'deliveryDate', label: 'Delivery date', type: 'date' }, { key: 'notes', label: 'Notes' },
  ] },
  POD: { collection: 'pods', description: 'Capture proof of delivery and its verification status.', fields: [
    { key: 'reference', label: 'POD reference', required: true }, { key: 'deliveryId', label: 'Delivery', type: 'select', source: 'deliveries', required: true }, { key: 'tripId', label: 'Trip', type: 'select', source: 'trips', required: true }, { key: 'receivedBy', label: 'Received by', required: true }, { key: 'status', label: 'Status', type: 'select', options: ['pending', 'received', 'verified', 'rejected'] }, { key: 'receivedDate', label: 'Received date', type: 'date' }, { key: 'notes', label: 'Notes' },
  ] },
  Exceptions: { collection: 'exceptions', description: 'Record operational problems, severity and resolution.', fields: [
    { key: 'reference', label: 'Exception reference', required: true }, { key: 'tripId', label: 'Trip', type: 'select', source: 'trips' }, { key: 'deliveryId', label: 'Delivery', type: 'select', source: 'deliveries' }, { key: 'type', label: 'Exception type', required: true }, { key: 'severity', label: 'Severity', type: 'select', options: ['low', 'medium', 'high', 'critical'] }, { key: 'status', label: 'Status', type: 'select', options: ['open', 'investigating', 'resolved'] }, { key: 'notes', label: 'Notes' },
  ] },
}

export default function TranslendDelivery({ organizationId, userId, initialTab = 'Deliveries' }: { organizationId: string; userId: string; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [lookups, setLookups] = useState<Record<string, Lookup[]>>({})
  const [loadingLookups, setLoadingLookups] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingLookups(true)
      try {
        const [trips, jobs, deliveries] = await Promise.all([
          getBusinessRecords(organizationId, 'trips'), getBusinessRecords(organizationId, 'jobs'), getBusinessRecords(organizationId, 'deliveries'),
        ])
        if (cancelled) return
        setLookups({
          trips: trips.map(x => ({ id: x.id, label: String(x.reference || x.id) })),
          jobs: jobs.map(x => ({ id: x.id, label: String(x.reference || x.id) })),
          deliveries: deliveries.map(x => ({ id: x.id, label: String(x.reference || x.id) })),
        })
      } catch { if (!cancelled) setLookups({}) }
      finally { if (!cancelled) setLoadingLookups(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [organizationId])

  const config = CONFIG[tab]
  return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Delivery completion</span><h2>{tab}</h2><p style={{ marginTop: 5, color: '#718188', fontSize: 11 }}>{config.description}</p></div><div style={{ display: 'flex', gap: 6 }}>{(['Deliveries', 'POD', 'Exceptions'] as Tab[]).map(item => <button key={item} className={item === tab ? styles.primaryButton : styles.secondaryButton} onClick={() => setTab(item)}>{item}</button>)}</div></div>
    <DeliveryRecords key={tab} config={config} organizationId={organizationId} userId={userId} lookups={lookups} loadingLookups={loadingLookups} />
  </section>
}

function DeliveryRecords({ config, organizationId, userId, lookups, loadingLookups }: { config: typeof CONFIG[Tab]; organizationId: string; userId: string; lookups: Record<string, Lookup[]>; loadingLookups: boolean }) {
  const [rows, setRows] = useState<BusinessRecord[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [search, setSearch] = useState(''); const [editing, setEditing] = useState<BusinessRecord | null>(null); const [showForm, setShowForm] = useState(false)
  const refresh = useCallback(async () => { setLoading(true); setError(''); try { setRows(await getBusinessRecords(organizationId, config.collection)) } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load records.') } finally { setLoading(false) } }, [config.collection, organizationId])
  useEffect(() => { void refresh() }, [refresh])
  const filtered = useMemo(() => { const term = search.trim().toLowerCase(); return term ? rows.filter(row => config.fields.some(field => String(row[field.key] ?? '').toLowerCase().includes(term))) : rows }, [config.fields, rows, search])
  async function save(values: Record<string, string | number | null>) { try { if (editing) await updateBusinessRecord(organizationId, config.collection, editing.id, userId, values); else await createBusinessRecord(organizationId, config.collection, userId, values); setShowForm(false); setEditing(null); await refresh() } catch (err) { setError(err instanceof Error ? err.message : 'Save failed.') } }
  async function remove(row: BusinessRecord) { if (!window.confirm('Delete this record?')) return; try { await deleteBusinessRecord(organizationId, config.collection, row.id, userId); await refresh() } catch (err) { setError(err instanceof Error ? err.message : 'Delete failed.') } }
  return <>
    <div style={{ display: 'flex', gap: 8, padding: '0 18px 14px' }}><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records…" style={{ flex: 1 }} /><button className={styles.primaryButton} onClick={() => { setEditing(null); setShowForm(true) }}>+ Add</button></div>
    {error && <div style={{ margin: '0 18px 14px', padding: 10, borderRadius: 8, background: '#fff1f1', color: '#9b3030', fontSize: 12 }}>{error}</div>}
    <div className={styles.tableWrap}>{loading ? <Empty text="Loading…" /> : filtered.length === 0 ? <Empty text={rows.length ? 'No matching records.' : 'No records yet. Start the workflow here.'} /> : <table className={styles.table}><thead><tr>{config.fields.map(field => <th key={field.key}>{field.label}</th>)}<th>Action</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id}>{config.fields.map(field => <td key={field.key}>{displayValue(row[field.key], field, lookups)}</td>)}<td><button className={styles.textButton} onClick={() => { setEditing(row); setShowForm(true) }}>Edit</button><button className={styles.textButton} style={{ marginLeft: 8 }} onClick={() => void remove(row)}>Delete</button></td></tr>)}</tbody></table>}</div>
    {showForm && <DeliveryForm fields={config.fields} initial={editing} lookups={lookups} loadingLookups={loadingLookups} title={editing ? `Edit ${config.collection}` : `Add ${config.collection}`} onCancel={() => { setShowForm(false); setEditing(null) }} onSave={save} />}
  </>
}
function displayValue(value: string | number | null | undefined, field: Field, lookups: Record<string, Lookup[]>) { if (value == null || value === '') return '—'; if (field.source) return lookups[field.source]?.find(x => x.id === value)?.label || String(value); return String(value) }
function Empty({ text }: { text: string }) { return <div style={{ padding: 34, textAlign: 'center', color: '#718188', fontSize: 12 }}>{text}</div> }
function DeliveryForm({ fields, initial, lookups, loadingLookups, title, onCancel, onSave }: { fields: Field[]; initial: BusinessRecord | null; lookups: Record<string, Lookup[]>; loadingLookups: boolean; title: string; onCancel: () => void; onSave: (values: Record<string, string | number | null>) => Promise<void> }) {
  const [form, setForm] = useState<Record<string, string | number | null>>(() => Object.fromEntries(fields.map(field => [field.key, initial?.[field.key] ?? ''])))
  const set = (key: string, value: string | number) => setForm(current => ({ ...current, [key]: value }))
  return <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,42,48,.32)', display: 'grid', placeItems: 'center', padding: 18, zIndex: 100 }}><form onSubmit={async e => { e.preventDefault(); await onSave(form) }} style={{ width: 'min(100%,760px)', maxHeight: '90dvh', overflow: 'auto', background: '#fff', borderRadius: 16, border: '1px solid #dfe7ea', boxShadow: '0 25px 80px rgba(14,42,48,.2)', padding: 22 }}><h2 style={{ margin: '0 0 18px', fontSize: 20 }}>{title}</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>{fields.map(field => <label key={field.key} style={{ display: 'grid', gap: 5, fontSize: 11, color: '#41545b', gridColumn: field.key === 'notes' ? '1 / -1' : undefined }}><span>{field.label}{field.required ? ' *' : ''}</span>{field.source ? <select value={String(form[field.key] ?? '')} required={field.required} disabled={loadingLookups} onChange={e => set(field.key, e.target.value)}><option value="">{loadingLookups ? 'Loading…' : `Select ${field.label.toLowerCase()}…`}</option>{(lookups[field.source] || []).map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select> : field.type === 'select' ? <select value={String(form[field.key] ?? '')} required={field.required} onChange={e => set(field.key, e.target.value)}><option value="">Select…</option>{field.options?.map(option => <option key={option} value={option}>{option}</option>)}</select> : <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={String(form[field.key] ?? '')} required={field.required} onChange={e => set(field.key, field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} />}</label>)}</div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}><button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancel</button><button type="submit" className={styles.primaryButton}>Save</button></div></form></div>
}
