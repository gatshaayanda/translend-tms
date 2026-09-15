"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  Fuel,
  Gauge,
  LayoutDashboard,
  Map,
  Menu,
  Plus,
  Route,
  Search,
  Settings,
  Truck,
  Users,
  Wrench,
  X,
} from "lucide-react"
import styles from "./translend-shell.module.css"
import { demoCustomers, demoJobs, demoTrucks } from "@/lib/translend/demo/data"

type NavItem = {
  label: string
  icon: typeof LayoutDashboard
}

const navigation: { label: string; items: NavItem[] }[] = [
  { label: "Control Tower", items: [{ label: "Dashboard", icon: LayoutDashboard }] },
  { label: "Operations", items: [{ label: "Jobs", icon: ClipboardList }, { label: "Dispatch", icon: Gauge }, { label: "Trips", icon: Route }, { label: "Deliveries", icon: Boxes }, { label: "Routes", icon: Map }] },
  { label: "Fleet", items: [{ label: "Trucks", icon: Truck }, { label: "Drivers", icon: Users }, { label: "Maintenance", icon: Wrench }, { label: "Fuel", icon: Fuel }] },
  { label: "Commercial", items: [{ label: "Customers", icon: Users }, { label: "Rate Cards", icon: FileText }, { label: "Invoices", icon: FileText }] },
  { label: "Finance", items: [{ label: "Expenses", icon: FileText }, { label: "Profitability", icon: BarChart3 }] },
  { label: "System", items: [{ label: "Reports", icon: BarChart3 }, { label: "Settings", icon: Settings }] },
]

const moduleDescriptions: Record<string, string> = {
  Dashboard: "A live-style operational view showing what is moving, what needs attention, and what can be billed.",
  Jobs: "Track customer work from planning through delivery and billing readiness.",
  Dispatch: "Coordinate the next movement, truck and driver assignment.",
  Trips: "Follow individual movements and operational milestones.",
  Deliveries: "Track delivery completion and proof-of-delivery follow-up.",
  Routes: "Review routes used across current operations.",
  Trucks: "See fleet status, location context and operational attention.",
  Drivers: "Manage driver availability and assignment context.",
  Maintenance: "Track maintenance work and fleet readiness.",
  Fuel: "Review fuel activity and operating context.",
  Customers: "Review customer activity and commercial exposure.",
  "Rate Cards": "Maintain commercial pricing references.",
  Invoices: "Track completed work moving toward billing.",
  Expenses: "Review operating cost records.",
  Profitability: "Compare operational value against cost context.",
  Reports: "Prepare operational reporting views.",
  Settings: "Configure the independent Translend workspace.",
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-BW", {
    style: "currency",
    currency: "BWP",
    maximumFractionDigits: 0,
  }).format(value)
}

export default function TranslendShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [active, setActive] = useState("Dashboard")
  const [query, setQuery] = useState("")
  const [notice, setNotice] = useState<string | null>(null)

  const visibleJobs = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return demoJobs
    return demoJobs.filter((job) =>
      [job.id, job.customer, job.route, job.truck, job.driver, job.status]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    )
  }, [query])

  const activeJobs = demoJobs.filter((job) => job.status === "In transit" || job.status === "Scheduled" || job.status === "Dispatched").length
  const attentionJobs = demoJobs.filter((job) => job.status === "Attention").length
  const deliveredJobs = demoJobs.filter((job) => job.status === "Delivered").length
  const invoiceReady = demoJobs.filter((job) => job.status === "Delivered").reduce((sum, job) => sum + job.amount, 0)

  function chooseModule(label: string) {
    setActive(label)
    setMobileOpen(false)
    setNotice(null)
  }

  function showNotice(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 3500)
  }

  const isDashboard = active === "Dashboard"

  return (
    <div className={styles.app}>
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.brandRow}>
          <div className={styles.brandMark}>T</div>
          <div>
            <div className={styles.brandName}>Translend</div>
            <div className={styles.brandSub}>TMS · Truck Division</div>
          </div>
          <button className={styles.closeButton} onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button>
        </div>

        <div className={styles.workspace}>
          <span className={styles.workspaceLabel}>Workspace</span>
          <button className={styles.workspaceButton} onClick={() => showNotice("Workspace switching will be connected to organisation membership.")}>
            <span>Company workspace</span>
            <ChevronDown size={15} />
          </button>
        </div>

        <nav className={styles.nav} aria-label="Translend navigation">
          {navigation.map((section) => (
            <div key={section.label} className={styles.navSection}>
              <div className={styles.sectionLabel}>{section.label}</div>
              {section.items.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  className={`${styles.navItem} ${active === label ? styles.navItemActive : ""}`}
                  onClick={() => chooseModule(label)}
                >
                  <Icon size={17} strokeWidth={1.9} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.statusDot} />
          <div><strong>Foundation ready</strong><span>v19 rebuild workspace</span></div>
        </div>
      </aside>

      {mobileOpen && <button className={styles.backdrop} onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.menuButton} onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <div className={styles.breadcrumb}><span>Translend</span><b>/</b><strong>{active}</strong></div>
          <div className={styles.topActions}>
            <button className={styles.iconButton} onClick={() => showNotice("Notifications will connect to operational exceptions.")} aria-label="Notifications"><Bell size={19} /><span className={styles.notificationDot} /></button>
            <div className={styles.profile}><span className={styles.avatar}>AG</span><span className={styles.profileText}><strong>Workspace user</strong><small>Owner access</small></span><ChevronDown size={15} /></div>
          </div>
        </header>

        <main className={styles.content}>
          {notice && <div className={styles.notice} role="status">{notice}</div>}

          <section className={styles.pageHeader}>
            <div>
              <span className={styles.eyebrow}>{isDashboard ? "Control Tower" : "Workspace module"}</span>
              <h1>{isDashboard ? "What needs your attention?" : active}</h1>
              <p>{isDashboard ? "A practical operational picture of movement, attention and billing readiness." : moduleDescriptions[active]}</p>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.secondaryButton} onClick={() => showNotice("Export will be added when report data contracts are connected.")}>Export view</button>
              <button className={styles.primaryButton} onClick={() => showNotice("New record creation is the next controlled build layer.")}><Plus size={17} /> {isDashboard ? "New job" : `Add ${active.slice(0, -1) || active}`}</button>
            </div>
          </section>

          {isDashboard ? (
            <>
              <section className={styles.kpiGrid} aria-label="Operational overview">
                <Kpi label="Active jobs" value={String(activeJobs)} note={`${attentionJobs} need attention`} tone="teal" />
                <Kpi label="Fleet available" value={String(demoTrucks.filter((truck) => truck.status === "Available").length)} note={`${demoTrucks.filter((truck) => truck.status === "On road").length} trucks currently moving`} tone="blue" />
                <Kpi label="Delivered" value={String(deliveredJobs)} note="Completed work in this workspace view" tone="green" />
                <Kpi label="Ready to invoice" value={formatMoney(invoiceReady)} note={`${deliveredJobs} completed job${deliveredJobs === 1 ? "" : "s"}`} tone="orange" />
              </section>

              <section className={styles.dashboardGrid}>
                <article className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <div><span className={styles.panelEyebrow}>Attention</span><h2>Needs action</h2></div>
                    <button className={styles.textButton} onClick={() => chooseModule("Jobs")}>Open jobs</button>
                  </div>
                  <div className={styles.attentionList}>
                    {demoJobs.filter((job) => job.status === "Attention").map((job) => (
                      <div className={styles.attentionItem} key={job.id}>
                        <span className={`${styles.statusBar} ${job.id === "JOB-1041" ? styles.red : styles.orange}`} />
                        <div><strong>{job.issue}</strong><span>{job.id} · {job.customer}</span></div>
                        <AlertTriangle size={16} className={styles.mutedIcon} />
                      </div>
                    ))}
                  </div>
                </article>

                <article className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <div><span className={styles.panelEyebrow}>Operations</span><h2>Movement status</h2></div>
                    <button className={styles.textButton} onClick={() => chooseModule("Dispatch")}>Open dispatch</button>
                  </div>
                  <div className={styles.movementRows}>
                    <Movement label="Active" value={String(activeJobs)} percent="68%" />
                    <Movement label="Delivered" value={String(deliveredJobs)} percent="34%" />
                    <Movement label="Needs attention" value={String(attentionJobs)} percent="24%" />
                  </div>
                </article>
              </section>
            </>
          ) : (
            <section className={styles.dashboardGrid}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div><span className={styles.panelEyebrow}>v19 foundation</span><h2>{active} is ready for its domain layer</h2></div>
                </div>
                <p className={styles.moduleCopy}>This module is routed and interactive. Its production data model, permissions and CRUD workflows will be added without replacing the application shell again.</p>
                <div className={styles.moduleActions}>
                  <button className={styles.primaryButton} onClick={() => showNotice(`${active} data contracts are the next implementation layer.`)}>Prepare module</button>
                  <button className={styles.secondaryButton} onClick={() => chooseModule("Dashboard")}>Back to Control Tower</button>
                </div>
              </article>

              {active === "Trucks" && (
                <article className={styles.panel}>
                  <div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Fleet reference</span><h2>Truck status</h2></div></div>
                  <div className={styles.attentionList}>
                    {demoTrucks.map((truck) => <div className={styles.attentionItem} key={truck.id}><span className={`${styles.statusBar} ${truck.status === "Attention" ? styles.red : styles.blue}`} /><div><strong>{truck.id} · {truck.status}</strong><span>{truck.driver} · {truck.location}</span></div><Truck size={16} className={styles.mutedIcon} /></div>)}
                  </div>
                </article>
              )}

              {active === "Customers" && (
                <article className={styles.panel}>
                  <div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Commercial reference</span><h2>Customer activity</h2></div></div>
                  <div className={styles.attentionList}>
                    {demoCustomers.map((customer) => <div className={styles.attentionItem} key={customer.name}><span className={styles.statusBar} /><div><strong>{customer.name}</strong><span>{customer.activeJobs} active jobs · {formatMoney(customer.balance)} current reference value</span></div><Users size={16} className={styles.mutedIcon} /></div>)}
                  </div>
                </article>
              )}
            </section>
          )}

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div><span className={styles.panelEyebrow}>{isDashboard ? "Operational queue" : "Reference records"}</span><h2>{isDashboard ? "Current jobs" : `${active} context`}</h2></div>
              <div className={styles.searchBox}><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reference records" /></div>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Reference</th><th>Customer</th><th>Route</th><th>Truck</th><th>Status</th><th>Updated</th></tr></thead>
                <tbody>
                  {visibleJobs.map((job) => <TableRow key={job.id} id={job.id} customer={job.customer} route={job.route} truck={job.truck} status={job.status} updated={job.updated} />)}
                  {visibleJobs.length === 0 && <tr><td colSpan={6}>No reference records match “{query}”.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <div className={styles.footerNote}><span>Translend TMS · v19 independent rebuild</span><span>Demo/reference records are clearly separated from live company data</span></div>
        </main>
      </div>
    </div>
  )
}

function Kpi({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) {
  return <article className={styles.kpiCard}><div className={`${styles.kpiIcon} ${styles[tone as keyof typeof styles]}`}><Gauge size={18} /></div><span className={styles.kpiLabel}>{label}</span><strong className={styles.kpiValue}>{value}</strong><span className={styles.kpiNote}>{note}</span></article>
}

function Movement({ label, value, percent }: { label: string; value: string; percent: string }) {
  return <div className={styles.movementRow}><div className={styles.movementLabel}><span>{label}</span><strong>{value}</strong></div><div className={styles.progress}><span style={{ width: percent }} /></div></div>
}

function TableRow({ id, customer, route, truck, status, updated }: { id: string; customer: string; route: string; truck: string; status: string; updated: string }) {
  const tone = status === "Attention" ? "orange" : status === "Delivered" ? "green" : status === "In transit" ? "blue" : "teal"
  return <tr><td><strong>{id}</strong></td><td>{customer}</td><td>{route}</td><td>{truck}</td><td><span className={`${styles.status} ${styles[tone as keyof typeof styles]}`}>{status === "Attention" ? "Needs attention" : status}</span></td><td>{updated}</td></tr>
}
