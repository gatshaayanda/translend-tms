"use client";

// =============================================================
// Customers — /(app)/[orgId]/customers
// =============================================================
// Real-time list (onSnapshot) scoped to the active org, LIVE
// environment only. This is the page the previous session was
// mid-write on; rebuilt here cleanly against the shared
// repository/context layer rather than any ad-hoc code.

import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { customersRepo } from "@/lib/firebase/modules";
import type { Customer } from "@/types/core";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";

export default function CustomersPage() {
  const { activeOrg } = useWorkspace();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!activeOrg) return;
    const unsubscribe = customersRepo.subscribe(
      activeOrg.id,
      { environment: "LIVE", orderByField: "name", orderDirection: "asc" },
      (items) => {
        setCustomers(items);
        setError(null);
      },
      (err) => {
        console.error("[CustomersPage] subscribe failed:", err);
        setError(err.message || "Failed to load customers.");
      }
    );
    return () => unsubscribe();
  }, [activeOrg]);

  const filtered = useMemo(() => {
    if (!customers) return [];
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.contactName.toLowerCase().includes(q) || c.contactEmail.toLowerCase().includes(q)
    );
  }, [customers, search]);

  if (!activeOrg) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">Customers</h1>
          <p className="mt-1 text-sm text-slate-400">Companies you move freight for.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 self-start rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          + New customer
        </button>
      </header>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search customers by name, contact, or email…"
        className="w-full max-w-sm rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-sky-600 placeholder:text-slate-600 focus:ring-2"
      />

      {error && (
        <div className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">{error}</div>
      )}

      {customers === null ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState hasAny={customers.length > 0} onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Country</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Terms</th>
                <th className="px-4 py-3 font-medium">Open jobs</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-900/60">
                  <td className="px-4 py-3 font-medium text-slate-100">{c.name}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {c.contactName || "—"}
                    {c.contactEmail && <span className="block text-xs text-slate-600">{c.contactEmail}</span>}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-400 md:table-cell">{c.country || "—"}</td>
                  <td className="hidden px-4 py-3 text-slate-400 md:table-cell">
                    {c.paymentTermsDays} days
                  </td>
                  <td className="px-4 py-3 text-slate-300">{c.stats?.openJobs ?? 0}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CustomerFormDialog
          orgId={activeOrg.id}
          defaultCurrency={activeOrg.currency}
          defaultCountry={activeOrg.country}
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Customer["status"] }) {
  const style = {
    active: "bg-emerald-950/50 text-emerald-300",
    inactive: "bg-slate-800 text-slate-400",
    prospect: "bg-amber-950/50 text-amber-300",
  }[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${style}`}>{status}</span>;
}

function EmptyState({ hasAny, onCreate }: { hasAny: boolean; onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
      <p className="text-sm font-medium text-slate-200">
        {hasAny ? "No customers match your search." : "No customers yet."}
      </p>
      {!hasAny && (
        <>
          <p className="mt-1 text-sm text-slate-500">Add your first customer to start creating jobs against them.</p>
          <button
            onClick={onCreate}
            className="mt-4 inline-block rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            + New customer
          </button>
        </>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-md bg-slate-900" />
      ))}
    </div>
  );
}
