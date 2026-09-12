"use client";

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
      <header className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Companies you move freight for.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ New customer</button>
      </header>

      <section className="panel">
        <div className="section-header">
          <div>
            <h2 className="section-title">Customer register</h2>
            <p className="section-sub">Live organization records from Firestore.</p>
          </div>
          <span className="badge teal">Live</span>
        </div>

        <div className="form-group" style={{ maxWidth: 420, marginBottom: 18 }}>
          <label htmlFor="customer-search">Search customers</label>
          <input
            id="customer-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, contact, or email…"
            className="form-input"
          />
        </div>

        {error && <div className="notice" style={{ borderColor: "#F3C3C3", background: "var(--red-100)", color: "#902323", marginBottom: 14 }}>{error}</div>}

        {customers === null ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState hasAny={customers.length > 0} onCreate={() => setShowCreate(true)} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Country</th>
                  <th>Terms</th>
                  <th>Open jobs</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td>
                      {c.contactName || "—"}
                      {c.contactEmail && <span style={{ display: "block", color: "var(--ink-4)", fontSize: 11 }}>{c.contactEmail}</span>}
                    </td>
                    <td>{c.country || "—"}</td>
                    <td>{c.paymentTermsDays} days</td>
                    <td>{c.stats?.openJobs ?? 0}</td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
    active: "green",
    inactive: "gray",
    prospect: "yellow",
  }[status] as "green" | "gray" | "yellow";
  return <span className={`badge ${style}`}>{status}</span>;
}

function EmptyState({ hasAny, onCreate }: { hasAny: boolean; onCreate: () => void }) {
  return (
    <div className="empty-state">
      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{hasAny ? "No customers match your search." : "No customers yet."}</p>
      {!hasAny && (
        <>
          <p style={{ marginTop: 5, color: "var(--ink-3)", fontSize: 12 }}>Add your first customer to start creating jobs against them.</p>
          <button onClick={onCreate} className="btn-primary" style={{ marginTop: 16 }}>+ New customer</button>
        </>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="list">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ height: 42, borderRadius: 8, background: "var(--surface-3)", border: "1px solid var(--divider)" }} />
      ))}
    </div>
  );
}
