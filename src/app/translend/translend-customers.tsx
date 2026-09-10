'use client'

import { useCallback, useEffect, useState } from 'react'
import { createCustomer, deleteCustomer, getCustomer, getCustomers, updateCustomer, TranslendCustomer, TranslendCustomerStatus } from '@/lib/translend/customers'
import styles from './translend-shell.module.css'

export default function TranslendCustomers({ organizationId, userId }: { organizationId: string; userId: string }) {
  const [customers, setCustomers] = useState<TranslendCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<TranslendCustomer | null>(null)
  const [selected, setSelected] = useState<TranslendCustomer | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setCustomers(await getCustomers(organizationId)) } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load customers.') } finally { setLoading(false) }
  }, [organizationId])

  useEffect(() => { void load() }, [load])

  async function save(values: CustomerValues) {
    setError(null)
    try {
      if (editing) await updateCustomer({ organizationId, customerId: editing.id, ...values })
      else await createCustomer({ organizationId, createdBy: userId, ...values })
      setEditing(null); setShowForm(false); setSelected(null); await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save customer.') }
  }

  async function remove(customer: TranslendCustomer) {
    if (!window.confirm(`Delete ${customer.name}? This cannot be undone.`)) return
    setError(null)
    try { await deleteCustomer(organizationId, customer.id); setSelected(null); await load() } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete customer.') }
  }

  async function view(id: string) {
    try { setSelected(await getCustomer(organizationId, id)) } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load customer details.') }
  }

  return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Commercial</span><h2>Customers</h2><p style={{ marginTop: 5, color: '#718188', fontSize: 11 }}>Your company&apos;s customer records and commercial contacts.</p></div><button className={styles.primaryButton} onClick={() => { setEditing(null); setShowForm(true) }}>+ Add customer</button></div>
    {error && <div role="alert" style={{ margin: '0 22px 14px', padding: 12, borderRadius: 8, background: '#fff1f0', color: '#a33b31', fontSize: 12 }}>{error}</div>}
    {loading ? <EmptyState text="Loading customers…" /> : customers.length === 0 ? <EmptyState text="No customers yet. Add your first customer to begin building your commercial records." /> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Name</th><th>Contact</th><th>Phone</th><th>Terms</th><th>Status</th><th>Notes</th><th>Action</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td><button className={styles.textButton} onClick={() => void view(customer.id)}><strong>{customer.name}</strong></button></td><td>{customer.contactName || '—'}</td><td>{customer.phone || '—'}</td><td>{customer.paymentTerms || '—'}</td><td>{customer.status === 'active' ? 'Active' : 'Inactive'}</td><td>{customer.notes || '—'}</td><td><button className={styles.textButton} onClick={() => { setEditing(customer); setShowForm(true) }}>Edit</button>{' '}<button className={styles.textButton} onClick={() => void remove(customer)}>Delete</button></td></tr>)}</tbody></table></div>}
    {selected && <CustomerDetail customer={selected} onClose={() => setSelected(null)} onEdit={() => { setEditing(selected); setSelected(null); setShowForm(true) }} />}
    {showForm && <CustomerForm initial={editing} onCancel={() => { setShowForm(false); setEditing(null) }} onSave={save} />}
  </section>
}

type CustomerValues = { name: string; contactName: string; phone: string; email: string; paymentTerms: string; status: TranslendCustomerStatus; notes: string }

function CustomerForm({ initial, onCancel, onSave }: { initial: TranslendCustomer | null; onCancel: () => void; onSave: (values: CustomerValues) => Promise<void> }) {
  const [form, setForm] = useState<CustomerValues>({ name: initial?.name || '', contactName: initial?.contactName || '', phone: initial?.phone || '', email: initial?.email || '', paymentTerms: initial?.paymentTerms || '', status: initial?.status || 'active', notes: initial?.notes || '' })
  const [saving, setSaving] = useState(false)
  async function submit(event: React.FormEvent) { event.preventDefault(); setSaving(true); try { await onSave(form) } finally { setSaving(false) } }
  const field = (key: keyof CustomerValues, label: string, type = 'text') => <label style={labelStyle}>{label}<input type={type} required={key === 'name'} value={String(form[key])} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} style={inputStyle} /></label>
  return <Modal title={initial ? 'Edit customer' : 'Add customer'} onClose={onCancel}><form onSubmit={submit}><div style={gridStyle}>{field('name', 'Name')}{field('contactName', 'Contact')}{field('phone', 'Phone', 'tel')}{field('email', 'Email', 'email')}{field('paymentTerms', 'Payment terms')}<label style={labelStyle}>Status<select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TranslendCustomerStatus }))} style={inputStyle}><option value="active">Active</option><option value="inactive">Inactive</option></select></label><label style={labelStyle}>Notes<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></label></div><div style={actionsStyle}><button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancel</button><button className={styles.primaryButton} disabled={saving}>{saving ? 'Saving…' : initial ? 'Save changes' : 'Add customer'}</button></div></form></Modal>
}

function CustomerDetail({ customer, onClose, onEdit }: { customer: TranslendCustomer; onClose: () => void; onEdit: () => void }) { return <Modal title={customer.name} onClose={onClose}><div style={gridStyle}><Detail label="Contact" value={customer.contactName} /><Detail label="Phone" value={customer.phone} /><Detail label="Email" value={customer.email} /><Detail label="Payment terms" value={customer.paymentTerms} /><Detail label="Status" value={customer.status === 'active' ? 'Active' : 'Inactive'} /><Detail label="Notes" value={customer.notes} /></div><div style={actionsStyle}><button className={styles.secondaryButton} onClick={onClose}>Close</button><button className={styles.primaryButton} onClick={onEdit}>Edit customer</button></div></Modal> }
function Detail({ label, value }: { label: string; value: string }) { return <div><div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', color: '#819197' }}>{label}</div><div style={{ marginTop: 5, fontSize: 12, color: '#243b41' }}>{value || '—'}</div></div> }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,42,48,.32)', display: 'grid', placeItems: 'center', padding: 18, zIndex: 100 }}><div style={{ width: 'min(100%, 720px)', maxHeight: '90dvh', overflow: 'auto', background: '#fff', borderRadius: 16, padding: 22 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}><div><span style={{ color: '#0c6c7d', fontSize: 9, fontWeight: 900, textTransform: 'uppercase' }}>Customer record</span><h2 style={{ margin: '5px 0 0', fontSize: 20 }}>{title}</h2></div><button type="button" className={styles.iconButton} onClick={onClose}>×</button></div>{children}</div></div> }
function EmptyState({ text }: { text: string }) { return <div style={{ padding: 28, color: '#819197', fontSize: 12, textAlign: 'center' }}>{text}</div> }
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }
const labelStyle: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 10, fontWeight: 800, color: '#53666c' }
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 11px', border: '1px solid #d8e0e4', borderRadius: 8, fontSize: 12, color: '#243b41' }
const actionsStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 20 }
