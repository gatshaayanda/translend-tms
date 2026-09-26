"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { deliveryNotesRepo, deliveriesRepo } from "@/lib/firebase/modules";
import { enqueueDriverAction, newDriverActionId } from "@/lib/offline/driverActionQueue";
import { DeliveryEvidencePanel } from "@/components/deliveries/DeliveryEvidencePanel";
import type { Delivery, DeliveryExceptionCategory, DeliveryNote } from "@/types/core";

const CATEGORIES: DeliveryExceptionCategory[] = ["shortage","damage","quantity_discrepancy","wrong_material","refused","site","vehicle","other"];

export function DriverDeliveryPanel({ orgId, tripId }: { orgId: string; tripId: string }) {
  const { user } = useAuth();
  const [note, setNote] = useState<DeliveryNote | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [receiver, setReceiver] = useState("");
  const [category, setCategory] = useState<DeliveryExceptionCategory>("other");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  const load = async () => {
    const [notes, deliveries] = await Promise.all([deliveryNotesRepo.list(orgId, { environment: "LIVE" }), deliveriesRepo.list(orgId, { environment: "LIVE" })]);
    const found = notes.find((item) => item.tripId === tripId) ?? null;
    setNote(found);
    setDelivery(found ? deliveries.find((item) => item.id === found.deliveryId) ?? null : null);
  };

  useEffect(() => { setOnline(navigator.onLine); const on = () => setOnline(true); const off = () => setOnline(false); window.addEventListener("online", on); window.addEventListener("offline", off); return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); }; }, []);
  useEffect(() => { void load().catch((e) => setMessage(e instanceof Error ? e.message : "Unable to load your delivery.")); }, [orgId, tripId]);

  const action = async (actionName: "arrive" | "depart" | "acknowledge" | "exception") => {
    if (!user || !note || !delivery || busy) return;
    setBusy(true); setMessage(null);
    const payload = {
      orgId, deliveryId: delivery.id, deliveryNoteId: note.id, action: actionName, idempotencyKey: newDriverActionId(),
      ...(actionName === "acknowledge" ? { name: receiver } : {}),
      ...(actionName === "exception" ? { category, description } : {}),
    };
    try {
      if (!navigator.onLine) {
        await enqueueDriverAction({ orgId, endpoint: "/api/driver/delivery-action", payload });
        setMessage("Saved offline. This delivery action will sync automatically when the connection returns.");
        if (actionName === "acknowledge") setReceiver("");
        if (actionName === "exception") setDescription("");
        return;
      }
      const token = await user.getIdToken();
      const response = await fetch("/api/driver/delivery-action", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Delivery update failed.");
      setDescription(""); await load(); setMessage("Delivery action recorded.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Delivery update failed."); } finally { setBusy(false); }
  };

  if (!note || !delivery) return <section className="panel"><h2 className="section-title">Delivery & POD</h2><p className="section-sub">No live delivery is linked to this trip yet.</p>{message && <div className="notice blue">{message}</div>}</section>;

  return <section className="panel space-y-4">
    <div><div className="flex flex-wrap items-center gap-2"><h2 className="section-title">Delivery & proof</h2><span className="badge">{online ? "ONLINE" : "OFFLINE"}</span></div><p className="section-sub">Work through arrival → receiver → evidence → departure. Offline actions and evidence stay on this device and sync when the connection returns.</p></div>
    {message && <div className="notice blue">{message}</div>}
    <div className="flex flex-wrap gap-2">
      {!note.arrivalAt && <button className="btn-primary" disabled={busy} onClick={() => void action("arrive")}>{busy ? "Saving…" : "Mark arrival"}</button>}
      {note.arrivalAt && !note.departureAt && <button className="btn-primary" disabled={busy} onClick={() => void action("depart")}>{busy ? "Saving…" : "Mark departure"}</button>}
    </div>
    <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><input aria-label="Receiver name" className="input" value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="Receiver name" disabled={busy}/><button className="btn-secondary" disabled={busy || !receiver.trim() || !note.arrivalAt} onClick={() => void action("acknowledge")}>Record receiver</button></div>
    <DeliveryEvidencePanel orgId={orgId} note={note} onSaved={(updated) => setNote(updated)} onError={setMessage} />
    <div className="grid gap-2 md:grid-cols-[180px_1fr_auto]"><select aria-label="Exception type" className="input" value={category} onChange={(e) => setCategory(e.target.value as DeliveryExceptionCategory)}>{CATEGORIES.map((value) => <option key={value} value={value}>{value.replaceAll("_"," ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>)}</select><input aria-label="Exception description" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe an exception"/><button className="btn-secondary" disabled={busy || !description.trim()} onClick={() => void action("exception")}>Report exception</button></div>
  </section>;
}
