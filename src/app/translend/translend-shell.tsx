'use client'

import { useEffect, useState } from 'react'
import styles from './translend-shell.module.css'
import { translendAuth } from '@/lib/translend/firebase/client'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { BarChart3, Bell, Boxes, ChevronDown, ClipboardList, FileText, Fuel, Gauge, LayoutDashboard, Map, Menu, MoreHorizontal, Route, Settings, Truck, Users, Wrench, X } from 'lucide-react'
import { getTranslendWorkspaceForUser, TranslendOrganization } from '@/lib/translend/workspace'
import { TranslendSessionBadge } from './translend-auth'
import TranslendCustomers from './translend-customers'
import TranslendBusinessModule from './translend-business-module'
import TranslendFleet from './translend-fleet'
import TranslendOperations from './translend-operations'
import TranslendDelivery from './translend-delivery'
import TranslendIntelligence from './translend-intelligence'
import TranslendControlTower from './translend-control-tower'
import TranslendAdmin from './translend-admin'
import TranslendDocuments from './translend-documents'
import TranslendReports from './translend-reports'
import { BusinessCollection } from '@/lib/translend/business'

type ModuleKey = 'Dashboard' | 'Jobs' | 'Dispatch' | 'Trips' | 'Deliveries' | 'POD' | 'Exceptions' | 'Routes' | 'Trucks' | 'Drivers' | 'Maintenance' | 'Inspections' | 'Compliance' | 'Tyres' | 'Fuel' | 'Customers' | 'Rate Cards' | 'Invoices' | 'Receipts' | 'Statements' | 'Expenses' | 'Profitability' | 'Operational P&L' | 'Documents' | 'Reports' | 'Settings'
type NavItem = { label: ModuleKey; icon: typeof LayoutDashboard }

const navigation: { label: string; items: NavItem[] }[] = [
  { label: 'Control Tower', items: [{ label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'Operations', items: [{ label: 'Jobs', icon: ClipboardList }, { label: 'Dispatch', icon: Gauge }, { label: 'Trips', icon: Route }, { label: 'Deliveries', icon: Boxes }, { label: 'POD', icon: FileText }, { label: 'Exceptions', icon: Bell }, { label: 'Routes', icon: Map }] },
  { label: 'Fleet', items: [{ label: 'Trucks', icon: Truck }, { label: 'Drivers', icon: Users }, { label: 'Maintenance', icon: Wrench }, { label: 'Inspections', icon: ClipboardList }, { label: 'Compliance', icon: FileText }, { label: 'Tyres', icon: MoreHorizontal }, { label: 'Fuel', icon: Fuel }] },
  { label: 'Commercial', items: [{ label: 'Customers', icon: Users }, { label: 'Rate Cards', icon: FileText }, { label: 'Invoices', icon: FileText }, { label: 'Receipts', icon: FileText }, { label: 'Statements', icon: FileText }] },
  { label: 'Finance', items: [{ label: 'Expenses', icon: FileText }, { label: 'Profitability', icon: BarChart3 }, { label: 'Operational P&L', icon: BarChart3 }] },
  { label: 'System', items: [{ label: 'Documents', icon: FileText }, { label: 'Reports', icon: BarChart3 }, { label: 'Settings', icon: Settings }] },
]

const collectionByModule: Partial<Record<ModuleKey, BusinessCollection>> = { Routes: 'routes', Maintenance: 'maintenance', Inspections: 'inspections', Compliance: 'compliance', Tyres: 'tyres', Fuel: 'fuel', Expenses: 'expenses', Invoices: 'invoices', Receipts: 'receipts', Statements: 'statements', 'Rate Cards': 'rateCards' }

export default function TranslendShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [active, setActive] = useState<ModuleKey>('Dashboard')
  const [user, setUser] = useState<{ uid: string; displayName?: string | null; email?: string | null } | null>(null)
  const [organization, setOrganization] = useState<TranslendOrganization | null>(null)
  useEffect(() => onAuthStateChanged(translendAuth, async currentUser => {
    setUser(currentUser ? { uid: currentUser.uid, displayName: currentUser.displayName, email: currentUser.email } : null)
    if (!currentUser) { setOrganization(null); return }
    try { setOrganization((await getTranslendWorkspaceForUser(currentUser.uid))?.organization ?? null) } catch { setOrganization(null) }
  }), [])
  const select = (module: ModuleKey) => { setActive(module); setMobileOpen(false) }
  const collectionName = collectionByModule[active]
  const content = !organization ? <Placeholder module={active} /> : active === 'Dashboard' ? <TranslendControlTower organizationId={organization.id} onOpen={select} /> : (active === 'Jobs' || active === 'Dispatch' || active === 'Trips') && user ? <TranslendOperations organizationId={organization.id} userId={user.uid} initialTab={active} /> : (active === 'Deliveries' || active === 'POD' || active === 'Exceptions') && user ? <TranslendDelivery organizationId={organization.id} userId={user.uid} initialTab={active} /> : active === 'Customers' && user ? <TranslendCustomers organizationId={organization.id} userId={user.uid} /> : active === 'Settings' && user ? <TranslendAdmin organization={organization} userId={user.uid} /> : (active === 'Trucks' || active === 'Drivers') && user ? <TranslendFleet organizationId={organization.id} userId={user.uid} /> : active === 'Profitability' ? <TranslendIntelligence kind="profitability" organizationId={organization.id} /> : active === 'Operational P&L' ? <TranslendIntelligence kind="operationalPnl" organizationId={organization.id} /> : active === 'Documents' && user ? <TranslendDocuments organizationId={organization.id} userId={user.uid} /> : active === 'Reports' ? <TranslendReports organizationId={organization.id} /> : collectionName && user ? <TranslendBusinessModule collectionName={collectionName} organizationId={organization.id} userId={user.uid} /> : <Placeholder module={active} />

  return <div className={styles.app}><aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}><div className={styles.brandRow}><div className={styles.brandMark}>T</div><div><div className={styles.brandName}>Translend</div><div className={styles.brandSub}>TMS · Truck Division</div></div><button className={styles.closeButton} onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button></div><div className={styles.workspace}><span className={styles.workspaceLabel}>Workspace</span><div className={styles.workspaceButton}><span>{organization?.name || 'Company workspace'}</span><ChevronDown size={15} /></div></div><nav className={styles.nav}>{navigation.map(section => <div key={section.label} className={styles.navSection}><div className={styles.sectionLabel}>{section.label}</div>{section.items.map(({ label, icon: Icon }) => <button key={label} className={`${styles.navItem} ${active === label ? styles.navItemActive : ''}`} onClick={() => select(label)}><Icon size={17} /><span>{label}</span></button>)}</div>)}</nav><div className={styles.sidebarFooter}><div className={styles.statusDot} /><div><strong>Workspace ready</strong><span>Private company workspace</span></div></div></aside>{mobileOpen && <button className={styles.backdrop} onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}<div className={styles.main}><header className={styles.topbar}><button className={styles.menuButton} onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div className={styles.breadcrumb}><span>Translend</span><b>/</b><strong>{active}</strong></div><div className={styles.topActions}><TranslendSessionBadge /><button className={styles.iconButton} aria-label="Notifications"><Bell size={19} /></button><div className={styles.profile}><span className={styles.avatar}>{user?.displayName?.slice(0, 2).toUpperCase() || 'OP'}</span><span className={styles.profileText}><strong>{user?.displayName || 'Operations'}</strong><small>{user?.email || organization?.name || ''}</small></span><button onClick={() => void signOut(translendAuth)} className={styles.textButton}>Exit</button></div></div></header><main className={styles.content}>{content}<div className={styles.footerNote}><span>Translend TMS · company workspace</span><span>Live records are organization-scoped; administration is owner-controlled.</span></div></main></div></div>
}

function Placeholder({ module }: { module: ModuleKey }) { return <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Translend TMS</span><h2>{module}</h2></div></div><div className={styles.tableWrap}><div style={{ padding: 28, textAlign: 'center', color: '#718188' }}>This module is ready for its connected business workflow.</div></div></section> }
