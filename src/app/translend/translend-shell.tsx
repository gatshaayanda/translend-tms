'use client'

import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { BarChart3, Bell, Boxes, ChevronDown, ClipboardList, FileText, Fuel, Gauge, LayoutDashboard, Map, Menu, MoreHorizontal, Plus, Route, Settings, Truck, Users, Wrench, X } from 'lucide-react'
import styles from './translend-shell.module.css'
import { translendAuth } from '@/lib/translend/firebase/client'
import { TranslendSessionBadge } from './translend-auth'

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
  Jobs: ['Reference', 'Customer', 'Route', 'Truck', 'Status', 'Value'],
  Trips: ['Reference', 'Job', 'Driver', 'Truck', 'Status', 'Date'],
  Deliveries: ['Reference', 'Job', 'Destination', 'Status', 'POD', 'Date'],
  Trucks: ['Unit', 'Registration', 'Type', 'Status', 'Odometer', 'Next service'],
  Drivers: ['Name', 'Phone', 'License', 'Status', 'Truck', 'Expiry'],
  Customers: ['Name', 'Contact', 'Phone', 'Terms', 'Status', 'Notes'],
  Invoices: ['Number', 'Customer', 'Job', 'Amount', 'Status', 'Due'],
  Expenses: ['Reference', 'Category', 'Amount', 'Job', 'Status', 'Date'],
  Routes: ['Name', 'Origin', 'Destination', 'Distance', 'Status', 'Notes'],
  'Rate Cards': ['Name', 'Customer', 'Route', 'Rate', 'Unit', 'Status'],
  Receipts: ['Reference', 'Customer', 'Invoice', 'Amount', 'Method', 'Date'],
  Statements: ['Customer', 'Period', 'Balance', 'Status', 'Updated', 'Notes'],
  Maintenance: ['Reference', 'Truck', 'Work type', 'Status', 'Cost', 'Due'],
  Inspections: ['Reference', 'Truck', 'Inspector', 'Status', 'Date', 'Notes'],
  Compliance: ['Reference', 'Truck/Driver', 'Requirement', 'Status', 'Expiry', 'Notes'],
  Tyres: ['Reference', 'Truck', 'Position', 'Brand', 'Status', 'Mileage'],
  Fuel: ['Reference', 'Truck', 'Litres', 'Cost', 'Station', 'Date'],
  Documents: ['Reference', 'Type', 'Related to', 'Status', 'Expiry', 'Notes'],
  Reports: ['Report', 'Period', 'Owner', 'Status', 'Generated', 'Notes'],
}

const demoSeed: Record<string, RecordItem[]> = {
  Jobs: [
    { Reference: 'JOB-1044', Customer: 'Metsi Materials', Route: 'Gaborone → Palapye', Truck: 'TRK-021', Status: 'In transit', Value: 'P18,400' },
    { Reference: 'JOB-1043', Customer: 'Kalahari Aggregates', Route: 'Lobatse → Gaborone', Truck: 'TRK-014', Status: 'Delivered', Value: 'P12,800' },
    { Reference: 'JOB-1042', Customer: 'Delta Build', Route: 'Tlokweng → Molepolole', Truck: 'TRK-009', Status: 'POD pending', Value: 'P9,600' },
  ],
  Trucks: [
    { Unit: 'TRK-021', Registration: 'B 421 ABC', Type: 'Truck + trailer', Status: 'On road', Odometer: '284,120 km', 'Next service': '12 Sep 2026' },
    { Unit: 'TRK-018', Registration: 'B 318 DEF', Type: 'Tipper', Status: 'Inspection due', Odometer: '301,880 km', 'Next service': 'Today' },
  ],
  Drivers: [
    { Name: 'Demo Driver 01', Phone: '—', License: 'Heavy', Status: 'On trip', Truck: 'TRK-021', Expiry: '2027-05' },
    { Name: 'Demo Driver 02', Phone: '—', License: 'Heavy', Status: 'Available', Truck: 'TRK-014', Expiry: '2027-09' },
  ],
  Customers: [
    { Name: 'Metsi Materials', Contact: 'Operations', Phone: '—', Terms: '30 days', Status: 'Active', Notes: '' },
    { Name: 'Kalahari Aggregates', Contact: 'Dispatch', Phone: '—', Terms: '30 days', Status: 'Active', Notes: '' },
  ],
  Invoices: [{ Number: 'INV-2026-0184', Customer: 'Metsi Materials', Job: 'JOB-1040', Amount: 'P18,400', Status: 'Ready', Due: '30 Sep 2026' }],
  Expenses: [{ Reference: 'EXP-0021', Category: 'Fuel', Amount: 'P4,860', Job: 'JOB-1044', Status: 'Approved', Date: '10 Sep 2026' }],
}

export default function TranslendShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [active, setActive] = useState<ModuleKey>('Dashboard')
  const [user, setUser] = useState<{ displayName?: string | null; email?: string | null } | null>(null)
  const [demo, setDemo] = useState(false)
  const [records, setRecords] = useState<Record<string, RecordItem[]>>({})
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(translendAuth, (nextUser) => setUser(nextUser ? { displayName: nextUser.displayName, email: nextUser.email } : null))
    const isDemo = window.localStorage.getItem('translend-demo-mode') === 'true'
    setDemo(isDemo)
    const saved = window.localStorage.getItem('translend-workspace-data')
    if (saved) setRecords(JSON.parse(saved))
    else if (isDemo) setRecords(demoSeed)
    return unsubscribe
  }, [])

  useEffect(() => {
    if (Object.keys(records).length) window.localStorage.setItem('translend-workspace-data', JSON.stringify(records))
  }, [records])

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
  function addRecord(item: RecordItem) {
    setRecords((current) => ({ ...current, [active]: [...(current[active] ?? []), item] }))
    setShowForm(false)
  }
  function removeRecord(index: number) {
    setRecords((current) => ({ ...current, [active]: (current[active] ?? []).filter((_, i) => i !== index) }))
  }
  async function logout() { await signOut(translendAuth); window.localStorage.removeItem('translend-demo-mode') }

  return (
    <div className={styles.app}>
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brandRow}><div className={styles.brandMark}>T</div><div><div className={styles.brandName}>Translend</div><div className={styles.brandSub}>TMS · Truck Division</div></div><button className={styles.closeButton} onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button></div>
        <div className={styles.workspace}><span className={styles.workspaceLabel}>Workspace</span><div className={styles.workspaceButton}><span>{demo ? 'Demo Company' : 'My Operations'}</span><ChevronDown size={15} /></div></div>
        <nav className={styles.nav} aria-label="Translend navigation">{navigation.map((section) => <div key={section.label} className={styles.navSection}><div className={styles.sectionLabel}>{section.label}</div>{section.items.map(({ label, icon: Icon }) => <button key={label} className={`${styles.navItem} ${active === label ? styles.navItemActive : ''}`} onClick={() => select(label)}><Icon size={17} strokeWidth={1.9} /><span>{label}</span></button>)}</div>)}</nav>
        <div className={styles.sidebarFooter}><div className={styles.statusDot} /><div><strong>{demo ? 'Demo workspace' : 'Workspace ready'}</strong><span>{demo ? 'Browser-only sample data' : 'Signed-in session'}</span></div></div>
      </aside>
      {mobileOpen && <button className={styles.backdrop} onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <div className={styles.main}>
        <header className={styles.topbar}><button className={styles.menuButton} onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div className={styles.breadcrumb}><span>Translend</span><b>/</b><strong>{active}</strong></div><div className={styles.topActions}><TranslendSessionBadge demo={demo} /><button className={styles.iconButton} aria-label="Notifications"><Bell size={19} /></button><div className={styles.profile}><span className={styles.avatar}>{user?.displayName?.slice(0, 2).toUpperCase() || 'DE'}</span><span className={styles.profileText}><strong>{user?.displayName || (demo ? 'Demo operator' : 'Operations')}</strong><small>{user?.email || 'Browser workspace'}</small></span><button onClick={logout} className={styles.textButton}>Exit</button></div></div></header>
        <main className={styles.content}>
          {active === 'Dashboard' ? <Dashboard jobs={jobs} trucks={trucks} drivers={drivers} invoices={invoices} attention={attention} onOpen={select} /> : <ModuleView module={active} rows={activeRows} onAdd={() => setShowForm(true)} onRemove={removeRecord} />}
          {showForm && active !== 'Dashboard' && <RecordForm module={active} onCancel={() => setShowForm(false)} onSave={addRecord} />}
          <div className={styles.footerNote}><span>Translend TMS · working MVP</span><span>{demo ? 'Demo data is local to this browser' : 'Operational records are currently local to this browser'}</span></div>
        </main>
      </div>
    </div>
  )
}

function Dashboard({ jobs, trucks, drivers, invoices, attention, onOpen }: { jobs: RecordItem[]; trucks: RecordItem[]; drivers: RecordItem[]; invoices: RecordItem[]; attention: { tone: string; title: string; detail: string }[]; onOpen: (module: ModuleKey) => void }) {
  const activeJobs = jobs.filter((x) => !/delivered|cancelled/i.test(x.Status ?? '')).length
  const onRoad = trucks.filter((x) => /road|trip|transit/i.test(x.Status ?? '')).length
  const readyInvoices = invoices.filter((x) => /ready|approved|pending/i.test(x.Status ?? '')).length
  const kpis = [
    { label: 'Active jobs', value: String(activeJobs), note: `${attention.length} need attention`, tone: 'teal' },
    { label: 'Trucks on road', value: String(onRoad), note: `${trucks.length} tracked in workspace`, tone: 'blue' },
    { label: 'Drivers', value: String(drivers.length), note: 'Current workspace records', tone: 'green' },
    { label: 'Ready to invoice', value: String(readyInvoices), note: 'Open commercial records', tone: 'orange' },
  ]
  return <>
    <section className={styles.pageHeader}><div><span className={styles.eyebrow}>Control Tower</span><h1>Good morning, Operations.</h1><p>See what is moving, what needs attention, and what is ready for the next action.</p></div><div className={styles.headerActions}><button className={styles.secondaryButton} onClick={() => onOpen('Reports')}>Reports</button><button className={styles.primaryButton} onClick={() => onOpen('Jobs')}><Plus size={14} /> New job</button></div></section>
    <section className={styles.kpiGrid}>{kpis.map((kpi) => <article className={styles.kpiCard} key={kpi.label}><div className={`${styles.kpiIcon} ${styles[kpi.tone as keyof typeof styles]}`}><Gauge size={18} /></div><span className={styles.kpiLabel}>{kpi.label}</span><strong className={styles.kpiValue}>{kpi.value}</strong><span className={styles.kpiNote}>{kpi.note}</span></article>)}</section>
    <section className={styles.dashboardGrid}><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Attention</span><h2>Needs action</h2></div></div><div className={styles.attentionList}>{attention.length ? attention.slice(0, 5).map((item) => <AttentionItem key={item.title} {...item} />) : <EmptyState text="Nothing is currently flagged." />}</div></article><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Workflow</span><h2>Operational spine</h2></div></div><div className={styles.movementRows}><Movement label="Jobs" value={jobs.length} /><Movement label="Trucks" value={trucks.length} /><Movement label="Drivers" value={drivers.length} /><Movement label="Invoices" value={invoices.length} /></div></article></section>
    <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Workspace</span><h2>Recent jobs</h2></div><button className={styles.textButton} onClick={() => onOpen('Jobs')}>Open jobs</button></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Reference</th><th>Customer</th><th>Route</th><th>Truck</th><th>Status</th><th>Value</th></tr></thead><tbody>{jobs.slice(0, 8).map((row) => <tr key={row.Reference}><td><strong>{row.Reference}</strong></td><td>{row.Customer}</td><td>{row.Route}</td><td>{row.Truck}</td><td><span className={styles.status}>{row.Status}</span></td><td>{row.Value}</td></tr>)}</tbody></table></div></section>
  </>
}

function ModuleView({ module, rows, onAdd, onRemove }: { module: ModuleKey; rows: RecordItem[]; onAdd: () => void; onRemove: (index: number) => void }) {
  const fields = fieldMap[module] ?? ['Reference', 'Status', 'Notes']
  const description = module === 'Dispatch' ? 'Turn jobs into planned movements and keep the next operational action visible.' : `Manage ${module.toLowerCase()} records from this workspace.`
  return <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Translend workspace</span><h2>{module}</h2><p style={{ marginTop: 5, color: '#718188', fontSize: 11 }}>{description}</p></div><button className={styles.primaryButton} onClick={onAdd}><Plus size={14} /> Add record</button></div><div className={styles.tableWrap}>{rows.length ? <table className={styles.table}><thead><tr>{fields.map((field) => <th key={field}>{field}</th>)}<th>Action</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${module}-${index}`}><td><strong>{row[fields[0]] || '—'}</strong></td>{fields.slice(1).map((field) => <td key={field}>{row[field] || '—'}</td>)}<td><button className={styles.textButton} onClick={() => onRemove(index)}>Delete</button></td></tr>)}</tbody></table> : <EmptyState text={`No ${module.toLowerCase()} records yet. Add the first one to start using this area.`} />}</div></section>
}

function RecordForm({ module, onCancel, onSave }: { module: ModuleKey; onCancel: () => void; onSave: (item: RecordItem) => void }) {
  const fields = fieldMap[module] ?? ['Reference', 'Status', 'Notes']
  const [form, setForm] = useState<RecordItem>({})
  return <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,42,48,.32)', display: 'grid', placeItems: 'center', padding: 18, zIndex: 100 }}><form onSubmit={(event) => { event.preventDefault(); onSave(form) }} style={{ width: 'min(100%, 720px)', maxHeight: '90dvh', overflow: 'auto', background: '#fff', borderRadius: 16, border: '1px solid #dfe7ea', boxShadow: '0 25px 80px rgba(14,42,48,.2)', padding: 22 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}><div><span style={{ color: '#0c6c7d', fontSize: 9, fontWeight: 900, letterSpacing: '.13em', textTransform: 'uppercase' }}>New record</span><h2 style={{ margin: '5px 0 0', fontSize: 20 }}>{module}</h2></div><button type="button" className={styles.iconButton} onClick={onCancel}><X size={18} /></button></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>{fields.map((field) => <label key={field} style={{ display: 'grid', gap: 6, fontSize: 10, fontWeight: 800, color: '#53666c' }}>{field}<input required={field === fields[0]} value={form[field] ?? ''} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} placeholder={`Enter ${field.toLowerCase()}`} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 11px', border: '1px solid #d8e0e4', borderRadius: 8, fontSize: 12, color: '#243b41', outline: 'none' }} /></label>)}</div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 20 }}><button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancel</button><button className={styles.primaryButton} type="submit">Save record</button></div></form></div>
}

function AttentionItem({ tone, title, detail }: { tone: string; title: string; detail: string }) { return <div className={styles.attentionItem}><span className={`${styles.statusBar} ${styles[tone as keyof typeof styles]}`} /><div><strong>{title}</strong><span>{detail}</span></div></div> }
function Movement({ label, value }: { label: string; value: number }) { return <div className={styles.movementRow}><div className={styles.movementLabel}><span>{label}</span><strong>{value}</strong></div><div className={styles.progress}><span style={{ width: value ? '72%' : '0%' }} /></div></div> }
function EmptyState({ text }: { text: string }) { return <div style={{ padding: 28, color: '#819197', fontSize: 12, textAlign: 'center' }}>{text}</div> }
