"use client";

import { useState, type FormEvent } from "react";
import { customersRepo } from "@/lib/firebase/modules";
import { useAuth } from "@/contexts/AuthContext";
import type { Customer } from "@/types/core";

interface CustomerFormDialogProps {
  orgId: string;
  defaultCurrency: string;
  defaultCountry: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CustomerFormDialog({
  orgId,
  defaultCurrency,
  defaultCountry,
  onClose,
  onCreated,
}: CustomerFormDialogProps) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "",
    billingAddress: "",
    country: defaultCountry,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    currency: defaultCurrency,
    paymentTermsDays: 30,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) {
      setError("Customer name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: Omit<Customer, keyof import("@/types/core").BaseRecord> = {
        name: form.name.trim(),
        billingAddress: form.billingAddress.trim(),
        country: form.country.trim(),
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        currency: form.currency,
        paymentTermsDays: Number(form.paymentTermsDays) || 0,
        status: "active",
        notes: "",
        stats: {
          openJobs: 0,
          activeTrips: 0,
          outstandingBalance: 0,
          lastActivityAt: null,
        },
      };
      await customersRepo.create(orgId, user.uid, payload, "LIVE");
      onCreated();
    } catch (err) {
      console.error("[CustomerFormDialog] create failed:", err);
      setError(err instanceof Error ? err.message : "Failed to create customer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-50">New customer</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300" aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <TextField label="Company name" value={form.name} onChange={(v) => update("name", v)} required />
          <TextField label="Billing address" value={form.billingAddress} onChange={(v) => update("billingAddress", v)} />

          <div className="grid grid-cols-2 gap-3">
            <TextField label="Country" value={form.country} onChange={(v) => update("country", v)} />
            <TextField label="Currency" value={form.currency} onChange={(v) => update("currency", v)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField label="Contact name" value={form.contactName} onChange={(v) => update("contactName", v)} />
            <TextField label="Contact phone" value={form.contactPhone} onChange={(v) => update("contactPhone", v)} />
          </div>

          <TextField label="Contact email" value={form.contactEmail} onChange={(v) => update("contactEmail", v)} type="email" />

          <TextField
            label="Payment terms (days)"
            value={String(form.paymentTermsDays)}
            onChange={(v) => update("paymentTermsDays", Number(v.replace(/\D/g, "")) as unknown as number)}
            type="text"
          />

          {error && (
            <div className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-sky-600 focus:ring-2"
      />
    </label>
  );
}
