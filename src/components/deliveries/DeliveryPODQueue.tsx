"use client";

import { useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { deliveriesRepo, deliveryNotesRepo } from "@/lib/firebase/modules";
import type { Delivery, DeliveryNote } from "@/types/core";

export function DeliveryPODQueue({ orgId, onOpen }: { orgId: string; onOpen: (note: DeliveryNote) => void }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [notes, setNotes] = useState<DeliveryNote[]>([]);

  useEffect(() => {
    const unsub = deliveriesRepo.subscribe(orgId, { environment: "LIVE", orderByField: "createdAt", orderDirection: "desc" }, setDeliveries, () => undefined);
    deliveryNotesRepo.list(orgId, { environment: "LIVE" }).then(setNotes).catch(() => undefined);
    return unsub;
  }, [orgId]);

  const queue = useMemo(() => deliveries.map((delivery) => {
    const note = notes.find((item) => item.deliveryId === delivery.id);
    return { delivery, note, ageHours: note ? Math.max(0, (Date.now() - (note.arrivalAt ?? note.noteDateTime).toMillis()) / 3_600_000) : 0 };
  }).filter(({ delivery, note }) => delivery.status !== "delivered" && note && note.podState !== "complete"), [deliveries, notes]);

  const formatAge = (hours: number) => hours < 1 ? "under 1h" : hours < 24 ? `${Math.floor(hours)}h` : `${Math.floor(hours / 24)}d ${Math.floor(hours % 24)}h`;
  const now = Timestamp.now();

  return <section className="rounded-lg border border-amber-900/40 bg-amber-950/10 p-4">
    <div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-amber-100">POD queue</h2><p className="mt-0.5 text-xs text-amber-200/60">Deliveries that still need evidence or POD completion.</p></div><span className="rounded-full bg-amber-950 px-2 py-1 text-xs text-amber-200">{queue.length} open</span></div>
    {queue.length === 0 ? <p className="mt-3 text-xs text-slate-500">No outstanding POD work.</p> : <div className="mt-3 space-y-2">{queue.slice(0, 8).map(({ delivery, note, ageHours }) => <button key={delivery.id} onClick={() => note && onOpen(note)} className="flex w-full items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-left hover:bg-slate-900"><span className="min-w-0"><span className="block truncate text-xs font-medium text-slate-200">{note?.noteReference ?? delivery.id.slice(0, 8)}</span><span className="block text-xs text-slate-500">{note?.customerName || "Customer pending"} · {note?.podState.replace("_", " ")}</span></span><span className="shrink-0 text-xs text-amber-300">{formatAge(ageHours)}</span></button>)}</div>}
    <span className="sr-only">Queue generated at {now.toMillis()}</span>
  </section>;
}
