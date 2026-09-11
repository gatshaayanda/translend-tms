"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { trucksRepo } from "@/lib/firebase/modules";
import type { Truck, TruckStatus, BaseRecord } from "@/types/core";

const STATUS_STYLE: Record<TruckStatus, string> = {
  available: "bg-emerald-950/50 text-emerald-300",
  on_trip: "bg-sky-950/50 text-sky-300",
  in_maintenance: "bg-amber-950/50 text-amber-300",
  out_of_service: "bg-red-950/50 text-red-300",
};

export default function TrucksPage() {
  const { activeOrg } = useWorkspace();
  const [trucks, setTrucks] = useState<Truck[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!activeOrg) return;
    const unsub = trucksRepo.subscribe(
      activeOrg.id,
      { environment: "LIVE", orderByField: "registrationNumber" },
      setTrucks,
      (err) => setError(err.message)
    );
    return () => unsub();
  }, [activeOrg]);

  if (!activeOrg) return null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">Trucks</h1>
          <p className="mt-1 text-sm text-slate-400">Your fleet, and where each vehicle stands.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          + New truck
        </button>
      </header>

      {error && <div className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">{error}</div>}

      {trucks === null ? (
        <Skeleton />
      ) : trucks.length === 0 ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trucks.map((t) => (
            <div key={t.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-start justify-between">
                <p className="font-semibold text-slate-100">{t.registrationNumber}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_STYLE[t.status]}`}>
                  {t.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {t.make} {t.model} · {t.year}
              </p>
              <p className="mt-2 text-xs text-slate-500">{t.capacityTons}t capacity · {t.odometerKm.toLocaleString()} km</p>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <TruckFormDialog orgId={activeOrg.id} onClose={() => setShowCreate(false)} onCreated={() => setShowCreate(false)} />
      )}
    </div>
  );
}

function TruckFormDialog({ orgId, onClose, onCreated }: { orgId: string; onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    registrationNumber: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    vinNumber: "",
    capacityTons: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.registrationNumber.trim()) {
      setError("Registration number is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: Omit<Truck, keyof BaseRecord> = {
        registrationNumber: form.registrationNumber.trim().toUpperCase(),
        make: form.make.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        vinNumber: form.vinNumber.trim(),
        capacityTons: Number(form.capacityTons),
        fuelType: "diesel",
        status: "available",
        odometerKm: 0,
        assignedDriverId: null,
        complianceExpiryDates: { licenseDisc: null, roadworthy: null, insurance: null },
        notes: "",
      };
      await trucksRepo.create(orgId, user.uid, payload, "LIVE");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create truck.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-50">New truck</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Registration number" required>
            <input
              value={form.registrationNumber}
              onChange={(e) => setForm((f) => ({ ...f, registrationNumber: e.target.value }))}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Make">
              <input value={form.make} onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))} className="input" />
            </Field>
            <Field label="Model">
              <input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Year">
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
                className="input"
              />
            </Field>
            <Field label="Capacity (tons)">
              <input
                type="number"
                value={form.capacityTons}
                onChange={(e) => setForm((f) => ({ ...f, capacityTons: Number(e.target.value) }))}
                className="input"
              />
            </Field>
          </div>
          <Field label="VIN number">
            <input value={form.vinNumber} onChange={(e) => setForm((f) => ({ ...f, vinNumber: e.target.value }))} className="input" />
          </Field>

          {error && <div className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60">
              {submitting ? "Creating…" : "Create truck"}
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
      <p className="text-sm font-medium text-slate-200">No trucks yet.</p>
      <p className="mt-1 text-sm text-slate-500">Add your first vehicle to start assigning trips.</p>
      <button onClick={onCreate} className="mt-4 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500">
        + New truck
      </button>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-900" />
      ))}
    </div>
  );
}
