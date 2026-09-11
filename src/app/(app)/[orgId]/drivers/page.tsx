"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { driversRepo } from "@/lib/firebase/modules";
import type { Driver, DriverStatus, BaseRecord } from "@/types/core";

const STATUS_STYLE: Record<DriverStatus, string> = {
  available: "bg-emerald-950/50 text-emerald-300",
  on_trip: "bg-sky-950/50 text-sky-300",
  on_leave: "bg-amber-950/50 text-amber-300",
  suspended: "bg-red-950/50 text-red-300",
};

export default function DriversPage() {
  const { activeOrg } = useWorkspace();
  const [drivers, setDrivers] = useState<Driver[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!activeOrg) return;
    const unsub = driversRepo.subscribe(
      activeOrg.id,
      { environment: "LIVE", orderByField: "fullName" },
      setDrivers,
      (err) => setError(err.message)
    );
    return () => unsub();
  }, [activeOrg]);

  if (!activeOrg) return null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">Drivers</h1>
          <p className="mt-1 text-sm text-slate-400">Your driver roster and current availability.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500">
          + New driver
        </button>
      </header>

      {error && <div className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">{error}</div>}

      {drivers === null ? (
        <Skeleton />
      ) : drivers.length === 0 ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">License</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950">
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-slate-900/60">
                  <td className="px-4 py-3 font-medium text-slate-100">{d.fullName}</td>
                  <td className="px-4 py-3 text-slate-400">{d.phone || "—"}</td>
                  <td className="hidden px-4 py-3 text-slate-400 md:table-cell">
                    {d.licenseNumber || "—"} {d.licenseClass && `(${d.licenseClass})`}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_STYLE[d.status]}`}>
                      {d.status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <DriverFormDialog orgId={activeOrg.id} onClose={() => setShowCreate(false)} onCreated={() => setShowCreate(false)} />
      )}
    </div>
  );
}

function DriverFormDialog({ orgId, onClose, onCreated }: { orgId: string; onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", licenseNumber: "", licenseClass: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.fullName.trim()) {
      setError("Driver name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: Omit<Driver, keyof BaseRecord> = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        licenseNumber: form.licenseNumber.trim(),
        licenseClass: form.licenseClass.trim(),
        licenseExpiry: null,
        status: "available",
        assignedTruckId: null,
        linkedUid: null,
        notes: "",
      };
      await driversRepo.create(orgId, user.uid, payload, "LIVE");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create driver.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-50">New driver</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Full name" required>
            <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input" />
            </Field>
            <Field label="Email">
              <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="License number">
              <input value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} className="input" />
            </Field>
            <Field label="License class">
              <input value={form.licenseClass} onChange={(e) => setForm((f) => ({ ...f, licenseClass: e.target.value }))} className="input" />
            </Field>
          </div>

          {error && <div className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60">
              {submitting ? "Creating…" : "Create driver"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </span>
      {children}
    </label>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
      <p className="text-sm font-medium text-slate-200">No drivers yet.</p>
      <p className="mt-1 text-sm text-slate-500">Add your first driver to start assigning trips.</p>
      <button onClick={onCreate} className="mt-4 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500">
        + New driver
      </button>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-md bg-slate-900" />
      ))}
    </div>
  );
}
