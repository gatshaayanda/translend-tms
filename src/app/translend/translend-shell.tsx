'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { BarChart3, Bell, Boxes, ChevronDown, ClipboardList, FileText, Fuel, Gauge, LayoutDashboard, Map, Menu, MoreHorizontal, Route, Settings, Truck, Users, Wrench, X } from 'lucide-react'
import styles from './translend-shell.module.css'
import { translendAuth } from '@/lib/translend/firebase/client'
import { getTranslendWorkspaceForUser, TranslendOrganization } from '@/lib/translend/workspace'
import { TranslendSessionBadge } from './translend-auth'
import TranslendCustomers from './translend-customers'
import TranslendBusinessModule from './translend-business-module'
import { BusinessCollection } from '@/lib/translend/business'

type ModuleKey = 'Dashboard' | 'Jobs' | 'Dispatch' | 'Trips' | 'Deliveries' | 'Routes' | 'Trucks' | 'Drivers' | 'Maintenance' | 'Inspections' | 'Compliance' | 'Tyres' | 'Fuel' | 'Customers' | 'Rate Cards' | 'Invoices' | 'Receipts' | 'Statements' | 'Expenses' | 'Profitability' | 'Operational P&L' | 'Documents' | 'Reports' | 'Settings'
const navigation: { label: string; items: { label: ModuleKey; icon: typeof LayoutDashboard }[] }[] = [
  { label: 'Control Tower', items: [{ label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'Operations', items: [{ label: 'Jobs', icon: ClipboardList }, { label: 'Dispatch', icon: Gauge }, { label: 'Trips', icon: Route }, { label: 'Deliveries', icon: Boxes }, { label: 'Routes', icon: Map }] },
  { label: 'Fleet', items: [{ label: 'Trucks', icon: Truck }, { label: 'Drivers', icon: Users }, { label: 'Maintenance', icon: Wrench }, { label: 'Inspections', icon: ClipboardList }, { label: 'Compliance', icon: FileText }, { label: 'Tyres', icon: MoreHorizontal }, { label: 'Fuel', icon: Fuel }] },
  { label: 'Commercial', items: [{ label: 'Customers', icon: Users }, { label: 'Rate Cards', icon: FileText }, { label: 'Invoices', icon: FileText }, { label: 'Receipts', icon: FileText }, { label: 'Statements', icon: FileText }] },
  { label: 'Finance', items: [{ label: 'Expenses', icon: FileText }, { label: 'Profitability', icon: BarChart3 }, { label: 'Operational P&L', icon: BarChart3 }] },
  { label: 'System', items: [{ label: 'Documents', icon: FileText }, { label: 'Reports', icon: BarChart3 }, { label: 'Settings', icon: Settings }] },
]
const collectionByModule: Partial<Record<ModuleKey, BusinessCollection>> = { Trucks: 'trucks', Drivers: 'drivers', Jobs: 'jobs', Dispatch: 'dispatches', Trips: 'trips', Routes: 'routes' }

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
  function select(next: ModuleKey) { setActive(next); setMobileOpen(false) }
  async function logout() { await signOut(translendAuth) }
  const collectionName = collectionByModule[active]
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
        {active === 'Dashboard' ? <Dashboard organization={organization} onOpen={select} /> : active === 'Customers' && organization && user ? <TranslendCustomers organizationId={organization.id} userId={user.uid} /> : collectionName && organization && user ? <TranslendBusinessModule collectionName={collectionName} organizationId={organization.id} userId={user.uid} /> : <Placeholder module={active} />}
        <div className={styles.footerNote}><span>Translend TMS · company workspace</span><span>{active === 'Customers' || collectionName ? 'Records are stored securely in your private organization workspace.' : 'This module is next in the connected business-data build.'}</span></div>
      </main>
    </div>
  </div>
}
function Dashboard({ organization, onOpen }: { organization: TranslendOrganization | null; onOpen: (module: ModuleKey) => void }) { return <><section className={styles.pageHeader}><div><span className={styles.eyebrow}>Control Tower</span><h1>{organization?.name || 'Your company'}.</h1><p>The operational core now connects customers, jobs, dispatch, trips, routes and fleet through organization-scoped Firestore records.</p></div><div className={styles.headerActions}><button className={styles.secondaryButton} onClick={() => onOpen('Jobs')}>Jobs</button><button className={styles.primaryButton} onClick={() => onOpen('Dispatch')}>Dispatch</button></div></section><section className={styles.kpiGrid}><Kpi label="Jobs" value="Live" note="Firestore-backed" /><Kpi label="Dispatch" value="Live" note="Assignments" /><Kpi label="Trips" value="Live" note="Operational movement" /><Kpi label="Fleet" value="Live" note="Trucks + drivers" /></section><section className={styles.dashboardGrid}><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Operational spine</span><h2>Customer → Job → Dispatch → Trip</h2></div></div><div className={styles.movementRows}><Movement label="Customers" value="Live" /><Movement label="Jobs" value="Live" /><Movement label="Routes" value="Live" /><Movement label="Fleet assignment" value="Live" /></div></article><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Integrity</span><h2>Organization-scoped</h2></div></div><div className={styles.tableWrap}><EmptyState text="Operational records belong to the signed-in company. No demo records are inserted." /></div></article></section></> }
function Kpi({ label, value, note }: { label: string; value: string; note: string }) { return <article className={styles.kpiCard}><div className={styles.kpiIcon}><Gauge size={18} /></div><span className={styles.kpiLabel}>{label}</span><strong className={styles.kpiValue}>{value}</strong><span className={styles.kpiNote}>{note}</span></article> }
function Movement({ label, value }: { label: string; value: string }) { return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #edf2f3', fontSize: 12 }}><span>{label}</span><strong>{value}</strong></div> }
function EmptyState({ text }: { text: string }) { return <div style={{ padding: 28, textAlign: 'center', color: '#718188', fontSize: 12 }}>{text}</div> }
function Placeholder({ module }: { module: ModuleKey }) { return <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Translend TMS</span><h2>{module}</h2><p style={{ marginTop: 5, color: '#718188', fontSize: 11 }}>This module remains intentionally clean while its connected data model is built in the correct operational sequence.</p></div></div><div className={styles.tableWrap}><EmptyState text={`No ${module.toLowerCase()} records exist yet. The real data layer will be connected without importing demo data.`} /></div></section> }
