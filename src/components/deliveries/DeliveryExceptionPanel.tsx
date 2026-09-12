"use client";

import { Timestamp } from "firebase/firestore";
import type { DeliveryException, DeliveryExceptionStatus } from "@/lib/firebase/modules";

type Props = {
  items: DeliveryException[];
  busy: boolean;
  userId: string;
  onUpdate: (exception: DeliveryException, patch: Partial<DeliveryException>) => Promise<void>;
};

export function DeliveryExceptionPanel({ items, busy, userId, onUpdate }: Props) {
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
                  defaultValue={exception.resolutionNotes ?? ""}
                  disabled={busy}
                  onBlur={(event) => {
                    const value = event.target.value.trim();
                    if (value !== (exception.resolutionNotes ?? "")) void onUpdate(exception, { resolutionNotes: value });
                  }}
                />
                <button
                  onClick={() => void onUpdate(exception, { status: "resolved", resolvedBy: userId, resolvedAt: Timestamp.now() })}
                  disabled={busy}
                  className="rounded-md border border-emerald-900/50 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-950/30 disabled:opacity-50"
                >
                  Resolve
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
