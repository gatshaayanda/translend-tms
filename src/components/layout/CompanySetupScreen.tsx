"use client";

import { useState, type FormEvent } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";

const CURRENCIES = ["BWP", "ZAR", "USD", "EUR", "GBP", "NAD", "ZMW", "MZN"];
const TIMEZONES = [
  "Africa/Gaborone",
  "Africa/Johannesburg",
  "Africa/Windhoek",
  "Africa/Lusaka",
  "Africa/Maputo",
  "Africa/Harare",
  "UTC",
];

export default function CompanySetupScreen() {
  const { createCompany } = useWorkspace();
  const { signOut, user } = useAuth();

  const [name, setName] = useState("");
  const [country, setCountry] = useState("Botswana");
  const [currency, setCurrency] = useState("BWP");
  const [timezone, setTimezone] = useState("Africa/Gaborone");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Company name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createCompany({ name: name.trim(), country, currency, timezone });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create your workspace. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="text-lg font-semibold text-slate-50">Set up your company workspace</h1>
        <p className="mt-1 text-sm text-slate-400">
          {user?.email ? `Signed in as ${user.email}. ` : ""}
          You&apos;ll be the Owner of this workspace and can invite your team afterwards.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Company name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kalahari Freight Lines"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-sky-600 placeholder:text-slate-600 focus:ring-2"
            />
          </Field>

          <Field label="Country">
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-sky-600 focus:ring-2"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Currency">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-sky-600 focus:ring-2"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Timezone">
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-sky-600 focus:ring-2"
              >
                {TIMEZONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {error && (
            <div className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating workspace…" : "Create workspace"}
          </button>

          <button
            type="button"
            onClick={signOut}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-300"
          >
            Sign out instead
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}
