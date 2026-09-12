"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/types/core";

interface NavItem {
  label: string;
  href: (orgId: string) => string;
  icon: string;
  section?: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { section: "Truck Division", label: "Operations Hub", href: (id) => `/${id}/control-tower`, icon: "◈", badge: "TODAY" },
  { label: "Fleet & Live Map", href: (id) => `/${id}/trucks`, icon: "▣" },
  { label: "Delivery Notes & POs", href: (id) => `/${id}/deliveries`, icon: "✓" },
  { label: "Fuel & Workshop", href: (id) => `/${id}/fuel-workshop`, icon: "◒" },
  { label: "Invoicing & Statements", href: (id) => `/${id}/invoicing`, icon: "▤" },
  { label: "Performance Dashboard", href: (id) => `/${id}/performance`, icon: "▥" },
  { section: "Financials", label: "Journal Entry", href: (id) => `/${id}/journal`, icon: "▦" },
  { label: "P&L Statement", href: (id) => `/${id}/p-and-l`, icon: "⌁" },
  { label: "Cash Flow", href: (id) => `/${id}/cash-flow`, icon: "◒" },
  { label: "Balance Sheet", href: (id) => `/${id}/balance-sheet`, icon: "⚖" },
  { label: "Trial Balance", href: (id) => `/${id}/trial-balance`, icon: "≡" },
  { section: "Management", label: "Customers", href: (id) => `/${id}/customers`, icon: "▤" },
  { label: "Jobs", href: (id) => `/${id}/jobs`, icon: "□" },
  { label: "Trips", href: (id) => `/${id}/trips`, icon: "➜" },
  { label: "Drivers", href: (id) => `/${id}/drivers`, icon: "●" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { activeOrg, activeMembership } = useWorkspace();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!activeOrg || !activeMembership) return null;

  const initials = (user?.displayName || user?.email || "U")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="translend-app">
      {mobileOpen && <button aria-label="Close navigation" className="mobile-nav-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className={`translend-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-logo">
          <div className="logo-badge">
            <div className="logo-icon" aria-hidden="true">›</div>
            <div className="logo-text">
              <span className="brand">translend</span>
              <span className="sub">any load · any road</span>
            </div>
          </div>
        </div>

        <nav className="translend-nav" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const href = item.href(activeOrg.id);
            const active = pathname === href || pathname?.startsWith(`${href}/`);
            return (
              <div key={`${item.section ?? ""}-${item.label}`}>
                {item.section && <div className="nav-section-label">{item.section}</div>}
                <Link
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`translend-nav-item ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="name">{user?.displayName || user?.email || "Signed in"}</div>
              <div className="role">{ROLE_LABELS[activeMembership.role]}</div>
            </div>
          </div>
          <button className="signout-button" onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <div className="translend-main">
        <header className="translend-topbar">
          <div className="topbar-left">
            <button className="mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation">☰</button>
            <div>
              <h1>{activeOrg.name}</h1>
              <div className="breadcrumb">Truck Division <span>›</span> {getPageLabel(pathname, activeOrg.id)}</div>
            </div>
          </div>
          <div className="topbar-right">
            <span className="connection-pill"><span className="connection-dot" /> Live data</span>
            <span className="org-pill">{activeMembership.role}</span>
          </div>
        </header>

        <main className="translend-content">{children}</main>
      </div>
    </div>
  );
}

function getPageLabel(pathname: string | null, orgId: string) {
  const current = pathname?.replace(`/${orgId}`, "").split("/").filter(Boolean)[0];
  const labels: Record<string, string> = {
    "control-tower": "Operations Hub",
    customers: "Customers",
    trucks: "Fleet & Live Map",
    drivers: "Drivers",
    jobs: "Jobs",
    trips: "Trips",
    deliveries: "Delivery Notes & POs",
    "fuel-workshop": "Fuel & Workshop",
    invoicing: "Invoicing & Statements",
    performance: "Performance Dashboard",
    journal: "Journal Entry",
    "p-and-l": "P&L Statement",
    "cash-flow": "Cash Flow",
    "balance-sheet": "Balance Sheet",
    "trial-balance": "Trial Balance",
  };
  return labels[current ?? ""] ?? "Operations Hub";
}
