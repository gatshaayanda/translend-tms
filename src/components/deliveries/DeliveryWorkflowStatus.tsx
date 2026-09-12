"use client";

import { useEffect, useMemo, useState } from "react";
import { deliveryExceptionsRepo, deliveryNotesRepo, deliveriesRepo } from "@/lib/firebase/modules";
import { deriveDeliveryPodState, isDeliveryInvoiceReady } from "@/lib/deliveries/workflow";
import type { Delivery, DeliveryException, DeliveryNote } from "@/types/core";

export function DeliveryWorkflowStatus({
  orgId,
  userId,
  note,
  delivery,
  onSaved,
  onError,
}: {
  orgId: string;
  userId: string | null;
  note: DeliveryNote;
  delivery: Delivery | null;
  onSaved: (note: DeliveryNote, delivery: Delivery | null) => void;
  onError: (message: string) => void;
}) {
  const [exceptions, setExceptions] = useState<DeliveryException[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadExceptions = async () => {
    setLoading(true);
    try {
      const all = await deliveryExceptionsRepo.list(orgId, { environment: "LIVE" });
      setExceptions(all.filter((item) => (note.exceptionIds ?? []).includes(item.id)));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to load delivery exceptions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadExceptions();
  }, [orgId, note.id, note.exceptionIds]);

  const podState = useMemo(() => deriveDeliveryPodState(note, delivery, exceptions), [note, delivery, exceptions]);
  const invoiceReady = useMemo(() => isDeliveryInvoiceReady(note, delivery, exceptions), [note, delivery, exceptions]);
  const openExceptions = exceptions.filter((item) => item.status === "open");
  const receiverAcknowledged = note.acknowledgements.some((item) => item.role === "receiver");
  const hasEvidence = note.evidenceRefs.length > 0;
  const canComplete = Boolean(delivery?.arrivalAt && delivery?.departureAt && receiverAcknowledged && hasEvidence && openExceptions.length === 0);

  const completeDelivery = async () => {
    if (!userId || !delivery) return onError("You must be signed in to complete a delivery.");
    if (!canComplete) return onError("Complete arrival, departure, receiver acknowledgement and evidence, and resolve all open exceptions before completing the delivery.");
    setBusy(true);
    try {
      await Promise.all([
        deliveriesRepo.update(orgId, userId, delivery.id, { status: "delivered", podState: "complete" }),
        deliveryNotesRepo.update(orgId, userId, note.id, { podState: "complete" }),
      ]);
      const [updatedNote, updatedDelivery] = await Promise.all([
        deliveryNotesRepo.getById(orgId, note.id),
        deliveriesRepo.getById(orgId, delivery.id),
      ]);
      if (!updatedNote || !updatedDelivery) throw new Error("Delivery was completed but could not be reloaded.");
      onSaved(updatedNote, updatedDelivery);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to complete the delivery.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatusCard label="POD state" value={loading ? "Loading…" : podState.replace("_", " ")} />
        <StatusCard label="Invoice readiness" value={loading ? "Loading…" : invoiceReady ? "Ready" : "Not ready"} />
        <StatusCard label="Open exceptions" value={loading ? "Loading…" : String(openExceptions.length)} />
      </div>

      <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/70 p-3">
        <p className="text-xs text-slate-500">Completion requires arrival, departure, receiver acknowledgement, evidence and no open exceptions.</p>
        <button onClick={completeDelivery} disabled={busy || loading || !canComplete || delivery?.status === "delivered"} className="mt-3 rounded-md bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50">
          {delivery?.status === "delivered" ? "Delivery completed" : busy ? "Completing…" : "Complete delivery"}
        </button>
      </div>
    </section>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  const normalized = value.toLowerCase();
  const positive = normalized === "complete" || normalized === "ready";
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/70 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-sm capitalize ${positive ? "text-emerald-300" : "text-slate-300"}`}>{value}</p>
    </div>
  );
}
