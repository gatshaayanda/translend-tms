"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { jobsRepo, customersRepo } from "@/lib/firebase/modules";
import type { Job, JobStatus, Customer, BaseRecord } from "@/types/core";
import { Timestamp } from "firebase/firestore";

const STATUS_STYLE: Record<JobStatus, string> = {
  draft: "bg-slate-800 text-slate-400",
  confirmed: "bg-amber-950/50 text-amber-300",
  dispatched: "bg-sky-950/50 text-sky-300",
  in_progress: "bg-sky-950/50 text-sky-300",
  completed: "bg-emerald-950/50 text-emerald-300",
  cancelled: "bg-red-950/50 text-red-300",
};

export default function JobsPage() {
  const { activeOrg } = useWorkspace();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!activeOrg) return;
    const unsub = jobsRepo.subscribe(
      activeOrg.id,
      { environment: "LIVE", orderByField: "createdAt", orderDirection: "desc" },
      setJobs,
      (err) => setError(err.message)
    );
    return () => unsub();
  }, [activeOrg]);

  useEffect(() => {
    if (!activeOrg) return;
    customersRepo.list(activeOrg.id, { environment: "LIVE", orderByField: "name" }).then(setCustomers).catch(() => {});
  }, [activeOrg]);

  if (!activeOrg) return null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">Jobs</h1>
          <p className="mt-1 text-sm text-slate-400">Freight requests, from confirmation through dispatch.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={customers.length === 0}
          title={customers.length === 0 ? "Add a customer first" : undefined}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          + New job
        </button>
      </header>

      {error && <div className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">{error}</div>}

      {jobs === null ? (
        <Skeleton />
      ) : jobs.length === 0 ? (
        <EmptyState hasCustomers={customers.length > 0} onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Job #</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Route</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Rate</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-slate-900/60">
                  <td className="px-4 py-3 font-medium text-slate-100">{j.jobNumber}</td>
                  <td className="px-4 py-3 text-slate-300">{j.customerName}</td>
                  <td className="hidden px-4 py-3 text-slate-400 lg:table-cell">
                    {j.origin} → {j.destination}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-400 md:table-cell">
                    {j.currency} {j.rate.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_STYLE[j.status]}`}>
                      {j.status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <JobFormDialog
          orgId={activeOrg.id}
          customers={customers}
          defaultCurrency={activeOrg.currency}
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function JobFormDialog({
  orgId,
  customers,
  defaultCurrency,
  onClose,
  onCreated,
}: {
  orgId: string;
  customers: Customer[];
  defaultCurrency: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    customerId: customers[0]?.id ?? "",
    origin: "",
    destination: "",
    cargoDescription: "",
    cargoWeightTons: 0,
    pickupDate: "",
    deliveryDate: "",
    rate: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const customer = customers.find((c) => c.id === form.customerId);
    if (!customer) {
      setError("Select a customer.");
      return;
    }
    if (!form.origin.trim() || !form.destination.trim()) {
      setError("Origin and destination are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const jobNumber = `JOB-${Date.now().toString(36).toUpperCase()}`;
      const payload: Omit<Job, keyof BaseRecord> = {
        jobNumber,
        customerId: customer.id,
        customerName: customer.name,
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        cargoDescription: form.cargoDescription.trim(),
        cargoWeightTons: Number(form.cargoWeightTons),
        requestedPickupDate: form.pickupDate ? Timestamp.fromDate(new Date(form.pickupDate)) : Timestamp.now(),
        requestedDeliveryDate: form.deliveryDate ? Timestamp.fromDate(new Date(form.deliveryDate)) : Timestamp.now(),
        rate: Number(form.rate),
        currency: customer.currency || defaultCurrency,
        status: "confirmed",
        notes: "",
      };
      await jobsRepo.create(orgId, user.uid, payload, "LIVE");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-50">New job</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Customer *</span>
            <select
              value={form.customerId}
              onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
              className="input"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Origin" required>
              <input value={form.origin} onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))} className="input" />
            </Field>
            <Field label="Destination" required>
              <input value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} className="input" />
            </Field>
          </div>

          <Field label="Cargo description">
            <input
              value={form.cargoDescription}
              onChange={(e) => setForm((f) => ({ ...f, cargoDescription: e.target.value }))}
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cargo weight (tons)">
              <input
                type="number"
                value={form.cargoWeightTons}
                onChange={(e) => setForm((f) => ({ ...f, cargoWeightTons: Number(e.target.value) }))}
                className="input"
              />
            </Field>
            <Field label="Rate">
              <input
                type="number"
                value={form.rate}
                onChange={(e) => setForm((f) => ({ ...f, rate: Number(e.target.value) }))}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Pickup date">
              <input
                type="date"
                value={form.pickupDate}
                onChange={(e) => setForm((f) => ({ ...f, pickupDate: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Delivery date">
              <input
                type="date"
                value={form.deliveryDate}
                onChange={(e) => setForm((f) => ({ ...f, deliveryDate: e.target.value }))}
                className="input"
              />
            </Field>
          </div>

          {error && <div className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60">
              {submitting ? "Creating…" : "Create job"}
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

function EmptyState({ hasCustomers, onCreate }: { hasCustomers: boolean; onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
      <p className="text-sm font-medium text-slate-200">No jobs yet.</p>
      <p className="mt-1 text-sm text-slate-500">
        {hasCustomers ? "Create your first job to get freight moving." : "Add a customer first, then create a job for them."}
      </p>
      {hasCustomers && (
        <button onClick={onCreate} className="mt-4 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500">
          + New job
        </button>
      )}
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
