"use client";

import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { deliveriesRepo, deliveryNotesRepo, tripsRepo } from "@/lib/firebase/modules";
import type {
  Delivery,
  DeliveryNote,
  DeliveryStatus,
  MaterialLine,
  Trip,
  BaseRecord,
} from "@/types/core";

const STATUS_STYLE: Record<DeliveryStatus, string> = {
  pending: "bg-slate-800 text-slate-400",
  delivered: "bg-emerald-950/50 text-emerald-300",
  partial: "bg-amber-950/50 text-amber-300",
  exception: "bg-red-950/50 text-red-300",
};

const EMPTY_LINE = (): MaterialLine => ({
  id: crypto.randomUUID(),
  description: "",
  materialCode: null,
  quantity: 0,
  unit: "",
  expectedQuantity: null,
  notes: "",
});

export default function DeliveriesPage() {
  const { activeOrg } = useWorkspace();
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);
  const [tripsAwaitingDelivery, setTripsAwaitingDelivery] = useState<Trip[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [noteTarget, setNoteTarget] = useState<DeliveryNote | null>(null);
  const [tripTarget, setTripTarget] = useState<Trip | null>(null);
  const [creatingDelivery, setCreatingDelivery] = useState(false);

  useEffect(() => {
    if (!activeOrg) return;
    return deliveriesRepo.subscribe(
      activeOrg.id,
      { environment: "LIVE", orderByField: "createdAt", orderDirection: "desc" },
      setDeliveries,
      (err) => setError(err.message),
    );
  }, [activeOrg]);

  useEffect(() => {
    if (!activeOrg) return;
    let cancelled = false;

    Promise.all([
      tripsRepo.list(activeOrg.id, { environment: "LIVE" }),
      deliveryNotesRepo.list(activeOrg.id, { environment: "LIVE" }),
    ])
      .then(([trips, notes]) => {
        if (cancelled) return;
        const deliveryTripIds = new Set((deliveries ?? []).map((d) => d.tripId));
        const completed = trips.filter(
          (t) => t.status === "completed" || t.status === "unloading",
        );
        setTripsAwaitingDelivery(completed.filter((t) => !deliveryTripIds.has(t.id)));
        setDeliveryNotes(notes);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load delivery notes.");
      });

    return () => {
      cancelled = true;
    };
  }, [activeOrg, deliveries]);

  if (!activeOrg) return null;

  const noteForDelivery = (deliveryId: string) =>
    deliveryNotes.find((note) => note.deliveryId === deliveryId) ?? null;

  const openExistingNote = (delivery: Delivery) => {
    const note = noteForDelivery(delivery.id);
    if (note) setNoteTarget(note);
    else setError("This delivery does not have a Delivery Note yet.");
  };

  const createDeliveryAndNote = async (trip: Trip) => {
    if (!user || creatingDelivery) return;
    setCreatingDelivery(true);
    setError(null);
    try {
      const deliveryPayload: Omit<Delivery, keyof BaseRecord> = {
        tripId: trip.id,
        jobId: trip.jobId,
        status: "pending",
        deliveredAt: null,
        receivedByName: "",
        podFileUrl: null,
        signatureUrl: null,
        exceptionReason: null,
        deliveryNoteId: null,
        arrivalAt: null,
        arrivalBy: null,
        departureAt: null,
        departureBy: null,
        acknowledgements: [],
        evidenceRefs: [],
        exceptionIds: [],
        podState: "not_started",
      };

      const deliveryId = await deliveriesRepo.create(activeOrg.id, user.uid, deliveryPayload, "LIVE");
      const notePayload: Omit<DeliveryNote, keyof BaseRecord> = {
        noteReference: `DN-${deliveryId.slice(0, 8).toUpperCase()}`,
        noteDateTime: Timestamp.now(),
        jobId: trip.jobId,
        tripId: trip.id,
        deliveryId,
        suppliedTo: "",
        customerName: "",
        vehicleRegistration: trip.truckRegistration,
        deliveryLocation: "",
        driverId: trip.driverId,
        driverName: trip.driverName,
        orderReference: null,
        podReference: null,
        loadingPoint: null,
        receivedByName: "",
        receivedByRole: null,
        notes: "",
        materialLines: [EMPTY_LINE()],
        arrivalAt: null,
        arrivalBy: null,
        departureAt: null,
        departureBy: null,
        acknowledgements: [],
        evidenceRefs: [],
        exceptionIds: [],
        podState: "not_started",
      };
      const noteId = await deliveryNotesRepo.create(activeOrg.id, user.uid, notePayload, "LIVE");
      await deliveriesRepo.update(activeOrg.id, user.uid, deliveryId, { deliveryNoteId: noteId });

      const created = await deliveryNotesRepo.getById(activeOrg.id, noteId);
      if (created) setDeliveryNotes((current) => [created, ...current.filter((n) => n.id !== created.id)]);
      setTripTarget(null);
      if (created) setNoteTarget(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create the delivery.");
    } finally {
      setCreatingDelivery(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-50">Deliveries</h1>
        <p className="mt-1 text-sm text-slate-400">Build the delivery record first; POD and exception workflow follows from it.</p>
      </header>

      {error && (
        <div className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {tripsAwaitingDelivery.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">Trips ready for delivery record</h2>
            <span className="text-xs text-slate-500">{tripsAwaitingDelivery.length} waiting</span>
          </div>
          <div className="space-y-2">
            {tripsAwaitingDelivery.map((trip) => (
              <div key={trip.id} className="flex flex-col gap-3 rounded-lg border border-amber-900/40 bg-amber-950/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-200">{trip.jobNumber} · {trip.truckRegistration}</p>
                  <p className="mt-1 text-xs text-slate-500">Driver: {trip.driverName} · Trip: {trip.id.slice(0, 8)}</p>
                </div>
                <button
                  onClick={() => setTripTarget(trip)}
                  className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
                >
                  Create delivery note
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Delivery history</h2>
        {deliveries === null ? (
          <Skeleton />
        ) : deliveries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
            <p className="text-sm font-medium text-slate-200">No deliveries recorded yet.</p>
            <p className="mt-1 text-sm text-slate-500">Completed or unloading trips can start a delivery record above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Trip</th>
                  <th className="px-4 py-3 font-medium">Received by</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Materials</th>
                  <th className="px-4 py-3 font-medium">Delivery Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950">
                {deliveries.map((delivery) => {
                  const note = noteForDelivery(delivery.id);
                  return (
                    <tr key={delivery.id} className="hover:bg-slate-900/60">
                      <td className="px-4 py-3 text-slate-300">{delivery.tripId.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-slate-300">{delivery.receivedByName || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_STYLE[delivery.status]}`}>
                          {delivery.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{note ? note.materialLines.length : 0}</td>
                      <td className="px-4 py-3">
                        {note ? (
                          <button onClick={() => setNoteTarget(note)} className="text-sky-400 hover:underline">
                            {note.noteReference}
                          </button>
                        ) : (
                          <button onClick={() => openExistingNote(delivery)} className="text-slate-500 hover:text-slate-300">
                            Create note
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {tripTarget && (
        <ConfirmDialog
          trip={tripTarget}
          busy={creatingDelivery}
          onClose={() => setTripTarget(null)}
          onConfirm={() => createDeliveryAndNote(tripTarget)}
        />
      )}

      {noteTarget && (
        <DeliveryNoteDialog
          orgId={activeOrg.id}
          userId={user?.uid ?? null}
          note={noteTarget}
          onClose={() => setNoteTarget(null)}
          onSaved={(updated) => {
            setDeliveryNotes((current) => current.map((note) => (note.id === updated.id ? updated : note)));
            setNoteTarget(updated);
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

function ConfirmDialog({ trip, busy, onClose, onConfirm }: { trip: Trip; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal title="Create delivery note" onClose={onClose}>
      <p className="text-sm text-slate-300">
        Create the delivery record and first Delivery Note for <strong>{trip.jobNumber}</strong> on {trip.truckRegistration}.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
        <button onClick={onConfirm} disabled={busy} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60">
          {busy ? "Creating…" : "Create delivery note"}
        </button>
      </div>
    </Modal>
  );
}

function DeliveryNoteDialog({
  orgId,
  userId,
  note,
  onClose,
  onSaved,
  onError,
}: {
  orgId: string;
  userId: string | null;
  note: DeliveryNote;
  onClose: () => void;
  onSaved: (note: DeliveryNote) => void;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState<DeliveryNote>(note);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(note), [note]);

  const update = <K extends keyof DeliveryNote>(key: K, value: DeliveryNote[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateLine = (lineId: string, patch: Partial<MaterialLine>) => {
    setDraft((current) => ({
      ...current,
      materialLines: current.materialLines.map((line) => line.id === lineId ? { ...line, ...patch } : line),
    }));
  };

  const addLine = () => setDraft((current) => ({ ...current, materialLines: [...current.materialLines, EMPTY_LINE()] }));

  const removeLine = (lineId: string) => {
    setDraft((current) => ({
      ...current,
      materialLines: current.materialLines.filter((line) => line.id !== lineId),
    }));
  };

  const save = async () => {
    if (!userId) {
      onError("You must be signed in to save a Delivery Note.");
      return;
    }
    if (!draft.noteReference.trim()) {
      onError("Delivery Note reference is required.");
      return;
    }
    if (draft.materialLines.some((line) => !line.description.trim() || !line.unit.trim() || line.quantity < 0)) {
      onError("Each material line needs a description, unit, and valid quantity.");
      return;
    }

    setSaving(true);
    try {
      await deliveryNotesRepo.update(orgId, userId, draft.id, {
        noteReference: draft.noteReference.trim(),
        suppliedTo: draft.suppliedTo.trim(),
        customerName: draft.customerName.trim(),
        deliveryLocation: draft.deliveryLocation.trim(),
        orderReference: draft.orderReference?.trim() || null,
        podReference: draft.podReference?.trim() || null,
        loadingPoint: draft.loadingPoint?.trim() || null,
        receivedByName: draft.receivedByName.trim(),
        receivedByRole: draft.receivedByRole?.trim() || null,
        notes: draft.notes.trim(),
        materialLines: draft.materialLines,
      });
      const updated = await deliveryNotesRepo.getById(orgId, draft.id);
      if (!updated) throw new Error("Delivery Note was saved but could not be reloaded.");
      onSaved(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save Delivery Note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Delivery Note · ${draft.noteReference}`} onClose={onClose} wide>
      <div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Delivery Note reference"><input className="input" value={draft.noteReference} onChange={(e) => update("noteReference", e.target.value)} /></Field>
          <Field label="Customer"><input className="input" value={draft.customerName} onChange={(e) => update("customerName", e.target.value)} /></Field>
          <Field label="Supplied to"><input className="input" value={draft.suppliedTo} onChange={(e) => update("suppliedTo", e.target.value)} /></Field>
          <Field label="Delivery location"><input className="input" value={draft.deliveryLocation} onChange={(e) => update("deliveryLocation", e.target.value)} /></Field>
          <Field label="Vehicle"><input className="input" value={draft.vehicleRegistration} disabled /></Field>
          <Field label="Driver"><input className="input" value={draft.driverName} disabled /></Field>
          <Field label="Order reference"><input className="input" value={draft.orderReference ?? ""} onChange={(e) => update("orderReference", e.target.value || null)} /></Field>
          <Field label="POD reference"><input className="input" value={draft.podReference ?? ""} onChange={(e) => update("podReference", e.target.value || null)} /></Field>
          <Field label="Loading point"><input className="input" value={draft.loadingPoint ?? ""} onChange={(e) => update("loadingPoint", e.target.value || null)} /></Field>
          <Field label="Received by"><input className="input" value={draft.receivedByName} onChange={(e) => update("receivedByName", e.target.value)} /></Field>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Material lines</h3>
              <p className="mt-0.5 text-xs text-slate-500">Record what was actually supplied or delivered.</p>
            </div>
            <button onClick={addLine} className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">Add line</button>
          </div>
          <div className="space-y-2">
            {draft.materialLines.length === 0 && <div className="rounded-md border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">No material lines yet.</div>}
            {draft.materialLines.map((line) => (
              <div key={line.id} className="grid gap-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3 sm:grid-cols-[1fr_130px_110px_auto]">
                <input className="input" placeholder="Material description" value={line.description} onChange={(e) => updateLine(line.id, { description: e.target.value })} />
                <input className="input" type="number" min="0" step="any" placeholder="Quantity" value={line.quantity} onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })} />
                <input className="input" placeholder="Unit" value={line.unit} onChange={(e) => updateLine(line.id, { unit: e.target.value })} />
                <button onClick={() => removeLine(line.id)} className="rounded-md border border-red-900/50 px-3 py-2 text-xs text-red-300 hover:bg-red-950/30">Remove</button>
              </div>
            ))}
          </div>
        </section>

        <Field label="Notes"><textarea className="input" rows={3} value={draft.notes} onChange={(e) => update("notes", e.target.value)} /></Field>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-slate-800 pt-4">
        <button onClick={onClose} className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Close</button>
        <button onClick={save} disabled={saving} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60">{saving ? "Saving…" : "Save Delivery Note"}</button>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>{children}</label>;
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className={`w-full rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl ${wide ? "max-w-4xl" : "max-w-lg"}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-50">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Skeleton() {
  return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-md bg-slate-900" />)}</div>;
}
