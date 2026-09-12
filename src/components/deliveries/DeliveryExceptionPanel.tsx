"use client";

import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { deliveryExceptionsRepo, deliveryNotesRepo, deliveriesRepo } from "@/lib/firebase/modules";
import type { BaseRecord, Delivery, DeliveryException, DeliveryExceptionCategory, DeliveryExceptionStatus, DeliveryNote } from "@/types/core";

const CATEGORIES: Array<{ value: DeliveryExceptionCategory; label: string }> = [
  { value: "shortage", label: "Shortage" },
  { value: "damage", label: "Damage" },
  { value: "quantity_discrepancy", label: "Quantity discrepancy" },
  { value: "wrong_material", label: "Wrong material" },
  { value: "refused", label: "Refused" },
  { value: "site", label: "Site" },
  { value: "vehicle", label: "Vehicle" },
  { value: "other", label: "Other" },
];

export function DeliveryExceptionPanel({
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
  const [category, setCategory] = useState<DeliveryExceptionCategory>("other");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const [updatedNote, updatedDelivery] = await Promise.all([
      deliveryNotesRepo.getById(orgId, note.id),
      delivery ? deliveriesRepo.getById(orgId, delivery.id) : Promise.resolve(null),
    ]);
    if (!updatedNote) throw new Error("Exception was saved but the Delivery Note could not be reloaded.");
    onSaved(updatedNote, updatedDelivery);
  };

  const createException = async () => {
    if (!userId || !delivery) return onError("You must be signed in with an editable delivery record to report an exception.");
    if (!description.trim()) return onError("Enter an exception description before saving it.");
    setBusy(true);
    try {
      const payload: Omit<DeliveryException, keyof BaseRecord> = {
        deliveryNoteId: note.id,
        deliveryId: delivery.id,
        category,
        description: description.trim(),
        reportedBy: userId,
        reportedAt: Timestamp.now(),
        status: "open",
        evidenceRefs: [],
        resolutionNotes: "",
        resolvedBy: null,
        resolvedAt: null,
      };

      const exceptionId = await deliveryExceptionsRepo.create(orgId, userId, payload, "LIVE");
      const exceptionIds = Array.from(new Set([...(note.exceptionIds ?? []), exceptionId]));
      await Promise.all([
        deliveryNotesRepo.update(orgId, userId, note.id, { exceptionIds, podState: "incomplete" }),
        deliveriesRepo.update(orgId, userId, delivery.id, { exceptionIds, podState: "incomplete", status: "exception" }),
      ]);
      setDescription("");
      await reload();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save the delivery exception.");
    } finally {
      setBusy(false);
    }
  };

  const updateException = async (exception: DeliveryException, patch: Partial<DeliveryException>) => {
    if (!userId) return onError("You must be signed in to update an exception.");
    setBusy(true);
    try {
      await deliveryExceptionsRepo.update(orgId, userId, exception.id, patch);
      await reload();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update the delivery exception.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">Exceptions</h3>
        <p className="mt-0.5 text-xs text-slate-500">Capture shortages, damage, refusals and other delivery issues against the Delivery Note.</p>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-[180px_1fr_auto]">
        <select className="input" value={category} onChange={(event) => setCategory(event.target.value as DeliveryExceptionCategory)} disabled={busy}>
          {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <input className="input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the delivery exception" disabled={busy} />
        <button onClick={createException} disabled={busy} className="rounded-md bg-red-700 px-3 py-2 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50">{busy ? "Saving…" : "Report exception"}</button>
      </div>

      <div className="mt-3 space-y-2">
        {(note.exceptionIds ?? []).length === 0 ? (
          <p className="text-xs text-slate-600">No exceptions recorded.</p>
        ) : (
          <ExceptionList orgId={orgId} ids={note.exceptionIds ?? []} busy={busy} onUpdate={updateException} />
        )}
      </div>
    </section>
  );
}

function ExceptionList({
  orgId,
  ids,
  busy,
  onUpdate,
}: {
  orgId: string;
  ids: string[];
  busy: boolean;
  onUpdate: (exception: DeliveryException, patch: Partial<DeliveryException>) => Promise<void>;
}) {
  const [items, setItems] = useState<DeliveryException[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void deliveryExceptionsRepo.list(orgId, { environment: "LIVE" }).then((all) => {
      if (!cancelled) setItems(all.filter((item) => ids.includes(item.id)));
    }).catch(() => {
      if (!cancelled) setItems([]);
    });
    return () => {
      cancelled = true;
    };
  }, [orgId, ids]);

  if (items === null) return <p className="text-xs text-slate-600">Loading exceptions…</p>;

  return (
    <div className="space-y-2">
      {items.map((exception) => {
        const status: DeliveryExceptionStatus = exception.status;
        return (
          <div key={exception.id} className="rounded-md border border-red-900/40 bg-red-950/10 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-red-300">{exception.category.replaceAll("_", " ")}</p>
                <p className="mt-1 text-sm text-slate-200">{exception.description}</p>
                <p className="mt-1 text-xs text-slate-500">Reported {exception.reportedAt.toDate().toLocaleString()}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${status === "open" ? "bg-red-950 text-red-300" : "bg-emerald-950 text-emerald-300"}`}>{status}</span>
            </div>
            {status === "open" ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  className="input"
                  placeholder="Resolution notes (optional)"
                  defaultValue={exception.resolutionNotes}
                  disabled={busy}
                  onBlur={(event) => {
                    const value = event.target.value.trim();
                    if (value !== exception.resolutionNotes) void onUpdate(exception, { resolutionNotes: value });
                  }}
                />
                <button
                  onClick={() => void onUpdate(exception, { status: "resolved", resolvedBy: null, resolvedAt: Timestamp.now() })}
                  disabled={busy}
                  className="rounded-md border border-emerald-900/50 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-950/30 disabled:opacity-50"
                >
                  Resolve
                </button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Resolved {exception.resolvedAt ? exception.resolvedAt.toDate().toLocaleString() : ""}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
