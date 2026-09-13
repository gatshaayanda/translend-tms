"use client";

import { DeliveryEvidencePanel } from "@/components/deliveries/DeliveryEvidencePanel";
import type { DeliveryNote } from "@/types/core";

export function DeliveryPODContextDialog({ orgId, note, onClose, onSaved, onError }: { orgId: string; note: DeliveryNote; onClose: () => void; onSaved: (note: DeliveryNote) => void; onError: (message: string) => void }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6">
    <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-xl border border-slate-800 bg-slate-950 shadow-2xl sm:rounded-xl">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-5 py-4 backdrop-blur">
        <div className="min-w-0"><p className="text-xs uppercase tracking-wide text-slate-500">Delivery Note</p><h2 className="truncate text-lg font-semibold text-slate-100">{note.noteReference}</h2><p className="mt-1 truncate text-xs text-slate-500">{note.customerName || "Customer pending"} · {note.deliveryLocation || "Delivery location pending"}</p></div>
        <button onClick={onClose} className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800">Close</button>
      </header>
      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-md border border-slate-800 p-3"><p className="text-xs text-slate-500">Driver</p><p className="mt-1 text-sm text-slate-200">{note.driverName || "—"}</p></div><div className="rounded-md border border-slate-800 p-3"><p className="text-xs text-slate-500">Vehicle</p><p className="mt-1 text-sm text-slate-200">{note.vehicleRegistration || "—"}</p></div><div className="rounded-md border border-slate-800 p-3"><p className="text-xs text-slate-500">POD state</p><p className="mt-1 text-sm capitalize text-slate-200">{note.podState.replace("_", " ")}</p></div></div>
        <DeliveryEvidencePanel orgId={orgId} note={note} onSaved={onSaved} onError={onError} />
      </div>
    </div>
  </div>;
}
