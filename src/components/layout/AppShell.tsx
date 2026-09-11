"use client";

// =============================================================
// Application shell — sidebar + top bar
// =============================================================
// Wraps every page inside /(app)/[orgId]/*. Renders real nav
// items only (no dead links) — modules not yet implemented in
// this pass are intentionally omitted from the nav rather than
// linked to a blank page.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/types/core";

interface NavItem {
  label: string;
  href: (orgId: string) => string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Control Tower", href: (orgId) => `/${orgId}/control-tower`, icon: "◎" },
  { label: "Customers", href: (orgId) => `/${orgId}/customers`, icon: "▤" },
  { label: "Trucks", href: (orgId) => `/${orgId}/trucks`, icon: "▭" },
  { label: "Drivers", href: (orgId) => `/${orgId}/drivers`, icon: "☺" },
  { label: "Jobs", href: (orgId) => `/${orgId}/jobs`, icon: "▣" },
  { label: "Trips", href: (orgId) => `/${orgId}/trips`, icon: "➜" },
  { label: "Deliveries", href: (orgId) => `/${orgId}/deliveries`, icon: "✔" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { activeOrg, activeMembership } = useWorkspace();
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  if (!activeOrg || !activeMembership) return null; // AppGate guarantees this won't render otherwise

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar — desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-925 px-3 py-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-600 text-sm font-bold text-white">
            T
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-100">{activeOrg.name}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              {ROLE_LABELS[activeMembership.role]}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const href = item.href(activeOrg.id);
            const isActive = pathname?.startsWith(href);
            return (
              <Link
                key={item.label}
                href={href}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition ${
                  isActive
                    ? "bg-sky-600/15 text-sky-300"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <span className="w-4 text-center text-xs">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-slate-800 pt-3">
          <p className="truncate px-2 text-xs text-slate-500">{user?.email}</p>
          <button
            onClick={signOut}
            className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-900 hover:text-slate-300"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur md:hidden">
        <span className="text-sm font-semibold">{activeOrg.name}</span>
        <button onClick={signOut} className="text-xs text-slate-400">
          Sign out
        </button>
      </div>

      <div className="flex-1 pt-14 md:pt-0">
        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-slate-800 bg-slate-950/95 py-1.5 backdrop-blur md:hidden">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const href = item.href(activeOrg.id);
            const isActive = pathname?.startsWith(href);
            return (
              <Link
                key={item.label}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${
                  isActive ? "text-sky-400" : "text-slate-500"
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="min-h-screen px-4 py-6 pb-20 md:px-8 md:py-8 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
