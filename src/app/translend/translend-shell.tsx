"use client";

import { useState } from "react";
import { BarChart3, Bell, Boxes, ChevronDown, ClipboardList, FileText, Fuel, Gauge, LayoutDashboard, Map, Menu, MoreHorizontal, Route, Settings, Truck, Users, Wrench, X } from "lucide-react";
import styles from "./translend-shell.module.css";

const navigation = [
  { label: "Control Tower", items: [{ label: "Dashboard", icon: LayoutDashboard }] },
  { label: "Operations", items: [{ label: "Jobs", icon: ClipboardList }, { label: "Dispatch", icon: Gauge }, { label: "Trips", icon: Route }, { label: "Deliveries", icon: Boxes }, { label: "Routes", icon: Map }] },
  { label: "Fleet", items: [{ label: "Trucks", icon: Truck }, { label: "Drivers", icon: Users }, { label: "Maintenance", icon: Wrench }, { label: "Inspections", icon: ClipboardList }, { label: "Compliance", icon: FileText }, { label: "Tyres", icon: MoreHorizontal }, { label: "Fuel", icon: Fuel }] },
  { label: "Commercial", items: [{ label: "Customers", icon: Users }, { label: "Rate Cards", icon: FileText }, { label: "Invoices", icon: FileText }, { label: "Receipts", icon: FileText }, { label: "Statements", icon: FileText }] },
  { label: "Finance", items: [{ label: "Expenses", icon: FileText }, { label: "Profitability", icon: BarChart3 }, { label: "Operational P&L", icon: BarChart3 }] },
  { label: "System", items: [{ label: "Documents", icon: FileText }, { label: "Reports", icon: BarChart3 }, { label: "Settings", icon: Settings }] },
];

const kpis = [
  { label: "Active jobs", value: "24", note: "6 need attention", tone: "teal" },
  { label: "Trucks on road", value: "18", note: "3 returning today", tone: "blue" },
  { label: "Deliveries today", value: "37", note: "31 completed", tone: "green" },
  { label: "Ready to invoice", value: "P184,600", note: "12 completed jobs", tone: "orange" },
];

export default function TranslendShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState("Dashboard");
  return (
    <div className={styles.app}>
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.brandRow}><div className={styles.brandMark}>T</div><div><div className={styles.brandName}>Translend</div><div className={styles.brandSub}>TMS · Truck Division</div></div><button className={styles.closeButton} onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button></div>
        <div className={styles.workspace}><span className={styles.workspaceLabel}>Workspace</span><button className={styles.workspaceButton}><span>Operations HQ</span><ChevronDown size={15} /></button></div>
        <nav className={styles.nav} aria-label="Translend navigation">{navigation.map((section) => <div key={section.label} className={styles.navSection}><div className={styles.sectionLabel}>{section.label}</div>{section.items.map(({ label, icon: Icon }) => <button key={label} className={`${styles.navItem} ${active === label ? styles.navItemActive : ""}`} onClick={() => { setActive(label); setMobileOpen(false); }}><Icon size={17} strokeWidth={1.9} /><span>{label}</span></button>)}</div>)}</nav>
        <div className={styles.sidebarFooter}><div className={styles.statusDot} /><div><strong>System online</strong><span>All services operational</span></div></div>
      </aside>
      {mobileOpen && <button className={styles.backdrop} onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <div className={styles.main}>
        <header className={styles.topbar}><button className={styles.menuButton} onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div className={styles.breadcrumb}><span>Control Tower</span><b>/</b><strong>{active}</strong></div><div className={styles.topActions}><button className={styles.iconButton} aria-label="Notifications"><Bell size={19} /><span className={styles.notificationDot} /></button><div className={styles.profile}><span className={styles.avatar}>AG</span><span className={styles.profileText}><strong>Operations</strong><small>Foundation</small></span><ChevronDown size={15} /></div></div></header>
        <main className={styles.content}>
          <section className={styles.pageHeader}><div><span className={styles.eyebrow}>Control Tower</span><h1>Good morning, Operations.</h1><p>Here is what is moving, what needs attention, and what is ready to be billed.</p></div><div className={styles.headerActions}><button className={styles.secondaryButton}>Export view</button><button className={styles.primaryButton}>+ New job</button></div></section>
          <section className={styles.kpiGrid} aria-label="Operational overview">{kpis.map((kpi) => <article className={styles.kpiCard} key={kpi.label}><div className={`${styles.kpiIcon} ${styles[kpi.tone as keyof typeof styles]}`}><Gauge size={18} /></div><span className={styles.kpiLabel}>{kpi.label}</span><strong className={styles.kpiValue}>{kpi.value}</strong><span className={styles.kpiNote}>{kpi.note}</span></article>)}</section>
          <section className={styles.dashboardGrid}><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Attention</span><h2>Needs action</h2></div><button className={styles.textButton}>View all</button></div><div className={styles.attentionList}><AttentionItem tone="orange" title="TRK-018 inspection due" detail="Vehicle needs inspection before next dispatch" /><AttentionItem tone="red" title="POD missing · JOB-1042" detail="Delivery completed 42 min ago" /><AttentionItem tone="blue" title="Rate confirmation pending" detail="Kalahari Aggregates · Job JOB-1039" /></div></article><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Operations</span><h2>Today's movement</h2></div><button className={styles.textButton}>Open dispatch</button></div><div className={styles.movementRows}><Movement label="Dispatched" value="18" percent="75%" /><Movement label="In transit" value="11" percent="46%" /><Movement label="Delivered" value="31" percent="84%" /></div></article></section>
          <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Foundation workspace</span><h2>Reference activity</h2></div><span className={styles.textButton}>Shell only</span></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Reference</th><th>Customer</th><th>Route</th><th>Truck</th><th>Status</th><th>Updated</th></tr></thead><tbody><TableRow id="JOB-1044" customer="Metsi Materials" route="Gaborone → Palapye" truck="TRK-021" status="In transit" tone="blue" time="4 min ago" /><TableRow id="JOB-1043" customer="Kalahari Aggregates" route="Lobatse → Gaborone" truck="TRK-014" status="Delivered" tone="green" time="18 min ago" /><TableRow id="JOB-1042" customer="Delta Build" route="Tlokweng → Molepolole" truck="TRK-009" status="POD pending" tone="orange" time="42 min ago" /><TableRow id="JOB-1041" customer="Metsi Materials" route="Gaborone → Francistown" truck="TRK-018" status="Inspection due" tone="red" time="1 hr ago" /></tbody></table></div></section>
          <div className={styles.footerNote}><span>Translend TMS · Independent foundation shell</span><span>Business modules intentionally not connected</span></div>
        </main>
      </div>
    </div>
  );
}
function AttentionItem({ tone, title, detail }: { tone: string; title: string; detail: string }) { return <div className={styles.attentionItem}><span className={`${styles.statusBar} ${styles[tone as keyof typeof styles]}`} /><div><strong>{title}</strong><span>{detail}</span></div><ChevronDown size={16} className={styles.mutedIcon} /></div>; }
function Movement({ label, value, percent }: { label: string; value: string; percent: string }) { return <div className={styles.movementRow}><div className={styles.movementLabel}><span>{label}</span><strong>{value}</strong></div><div className={styles.progress}><span style={{ width: percent }} /></div></div>; }
function TableRow({ id, customer, route, truck, status, tone, time }: { id: string; customer: string; route: string; truck: string; status: string; tone: string; time: string }) { return <tr><td><strong>{id}</strong></td><td>{customer}</td><td>{route}</td><td>{truck}</td><td><span className={`${styles.status} ${styles[tone as keyof typeof styles]}`}>{status}</span></td><td>{time}</td></tr>; }
