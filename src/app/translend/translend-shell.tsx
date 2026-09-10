'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { BarChart3, Bell, Boxes, ChevronDown, ClipboardList, FileText, Fuel, Gauge, LayoutDashboard, Map, Menu, MoreHorizontal, Plus, Route, Settings, Truck, Users, Wrench, X } from 'lucide-react'
import styles from './translend-shell.module.css'
import { translendAuth } from '@/lib/translend/firebase/client'
import { getTranslendWorkspaceForUser, TranslendOrganization } from '@/lib/translend/workspace'
import { TranslendSessionBadge } from './translend-auth'
import TranslendCustomers from './translend-customers'

type ModuleKey = 'Dashboard' | 'Jobs' | 'Dispatch' | 'Trips' | 'Deliveries' | 'Routes' | 'Trucks' | 'Drivers' | 'Maintenance' | 'Inspections' | 'Compliance' | 'Tyres' | 'Fuel' | 'Customers' | 'Rate Cards' | 'Invoices' | 'Receipts' | 'Statements' | 'Expenses' | 'Profitability' | 'Operational P&L' | 'Documents' | 'Reports' | 'Settings'
const navigation: { label: string; items: { label: ModuleKey; icon: typeof LayoutDashboard }[] }[] = [
  { label: 'Control Tower', items: [{ label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'Operations', items: [{ label: 'Jobs', icon: ClipboardList }, { label: 'Dispatch', icon: Gauge }, { label: 'Trips', icon: Route }, { label: 'Deliveries', icon: Boxes }, { label: 'Routes', icon: Map }] },
  { label: 'Fleet', items: [{ label: 'Trucks', icon: Truck }, { label: 'Drivers', icon: Users }, { label: 'Maintenance', icon: Wrench }, { label: 'Inspections', icon: ClipboardList }, { label: 'Compliance', icon: FileText }, { label: 'Tyres', icon: MoreHorizontal }, { label: 'Fuel', icon: Fuel }] },
  { label: 'Commercial', items: [{ label: 'Customers', icon: Users }, { label: 'Rate Cards', icon: FileText }, { label: 'Invoices', icon: FileText }, { label: 'Receipts', icon: FileText }, { label: 'Statements', icon: FileText }] },
  { label: 'Finance', items: [{ label: 'Expenses', icon: FileText }, { label: 'Profitability', icon: BarChart3 }, { label: 'Operational P&L', icon: BarChart3 }] },
  { label: 'System', items: [{ label: 'Documents', icon: FileText }, { label: 'Reports', icon: BarChart3 }, { label: 'Settings', icon: Settings }] },
]

export default function TranslendShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [active, setActive] = useState<ModuleKey>('Dashboard')
  const [user, setUser] = useState<{ uid: string; displayName?: string | null; email?: string | null } | null>(null)
  const [organization, setOrganization] = useState<TranslendOrganization | null>(null)
  useEffect(() => onAuthStateChanged(translendAuth, async (nextUser) => {
    setUser(nextUser ? { uid: nextUser.uid, displayName: nextUser.displayName, email: nextUser.email } : null)
    if (!nextUser) { setOrganization(null); return }
    const workspace = await getTranslendWorkspaceForUser(nextUser.uid)
    setOrganization(workspace?.organization ?? null)
  }), [])
  const select = (next: ModuleKey) => { setActive(next); setMobileOpen(false) }
  return <div className={styles.app}>
    <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.brandRow}><div className={styles.brandMark}>T</div><div><div className={styles.brandName}>Translend</div><div className={styles.brandSub}>TMS · Truck Division</div></div><button className={styles.closeButton} onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button></div>
      <div className={styles.workspace}><span className={styles.workspaceLabel}>Workspace</span><div className={styles.workspaceButton}><span>{organization?.name || 'Company workspace'}</span><ChevronDown size={15} /></div></div>
      <nav className={styles.nav} aria-label="Translend navigation">{navigation.map((section) => <div key={section.label} className={styles.navSection}><div className={styles.sectionLabel}>{section.label}</div>{section.items.map(({ label, icon: Icon }) => <button key={label} className={`${styles.navItem} ${active === label ? styles.navItemActive : ''}`} onClick={() => select(label)}><Icon size={17} strokeWidth={1.9} /><span>{label}</span></button>)}</div>)}</nav>
      <div className={styles.sidebarFooter}><div className={styles.statusDot} /><div><strong>Workspace ready</strong><span>Private company workspace</span></div></div>
    </aside>
    {mobileOpen && <button className={styles.backdrop} onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <div className={styles.main}>
      <header className={styles.topbar}><button className={styles.menuButton} onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div className={styles.breadcrumb}><span>Translend</span><b>/</b><strong>{active}</strong></div><div className={styles.topActions}><TranslendSessionBadge /><button className={styles.iconButton} aria-label="Notifications"><Bell size={19} /></button><div className={styles.profile}><span className={styles.avatar}>{user?.displayName?.slice(0, 2).toUpperCase() || 'OP'}</span><span className={styles.profileText}><strong>{user?.displayName || 'Operations'}</strong><small>{user?.email || organization?.name || ''}</small></span><button onClick={() => void signOut(translendAuth)} className={styles.textButton}>Exit</button></div></div></header>
      <main className={styles.content}>
        {active === 'Dashboard' ? <Dashboard organization={organization} onOpen={select} /> : active === 'Customers' && organization && user ? <TranslendCustomers organizationId={organization.id} userId={user.uid} /> : <ModulePlaceholder module={active} />}
        <div className={styles.footerNote}><span>Translend TMS · company workspace</span><span>{active === 'Customers' ? 'Customer records are stored securely in your private workspace.' : 'Business records are being connected module by module.'}</span></div>
      </main>
    </div>
  </div>
}

function Dashboard({ organization, onOpen }: { organization: TranslendOrganization | null; onOpen: (module: ModuleKey) => void }) {
  const kpis = [{ label: 'Active jobs', value: '0', note: 'No jobs recorded yet', tone: 'teal' }, { label: 'Trucks on road', value: '0', note: 'No fleet records yet', tone: 'blue' }, { label: 'Drivers', value: '0', note: 'No driver records yet', tone: 'green' }, { label: 'Customers', value: '—', note: 'Open customer records', tone: 'orange' }]
  return <>
    <section className={styles.pageHeader}><div><span className={styles.eyebrow}>Control Tower</span><h1>{organization?.name || 'Your company'}.</h1><p>Your private transport workspace is ready. Start with the records that drive your operation.</p></div><div className={styles.headerActions}><button className={styles.secondaryButton} onClick={() => onOpen('Customers')}>Customers</button><button className={styles.primaryButton} onClick={() => onOpen('Jobs')}><Plus size={14} /> New job</button></div></section>
    <section className={styles.kpiGrid}>{kpis.map((kpi) => <article className={styles.kpiCard} key={kpi.label}><div className={`${styles.kpiIcon} ${styles[kpi.tone as keyof typeof styles]}`}><Gauge size={18} /></div><span className={styles.kpiLabel}>{kpi.label}</span><strong className={styles.kpiValue}>{kpi.value}</strong><span className={styles.kpiNote}>{kpi.note}</span></article>)}</section>
    <section className={styles.dashboardGrid}><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Attention</span><h2>Needs action</h2></div></div><EmptyState text="Nothing is currently flagged. Add operational data as your workspace grows." /></article><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Workflow</span><h2>Operational spine</h2></div></div><div className={styles.movementRows}><Movement label="Customers" value={0} /><Movement label="Jobs" value={0} /><Movement label="Trucks" value={0} /><Movement label="Drivers" value={0} /></div></article></section>
    <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Workspace</span><h2>Recent jobs</h2></div><button className={styles.textButton} onClick={() => onOpen('Jobs')}>Open jobs</button></div><div className={styles.tableWrap}><EmptyState text="No jobs yet. Your workspace starts clean so the first records belong to your company." /></div></section>
  </>
}

function ModulePlaceholder({ module }: { module: ModuleKey }) { return <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Company workspace</span><h2>{module}</h2></div></div><EmptyState text={`No ${module.toLowerCase()} records yet. This module will be connected to the private workspace in a later controlled data phase.`} /></section> }
function Movement({ label, value }: { label: string; value: number }) { return <div className={styles.movementRow}><div className={styles.movementLabel}><span>{label}</span><strong>{value}</strong></div><div className={styles.progress}><span style={{ width: value ? '72%' : '0%' }} /></div></div> }
function EmptyState({ text }: { text: string }) { return <div style={{ padding: 28, color: '#819197', fontSize: 12, textAlign: 'center' }}>{text}</div> }
