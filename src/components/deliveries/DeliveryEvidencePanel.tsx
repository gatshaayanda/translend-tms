"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { deliveryNotesRepo } from "@/lib/firebase/modules";
import { uploadDeliveryEvidence, type DeliveryEvidenceKind } from "@/lib/uploadthing/client";
import { enqueueDeliveryEvidenceUpload, flushPendingDeliveryEvidenceUploads, listPendingDeliveryEvidenceUploads, removePendingDeliveryEvidenceUpload, type PendingDeliveryEvidenceUpload } from "@/lib/uploadthing/evidenceQueue";
import type { DeliveryEvidenceRef, DeliveryNote } from "@/types/core";

const KINDS: Array<{ value: DeliveryEvidenceKind; label: string }> = [
  { value: "pod", label: "POD" }, { value: "photo", label: "Photo" }, { value: "document", label: "Document" }, { value: "other", label: "Other" },
];
const REVIEW_ROLES = new Set(["owner", "operations_manager", "dispatcher", "fleet_manager"]);

export function DeliveryEvidencePanel({ orgId, note, onSaved, onError }: { orgId: string; note: DeliveryNote; onSaved: (note: DeliveryNote) => void; onError: (message: string) => void }) {
  const { user } = useAuth();
  const { activeMembership } = useWorkspace();
  const [kind, setKind] = useState<DeliveryEvidenceKind>("pod");
  const [replaceId, setReplaceId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [retryFile, setRetryFile] = useState<File | null>(null);
  const [queuedItems, setQueuedItems] = useState<PendingDeliveryEvidenceUpload[]>([]);
  const canReview = Boolean(activeMembership?.role && REVIEW_ROLES.has(activeMembership.role));
  const activeRefs = note.evidenceRefs.filter((item) => (item.status ?? "active") !== "replaced");

  const refreshQueue = async () => {
    if (!user) return;
    try { setQueuedItems((await listPendingDeliveryEvidenceUploads(user.uid)).filter((item) => item.orgId === orgId && item.deliveryNoteId === note.id)); } catch { setQueuedItems([]); }
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const flush = async () => {
      try {
        const result = await flushPendingDeliveryEvidenceUploads(user);
        if (!cancelled && result.completed > 0) {
          const updated = await deliveryNotesRepo.getById(orgId, note.id);
          if (updated) onSaved(updated);
        }
        if (!cancelled) await refreshQueue();
      } catch { if (!cancelled) await refreshQueue(); }
    };
    void flush();
    const handleOnline = () => void flush();
    window.addEventListener("online", handleOnline);
    return () => { cancelled = true; window.removeEventListener("online", handleOnline); };
  }, [user, orgId, note.id]);

  const queueUpload = async (file: File) => {
    if (!user) return onError("You must be signed in to upload evidence.");
    try {
      await enqueueDeliveryEvidenceUpload({ uid: user.uid, orgId, deliveryId: note.deliveryId, deliveryNoteId: note.id, kind, fileName: file.name, fileType: file.type || "application/octet-stream", file, ...(replaceId ? { replacesEvidenceId: replaceId } : {}) });
      setReplaceId(""); setRetryFile(null); await refreshQueue();
      onError("You are offline. The evidence is saved on this device and will retry automatically when the connection returns.");
    } catch (err) { onError(err instanceof Error ? err.message : "Could not save the evidence for offline retry."); }
  };

  const upload = async (file: File) => {
    if (!user) return onError("You must be signed in to upload evidence.");
    if (file.size > 8 * 1024 * 1024) return onError("Evidence files must be 8MB or smaller.");
    const isImage = file.type.startsWith("image/"); const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) return onError("Only images and PDF documents are accepted for delivery evidence.");
    if (typeof navigator !== "undefined" && !navigator.onLine) return void queueUpload(file);
    setUploading(true);
    try {
      await uploadDeliveryEvidence({ user, orgId, deliveryId: note.deliveryId, deliveryNoteId: note.id, kind, file, ...(replaceId ? { replacesEvidenceId: replaceId } : {}) });
      const updated = await deliveryNotesRepo.getById(orgId, note.id);
      if (!updated) throw new Error("Evidence uploaded but the Delivery Note could not be reloaded.");
      setReplaceId(""); setRetryFile(null); onSaved(updated); await refreshQueue();
    } catch (err) { setRetryFile(file); onError(err instanceof Error ? err.message : "Failed to upload delivery evidence. The file is retained here so you can retry."); }
    finally { setUploading(false); }
  };

  const retryQueued = async (item: PendingDeliveryEvidenceUpload) => {
    if (!user || (typeof navigator !== "undefined" && !navigator.onLine)) return;
    setUploading(true);
    try {
      const file = new File([item.file], item.fileName, { type: item.fileType });
      await uploadDeliveryEvidence({ user, orgId: item.orgId, deliveryId: item.deliveryId, deliveryNoteId: item.deliveryNoteId, kind: item.kind, file, ...(item.replacesEvidenceId ? { replacesEvidenceId: item.replacesEvidenceId } : {}) });
      await removePendingDeliveryEvidenceUpload(item.id);
      const updated = await deliveryNotesRepo.getById(orgId, note.id); if (updated) onSaved(updated);
      await refreshQueue();
    } catch (err) { onError(err instanceof Error ? err.message : "Queued evidence upload failed. It remains queued for another retry."); }
    finally { setUploading(false); }
  };

  const openEvidence = async (evidence: DeliveryEvidenceRef) => {
    if (!user) return onError("You must be signed in to view evidence.");
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams({ orgId, deliveryId: note.deliveryId, deliveryNoteId: note.id, evidenceId: evidence.id });
      const response = await fetch(`/api/deliveries/evidence?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error ?? "Evidence could not be opened."); }
      const blob = await response.blob(); const objectUrl = URL.createObjectURL(blob); window.open(objectUrl, "_blank", "noopener,noreferrer"); window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err) { onError(err instanceof Error ? err.message : "Evidence could not be opened. Please retry."); }
  };

  const review = async (evidence: DeliveryEvidenceRef, action: "approve_evidence" | "reject_evidence") => {
    if (!user) return onError("You must be signed in to review evidence.");
    const rejectionReason = action === "reject_evidence" ? window.prompt("Why is this evidence being rejected?")?.trim() ?? "" : "";
    if (action === "reject_evidence" && !rejectionReason) return onError("A rejection reason is required.");
    setReviewing(evidence.id);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/deliveries/workflow-action", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ orgId, deliveryId: note.deliveryId, deliveryNoteId: note.id, evidenceId: evidence.id, action, rejectionReason }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Evidence review failed.");
      const updated = await deliveryNotesRepo.getById(orgId, note.id); if (!updated) throw new Error("Evidence was reviewed but the Delivery Note could not be reloaded."); onSaved(updated);
    } catch (err) { onError(err instanceof Error ? err.message : "Evidence review failed."); } finally { setReviewing(null); }
  };

  return <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-sm font-semibold text-slate-200">Evidence / POD</h3><p className="mt-0.5 text-xs text-slate-500">Upload images or PDFs. POD evidence is required before a delivery can be completed.</p></div><span className="text-xs text-slate-500">State: <strong className="text-slate-300">{note.podState.replace("_", " ")}</strong></span></div>
    <div className="mt-3 grid gap-2 md:grid-cols-[150px_1fr_220px]"><select className="input" value={kind} onChange={(event) => setKind(event.target.value as DeliveryEvidenceKind)} disabled={uploading}>{KINDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-900">{uploading ? "Uploading…" : "Choose image or PDF"}<input className="sr-only" type="file" accept="image/*,application/pdf" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) void upload(file); }} /></label><select className="input" value={replaceId} onChange={(event) => setReplaceId(event.target.value)} disabled={uploading || activeRefs.length === 0}><option value="">New evidence</option>{activeRefs.filter((item) => item.kind === kind).map((item) => <option key={item.id} value={item.id}>Replace v{item.version ?? 1} · {item.kind.toUpperCase()}</option>)}</select></div>
    {queuedItems.length > 0 && <div className="mt-2 space-y-1 rounded-md border border-sky-900/50 bg-sky-950/20 px-3 py-2 text-xs text-sky-200"><p>{queuedItems.length} evidence upload{queuedItems.length === 1 ? "" : "s"} waiting on this device.</p>{queuedItems.map((item) => <div key={item.id} className="flex items-center justify-between gap-2"><span className="truncate text-sky-200/70">{item.kind.toUpperCase()} · {item.fileName}</span><button disabled={uploading} onClick={() => void retryQueued(item)} className="shrink-0 font-medium hover:underline disabled:opacity-50">Retry</button></div>)}</div>}
    {retryFile && <div className="mt-2 flex items-center justify-between rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-xs text-amber-200"><span>Upload failed. The selected file is ready to retry.</span><button disabled={uploading} onClick={() => void upload(retryFile)} className="font-medium hover:underline disabled:opacity-50">Retry upload</button></div>}
    <div className="mt-3 space-y-2">{note.evidenceRefs.length === 0 ? <p className="text-xs text-slate-600">No evidence uploaded yet.</p> : note.evidenceRefs.map((evidence: DeliveryEvidenceRef) => <div key={evidence.id} className="flex flex-col gap-2 rounded-md border border-slate-800 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"><button onClick={() => void openEvidence(evidence)} className="min-w-0 truncate text-left text-slate-300 hover:text-sky-300">{evidence.kind.toUpperCase()} · v{evidence.version ?? 1} · {evidence.status ?? "active"}{evidence.required ? " · required" : ""}</button>{canReview && (evidence.status ?? "active") !== "replaced" && <div className="flex shrink-0 gap-2"><button disabled={reviewing === evidence.id} onClick={() => void review(evidence, "approve_evidence")} className="text-emerald-300 hover:text-emerald-200 disabled:opacity-50">Approve</button><button disabled={reviewing === evidence.id} onClick={() => void review(evidence, "reject_evidence")} className="text-red-300 hover:text-red-200 disabled:opacity-50">Reject</button></div>}</div>)}</div>
  </section>;
}

export type { User };
