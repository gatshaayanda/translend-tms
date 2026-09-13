"use client";

import Link from "next/link";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ReportsHub } from "@/components/v19/ReportsHub";

const drilldowns = [
  { href: "jobs", label: "Jobs", description: "Open source job records and operational state." },
  { href: "deliveries", label: "Deliveries", description: "Delivery notes, POD and exception workflow." },
  { href: "invoicing", label: "Invoicing", description: "Customer invoice records and collection workflow." },
  { href: "journal", label: "Journal", description: "Posted financial transactions and audit trail." },
  { href: "balance-sheet", label: "Balance sheet", description: "Financial position derived from posted accounting data." },
  { href: "cash-flow", label: "Cash flow", description: "Cash movement view for finance review." },
  { href: "fuel-workshop", label: "Fuel & workshop", description: "Fuel, maintenance, inspections and work orders." },
  { href: "fleet-intelligence", label: "Fleet intelligence", description: "Fleet and telemetry operational detail." },
] as const;

export default function ReportsPage() {
  const { activeOrg } = useWorkspace();
  if (!activeOrg) return null;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-sky-400">Reporting drill-down</p>
            <h2 className="mt-1 text-sm font-semibold text-slate-100">Go from a report signal to the source workflow</h2>
            <p className="mt-1 text-xs text-slate-500">Reports remain derived from LIVE Firestore data; these links open the authoritative operational surfaces for investigation or action.</p>
          </div>
          <Link href={`/${activeOrg.id}/control-tower`} className="mt-2 inline-flex rounded-md border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-900 sm:mt-0">
            Open Control Tower
          </Link>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {drilldowns.map((item) => (
            <Link key={item.href} href={`/${activeOrg.id}/${item.href}`} className="rounded-md border border-slate-800 bg-slate-900/40 p-3 transition hover:border-slate-700 hover:bg-slate-900">
              <p className="text-xs font-semibold text-slate-200">{item.label}</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>
      <ReportsHub orgId={activeOrg.id} />
    </div>
  );
}
