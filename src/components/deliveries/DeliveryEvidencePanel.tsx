"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { deliveryNotesRepo } from "@/lib/firebase/modules";
import { uploadDeliveryEvidence, type DeliveryEvidenceKind } from "@/lib/uploadthing/client";
import type { DeliveryEvidenceRef, DeliveryNote } from "@/types/core";

const KINDS: Array<{ value: DeliveryEvidenceKind; label: string }> = [
  { value: "pod", label: "POD" }, { value: "photo", label: "Photo" }, { value: "document", label: "Document" }, { value: "other", label: "Other" },
];

export function DeliveryEvidencePanel({ orgId, note, onSaved, onError }: {
  orgId: string; note: DeliveryNote; onSaved: (note: DeliveryNote) => void; onError: (message: string) => void;
}) {
  const { user } = useAuth();
  const [kind, setKind] = useState<DeliveryEvidenceKind>("pod");
  const [replaceId, setReplaceId] = useState("");
  const [uploading, setUploading] = useState(false);

  const activeRefs = note.evidenceRefs.filter((item) => (item.status ?? "active") !== "replaced");
  const upload = async (file: File) => {
    if (!user) return onError("You must be signed in to upload evidence.");
    if (file.size > 8 * 1024 * 1024) return onError("Evidence files must be 8MB or smaller.");
    const isImage = file.type.startsWith("image/"); const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) return onError("Only images and PDF documents are accepted for delivery evidence.");
    setUploading(true);
    try {
      await uploadDeliveryEvidence({ user, orgId, deliveryId: note.deliveryId, deliveryNoteId: note.id, kind, file, ...(replaceId ? { replacesEvidenceId: replaceId } : {}) });
      const updated = await deliveryNotesRepo.getById(orgId, note.id);
      if (!updated) throw new Error("Evidence uploaded but the Delivery Note could not be reloaded.");
      setReplaceId(""); onSaved(updated);
    } catch (err) { onError(err instanceof Error ? err.message : "Failed to upload delivery evidence."); }
    finally { setUploading(false); }
  };

  return <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-sm font-semibold text-slate-200">Evidence / POD</h3><p className="mt-0.5 text-xs text-slate-500">Upload images or PDFs. POD evidence is required before a delivery can be completed.</p></div><span className="text-xs text-slate-500">State: <strong className="text-slate-300">{note.podState.replace("_", " ")}</strong></span></div>
    <div className="mt-3 grid gap-2 md:grid-cols-[150px_1fr_220px]">
      <select className="input" value={kind} onChange={(event) => setKind(event.target.value as DeliveryEvidenceKind)} disabled={uploading}>{KINDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
      <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-900">{uploading ? "Uploading…" : "Choose image or PDF"}<input className="sr-only" type="file" accept="image/*,application/pdf" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) void upload(file); }} /></label>
      <select className="input" value={replaceId} onChange={(event) => setReplaceId(event.target.value)} disabled={uploading || activeRefs.length === 0}><option value="">New evidence</option>{activeRefs.filter((item) => item.kind === kind).map((item) => <option key={item.id} value={item.id}>Replace v{item.version ?? 1} · {item.kind.toUpperCase()}</option>)}</select>
    </div>
    <div className="mt-3 space-y-2">{note.evidenceRefs.length === 0 ? <p className="text-xs text-slate-600">No evidence uploaded yet.</p> : note.evidenceRefs.map((evidence: DeliveryEvidenceRef) => <a key={evidence.id} href={evidence.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-md border border-slate-800 px-3 py-2 text-xs hover:bg-slate-900"><span className="truncate text-slate-300">{evidence.kind.toUpperCase()} · v{evidence.version ?? 1} · {evidence.status ?? "active"}{evidence.required ? " · required" : ""}</span><span className="ml-3 shrink-0 text-sky-400">Open</span></a>)}</div>
  </section>;
}
