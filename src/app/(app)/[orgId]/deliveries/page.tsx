"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { deliveriesRepo, tripsRepo } from "@/lib/firebase/modules";
import { uploadPodFile } from "@/lib/firebase/storage";
import type { Delivery, DeliveryStatus, Trip, BaseRecord } from "@/types/core";
import { Timestamp } from "firebase/firestore";

const STATUS_STYLE: Record<DeliveryStatus, string> = {
  pending: "bg-slate-800 text-slate-400",
  delivered: "bg-emerald-950/50 text-emerald-300",
  partial: "bg-amber-950/50 text-amber-300",
  exception: "bg-red-950/50 text-red-300",
};

export default function DeliveriesPage() {
  const { activeOrg } = useWorkspace();
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);
  const [tripsAwaitingPod, setTripsAwaitingPod] = useState<Trip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [podTarget, setPodTarget] = useState<Trip | null>(null);

  useEffect(() => {
    if (!activeOrg) return;
    const unsub = deliveriesRepo.subscribe(
      activeOrg.id,
      { environment: "LIVE", orderByField: "createdAt", orderDirection: "desc" },
      setDeliveries,
      (err) => setError(err.message)
    );
    return () => unsub();
  }, [activeOrg]);

  useEffect(() => {
    if (!activeOrg) return;
    tripsRepo
      .list(activeOrg.id, { environment: "LIVE" })
      .then(async (trips) => {
        const completed = trips.filter((t) => t.status === "completed" || t.status === "unloading");
        const existing = await deliveriesRepo.list(activeOrg.id, { environment: "LIVE" });
        const tripsWithPod = new Set(existing.map((d) => d.tripId));
        setTripsAwaitingPod(completed.filter((t) => !tripsWithPod.has(t.id)));
      })
      .catch(() => {});
  }, [activeOrg, deliveries]);

  if (!activeOrg) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-50">Deliveries &amp; POD</h1>
        <p className="mt-1 text-sm text-slate-400">Confirm delivery and attach proof of delivery.</p>
      </header>

      {error && <div className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">{error}</div>}

      {tripsAwaitingPod.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Awaiting proof of delivery</h2>
          <div className="space-y-2">
            {tripsAwaitingPod.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-amber-900/40 bg-amber-950/10 p-3">
                <span className="text-sm text-slate-200">
                  {t.jobNumber} · {t.truckRegistration} · {t.driverName}
                </span>
                <button
                  onClick={() => setPodTarget(t)}
                  className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
                >
                  Capture POD
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
            <p className="mt-1 text-sm text-slate-500">Completed trips will appear above for POD capture.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Trip</th>
                  <th className="px-4 py-3 font-medium">Received by</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">POD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950">
                {deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-900/60">
                    <td className="px-4 py-3 text-slate-300">{d.tripId.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-slate-300">{d.receivedByName || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_STYLE[d.status]}`}>{d.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {d.podFileUrl ? (
                        <a href={d.podFileUrl} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
                          View file
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {podTarget && (
        <PodCaptureDialog orgId={activeOrg.id} trip={podTarget} onClose={() => setPodTarget(null)} onSaved={() => setPodTarget(null)} />
      )}
    </div>
  );
}

function PodCaptureDialog({ orgId, trip, onClose, onSaved }: { orgId: string; trip: Trip; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [receivedByName, setReceivedByName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<DeliveryStatus>("delivered");
  const [exceptionReason, setExceptionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user) return;
    if (status === "delivered" && !receivedByName.trim()) {
      setError("Enter who received the delivery.");
      return;
    }
    if (status === "exception" && !exceptionReason.trim()) {
      setError("Describe the exception.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let podFileUrl: string | null = null;
      if (file) {
        podFileUrl = await uploadPodFile(orgId, trip.id, file);
      }
      const payload: Omit<Delivery, keyof BaseRecord> = {
        tripId: trip.id,
        jobId: trip.jobId,
        status,
        deliveredAt: status === "pending" ? null : Timestamp.now(),
        receivedByName: receivedByName.trim(),
        podFileUrl,
        signatureUrl: null,
        exceptionReason: status === "exception" ? exceptionReason.trim() : null,
      };
      await deliveriesRepo.create(orgId, user.uid, payload, "LIVE");
      if (trip.status !== "completed") {
        await tripsRepo.update(orgId, user.uid, trip.id, {
          status: status === "exception" ? "exception" : "completed",
          actualEnd: Timestamp.now(),
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save delivery.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-50">Capture POD — {trip.jobNumber}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Outcome</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as DeliveryStatus)} className="input">
              <option value="delivered">Delivered</option>
              <option value="partial">Partial delivery</option>
              <option value="exception">Exception</option>
            </select>
          </label>

          {status !== "exception" && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-400">Received by *</span>
              <input value={receivedByName} onChange={(e) => setReceivedByName(e.target.value)} className="input" />
            </label>
          )}

          {status === "exception" && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-400">Exception reason *</span>
              <textarea
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                rows={3}
                className="input"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">POD file (photo or PDF)</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:text-slate-200"
            />
          </label>

          {error && <div className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save delivery"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-md bg-slate-900" />
      ))}
    </div>
  );
}
