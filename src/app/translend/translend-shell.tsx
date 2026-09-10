'use client'

import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { BarChart3, Bell, Boxes, ChevronDown, ClipboardList, FileText, Fuel, Gauge, LayoutDashboard, Map, Menu, MoreHorizontal, Plus, Route, Settings, Truck, Users, Wrench, X } from 'lucide-react'
import styles from './translend-shell.module.css'
import { translendAuth } from '@/lib/translend/firebase/client'
import { getTranslendWorkspaceForUser, TranslendOrganization } from '@/lib/translend/workspace'
import { TranslendSessionBadge } from './translend-auth'
import TranslendCustomers from './translend-customers'

type RecordItem = Record<string, string>
type ModuleKey = 'Dashboard' | 'Jobs' | 'Dispatch' | 'Trips' | 'Deliveries' | 'Routes' | 'Trucks' | 'Drivers' | 'Maintenance' | 'Inspections' | 'Compliance' | 'Tyres' | 'Fuel' | 'Customers' | 'Rate Cards' | 'Invoices' | 'Receipts' | 'Statements' | 'Expenses' | 'Profitability' | 'Operational P&L' | 'Documents' | 'Reports' | 'Settings'
const navigation: { label: string; items: { label: ModuleKey; icon: typeof LayoutDashboard }[] }[] = [
  { label: 'Control Tower', items: [{ label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'Operations', items: [{ label: 'Jobs', icon: ClipboardList }, { label: 'Dispatch', icon: Gauge }, { label: 'Trips', icon: Route }, { label: 'Deliveries', icon: Boxes }, { label: 'Routes', icon: Map }] },
  { label: 'Fleet', items: [{ label: 'Trucks', icon: Truck }, { label: 'Drivers', icon: Users }, { label: 'Maintenance', icon: Wrench }, { label: 'Inspections', icon: ClipboardList }, { label: 'Compliance', icon: FileText }, { label: 'Tyres', icon: MoreHorizontal }, { label: 'Fuel', icon: Fuel }] },
  { label: 'Commercial', items: [{ label: 'Customers', icon: Users }, { label: 'Rate Cards', icon: FileText }, { label: 'Invoices', icon: FileText }, { label: 'Receipts', icon: FileText }, { label: 'Statements', icon: FileText }] },
  { label: 'Finance', items: [{ label: 'Expenses', icon: FileText }, { label: 'Profitability', icon: BarChart3 }, { label: 'Operational P&L', icon: BarChart3 }] },
  { label: 'System', items: [{ label: 'Documents', icon: FileText }, { label: 'Reports', icon: BarChart3 }, { label: 'Settings', icon: Settings }] },
]
const fieldMap: Record<string, string[]> = {
  Jobs: ['Reference', 'Customer', 'Route', 'Truck', 'Status', 'Value'], Trips: ['Reference', 'Job', 'Driver', 'Truck', 'Status', 'Date'], Deliveries: ['Reference', 'Job', 'Destination', 'Status', 'POD', 'Date'], Trucks: ['Unit', 'Registration', 'Type', 'Status', 'Odometer', 'Next service'], Drivers: ['Name', 'Phone', 'License', 'Status', 'Truck', 'Expiry'], Customers: ['Name', 'Contact', 'Phone', 'Terms', 'Status', 'Notes'], Invoices: ['Number', 'Customer', 'Job', 'Amount', 'Status', 'Due'], Expenses: ['Reference', 'Category', 'Amount', 'Job', 'Status', 'Date'], Routes: ['Name', 'Origin', 'Destination', 'Distance', 'Status', 'Notes'], 'Rate Cards': ['Name', 'Customer', 'Route', 'Rate', 'Unit', 'Status'], Receipts: ['Reference', 'Customer', 'Invoice', 'Amount', 'Method', 'Date'], Statements: ['Customer', 'Period', 'Balance', 'Status', 'Updated', 'Notes'], Maintenance: ['Reference', 'Truck', 'Work type', 'Status', 'Cost', 'Due'], Inspections: ['Reference', 'Truck', 'Inspector', 'Status', 'Date', 'Notes'], Compliance: ['Reference', 'Truck/Driver', 'Requirement', 'Status', 'Expiry', 'Notes'], Tyres: ['Reference', 'Truck', 'Position', 'Brand', 'Status', 'Mileage'], Fuel: ['Reference', 'Truck', 'Litres', 'Cost', 'Station', 'Date'], Documents: ['Reference', 'Type', 'Related to', 'Status', 'Expiry', 'Notes'], Reports: ['Report', 'Period', 'Owner', 'Status', 'Generated', 'Notes'],
}

export default function TranslendShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [active, setActive] = useState<ModuleKey>('Dashboard')
  const [user, setUser] = useState<{ uid: string; displayName?: string | null; email?: string | null } | null>(null)
  const [organization, setOrganization] = useState<TranslendOrganization | null>(null)
  const [records, setRecords] = useState<Record<string, RecordItem[]>>({})
  const [showForm, setShowForm] = useState(false)
  useEffect(() => onAuthStateChanged(translendAuth, async (nextUser) => {
    setUser(nextUser ? { uid: nextUser.uid, displayName: nextUser.displayName, email: nextUser.email } : null)
    if (!nextUser) { setOrganization(null); return }
    const workspace = await getTranslendWorkspaceForUser(nextUser.uid)
    setOrganization(workspace?.organization ?? null)
    setRecords({})
  }), [])
  const activeRows = records[active] ?? []
  const jobs = records.Jobs ?? []
  const trucks = records.Trucks ?? []
  const drivers = records.Drivers ?? []
  const deliveries = records.Deliveries ?? []
  const invoices = records.Invoices ?? []
  const attention = useMemo(() => [
    ...trucks.filter((x) => /due|service/i.test(x.Status ?? '')).map((x) => ({ tone: 'orange', title: `${x.Unit} needs attention`, detail: `${x.Status} · ${x['Next service'] ?? 'Review required'}` })),
    ...deliveries.filter((x) => /pending|missing/i.test(x.POD ?? '') || /pending/i.test(x.Status ?? '')).map((x) => ({ tone: 'red', title: `${x.Reference} POD pending`, detail: `${x.Job ?? 'Delivery'} · action required` })),
  ], [trucks, deliveries])
  function select(next: ModuleKey) { setActive(next); setShowForm(false); setMobileOpen(false) }
  function addRecord(item: RecordItem) { setRecords((current) => ({ ...current, [active]: [...(current[active] ?? []), item] })); setShowForm(false) }
  function removeRecord(index: number) { setRecords((current) => ({ ...current, [active]: (current[active] ?? []).filter((_, i) => i !== index) })) }
  async function logout() { await signOut(translendAuth) }
  return <div className={styles.app}>
    <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.brandRow}><div className={styles.brandMark}>T</div><div><div className={styles.brandName}>Translend</div><div className={styles.brandSub}>TMS · Truck Division</div></div><button className={styles.closeButton} onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button></div>
      <div className={styles.workspace}><span className={styles.workspaceLabel}>Workspace</span><div className={styles.workspaceButton}><span>{organization?.name || 'Company workspace'}</span><ChevronDown size={15} /></div></div>
      <nav className={styles.nav} aria-label="Translend navigation">{navigation.map((section) => <div key={section.label} className={styles.navSection}><div className={styles.sectionLabel}>{section.label}</div>{section.items.map(({ label, icon: Icon }) => <button key={label} className={`${styles.navItem} ${active === label ? styles.navItemActive : ''}`} onClick={() => select(label)}><Icon size={17} strokeWidth={1.9} /><span>{label}</span></button>)}</div>)}</nav>
      <div className={styles.sidebarFooter}><div className={styles.statusDot} /><div><strong>Workspace ready</strong><span>Private company workspace</span></div></div>
    </aside>
    {mobileOpen && <button className={styles.backdrop} onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <div className={styles.main}>
      <header className={styles.topbar}><button className={styles.menuButton} onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div className={styles.breadcrumb}><span>Translend</span><b>/</b><strong>{active}</strong></div><div className={styles.topActions}><TranslendSessionBadge /><button className={styles.iconButton} aria-label="Notifications"><Bell size={19} /></button><div className={styles.profile}><span className={styles.avatar}>{user?.displayName?.slice(0, 2).toUpperCase() || 'OP'}</span><span className={styles.profileText}><strong>{user?.displayName || 'Operations'}</strong><small>{user?.email || organization?.name || ''}</small></span><button onClick={logout} className={styles.textButton}>Exit</button></div></div></header>
      <main className={styles.content}>
        {active === 'Dashboard' ? <Dashboard jobs={jobs} trucks={trucks} drivers={drivers} invoices={invoices} attention={attention} onOpen={select} organization={organization} /> : active === 'Customers' && organization && user ? <TranslendCustomers organizationId={organization.id} userId={user.uid} /> : <ModuleView module={active} rows={activeRows} onAdd={() => setShowForm(true)} onRemove={removeRecord} />}
        {showForm && active !== 'Dashboard' && active !== 'Customers' && <RecordForm module={active} onCancel={() => setShowForm(false)} onSave={addRecord} />}
        <div className={styles.footerNote}><span>Translend TMS · company workspace</span><span>{active === 'Customers' ? 'Customer records are stored securely in your private workspace.' : 'Business records are currently session-only until their data layer is connected.'}</span></div>
      </main>
    </div>
  </div>
}

function Dashboard({ jobs, trucks, drivers, invoices, attention, onOpen, organization }: { jobs: RecordItem[]; trucks: RecordItem[]; drivers: RecordItem[]; invoices: RecordItem[]; attention: { tone: string; title: string; detail: string }[]; onOpen: (module: ModuleKey) => void; organization: TranslendOrganization | null }) {
  const activeJobs = jobs.filter((x) => !/delivered|cancelled/i.test(x.Status ?? '')).length
  const onRoad = trucks.filter((x) => /road|trip|transit/i.test(x.Status ?? '')).length
  const readyInvoices = invoices.filter((x) => /ready|approved|pending/i.test(x.Status ?? '')).length
  const kpis = [{ label: 'Active jobs', value: String(activeJobs), note: `${attention.length} need attention`, tone: 'teal' }, { label: 'Trucks on road', value: String(onRoad), note: `${trucks.length} tracked in workspace`, tone: 'blue' }, { label: 'Drivers', value: String(drivers.length), note: 'Current workspace records', tone: 'green' }, { label: 'Ready to invoice', value: String(readyInvoices), note: 'Open commercial records', tone: 'orange' }]
  return <>
    <section className={styles.pageHeader}><div><span className={styles.eyebrow}>Control Tower</span><h1>{organization?.name || 'Your company'}.</h1><p>Your private transport workspace is ready. Start with the records that drive your operation.</p></div><div className={styles.headerActions}><button className={styles.secondaryButton} onClick={() => onOpen('Reports')}>Reports</button><button className={styles.primaryButton} onClick={() => onOpen('Jobs')}><Plus size={14} /> New job</button></div></section>
    <section className={styles.kpiGrid}>{kpis.map((kpi) => <article className={styles.kpiCard} key={kpi.label}><div className={`${styles.kpiIcon} ${styles[kpi.tone as keyof typeof styles]}`}><Gauge size={18} /></div><span className={styles.kpiLabel}>{kpi.label}</span><strong className={styles.kpiValue}>{kpi.value}</strong><span className={styles.kpiNote}>{kpi.note}</span></article>)}</section>
    <section className={styles.dashboardGrid}><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Attention</span><h2>Needs action</h2></div></div><div className={styles.attentionList}>{attention.length ? attention.slice(0, 5).map((item) => <AttentionItem key={item.title} {...item} />) : <EmptyState text="Nothing is currently flagged. Add operational data when the records layer is connected." />}</div></article><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Workflow</span><h2>Operational spine</h2></div></div><div className={styles.movementRows}><Movement label="Jobs" value={jobs.length} /><Movement label="Trucks" value={trucks.length} /><Movement label="Drivers" value={drivers.length} /><Movement label="Invoices" value={invoices.length} /></div></article></section>
    <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Workspace</span><h2>Recent jobs</h2></div><button className={styles.textButton} onClick={() => onOpen('Jobs')}>Open jobs</button></div><div className={styles.tableWrap}><EmptyState text="No jobs yet. Your workspace starts clean so the first records belong to your company." /></div></section>
  </>
}

function ModuleView({ module, rows, onAdd, onRemove }: { module: ModuleKey; rows: RecordItem[]; onAdd: () => void; onRemove: (index: number) => void }) {
  const fields = fieldMap[module] ?? ['Reference', 'Status', 'Notes']
  const description = module === 'Dispatch' ? 'Turn jobs into planned movements and keep the next operational action visible.' : `Manage ${module.toLowerCase()} records from this workspace.`
  return <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Company workspace</span><h2>{module}</h2><p style={{ marginTop: 5, color: '#718188', fontSize: 11 }}>{description}</p></div><button className={styles.primaryButton} onClick={onAdd}><Plus size={14} /> Add record</button></div><div className={styles.tableWrap}>{rows.length ? <table className={styles.table}><thead><tr>{fields.map((field) => <th key={field}>{field}</th>)}<th>Action</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${module}-${index}`}><td><strong>{row[fields[0]] || '—'}</strong></td>{fields.slice(1).map((field) => <td key={field}>{row[field] || '—'}</td>)}<td><button className={styles.textButton} onClick={() => onRemove(index)}>Delete</button></td></tr>)}</tbody></table> : <EmptyState text={`No ${module.toLowerCase()} records yet. This area is clean for your company's first records.`} />}</div></section>
}

function RecordForm({ module, onCancel, onSave }: { module: ModuleKey; onCancel: () => void; onSave: (item: RecordItem) => void }) {
  const fields = fieldMap[module] ?? ['Reference', 'Status', 'Notes']
  const [form, setForm] = useState<RecordItem>({})
  return <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,42,48,.32)', display: 'grid', placeItems: 'center', padding: 18, zIndex: 100 }}><form onSubmit={(event) => { event.preventDefault(); onSave(form) }} style={{ width: 'min(100%, 720px)', maxHeight: '90dvh', overflow: 'auto', background: '#fff', borderRadius: 16, border: '1px solid #dfe7ea', boxShadow: '0 25px 80px rgba(14,42,48,.2)', padding: 22 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}><div><span style={{ color: '#0c6c7d', fontSize: 9, fontWeight: 900, letterSpacing: '.13em', textTransform: 'uppercase' }}>Record entry</span><h2 style={{ margin: '5px 0 0', fontSize: 20 }}>{module}</h2></div><button type="button" className={styles.iconButton} onClick={onCancel}><X size={18} /></button></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>{fields.map((field) => <label key={field} style={{ display: 'grid', gap: 6, fontSize: 10, fontWeight: 800, color: '#53666c' }}>{field}<input required={field === fields[0]} value={form[field] ?? ''} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} placeholder={`Enter ${field.toLowerCase()}`} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 11px', border: '1px solid #d8e0e4', borderRadius: 8, fontSize: 12, color: '#243b41', outline: 'none' }} /></label>)}</div><div style={{ marginTop: 14, padding: 11, borderRadius: 8, background: '#f4f7f8', color: '#718188', fontSize: 11 }}>This entry is session-only until this module's company data layer is connected.</div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 20 }}><button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancel</button><button className={styles.primaryButton} type="submit">Add to session</button></div></form></div>
}
function AttentionItem({ tone, title, detail }: { tone: string; title: string; detail: string }) { return <div className={styles.attentionItem}><span className={`${styles.statusBar} ${styles[tone as keyof typeof styles]}`} /><div><strong>{title}</strong><span>{detail}</span></div></div> }
function Movement({ label, value }: { label: string; value: number }) { return <div className={styles.movementRow}><div className={styles.movementLabel}><span>{label}</span><strong>{value}</strong></div><div className={styles.progress}><span style={{ width: value ? '72%' : '0%' }} /></div></div> }
function EmptyState({ text }: { text: string }) { return <div style={{ padding: 28, color: '#819197', fontSize: 12, textAlign: 'center' }}>{text}</div> }
