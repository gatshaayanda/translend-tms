"use client";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { deliveryNotesRepo, invoicesRepo } from "@/lib/firebase/modules";
import type { DeliveryNote } from "@/types/core";
import type { Invoice } from "@/types/finance";

export default function DocumentRegister() {
  const { activeOrg } = useWorkspace();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notes, setNotes] = useState<DeliveryNote[]>([]);
  useEffect(() => {
    if (!activeOrg) return;
    const q = { environment: "LIVE" as const };
    const a = invoicesRepo.subscribe(activeOrg.id, q, setInvoices);
    const b = deliveryNotesRepo.subscribe(activeOrg.id, q, setNotes);
    return () => { a(); b(); };
  }, [activeOrg]);
  if (!activeOrg) return null;
  return <section className="section grid-2">
    <div className="form-card"><h3>Canonical Tax Invoices</h3><p className="muted">Print the live invoice, Delivery Note and POD-linked financial record.</p>{invoices.slice(0, 12).map(i => <div className="list-row" key={i.id}><div><strong>{i.invoiceNumber}</strong><div className="muted">{i.customerName} · {i.currency} {i.amount.toLocaleString()} · {i.status}</div></div><a className="btn-secondary" href={`/${activeOrg.id}/documents/invoice/${i.id}`}>Print</a></div>)}{invoices.length===0&&<div className="muted">No live invoices yet.</div>}</div>
    <div className="form-card"><h3>Canonical Delivery Notes</h3><p className="muted">Print the operational delivery document linked to the live Job, Trip and POD.</p>{notes.slice(0, 12).map(n => <div className="list-row" key={n.id}><div><strong>{n.noteReference}</strong><div className="muted">{n.customerName} · {n.vehicleRegistration} · {n.podState}</div></div><a className="btn-secondary" href={`/${activeOrg.id}/documents/delivery-note/${n.id}`}>Print</a></div>)}{notes.length===0&&<div className="muted">No live Delivery Notes yet.</div>}</div>
  </section>;
}
