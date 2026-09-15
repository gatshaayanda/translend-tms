"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { customersRepo, deliveryNotesRepo, driversRepo, invoicesRepo, jobsRepo, trucksRepo, tripsRepo } from "@/lib/firebase/modules";
import type { Customer, DeliveryNote, Driver, Job, Truck, Trip } from "@/types/core";
import type { Invoice } from "@/types/finance";

type Props = { kind: "invoice" | "delivery-note"; recordId: string };
type Related = { invoice?: Invoice | null; note?: DeliveryNote | null; customer?: Customer | null; job?: Job | null; trip?: Trip | null; truck?: Truck | null; driver?: Driver | null };

const money = (currency: string, value: number) => `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateTime = (value: any) => value?.toDate ? value.toDate().toLocaleString() : "—";
const dateOnly = (value: any) => value?.toDate ? value.toDate().toLocaleDateString() : "—";

export default function PrintableDocument({ kind, recordId }: Props) {
  const { activeOrg } = useWorkspace();
  const { user } = useAuth();
  const [data, setData] = useState<Related>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrg || !user || !recordId) return;
    let cancelled = false;
    const load = async () => {
      try {
        setError(null);
        if (kind === "invoice") {
          const invoice = await invoicesRepo.getById(activeOrg.id, recordId);
          if (!invoice) throw new Error("Invoice not found in this workspace.");
          const [note, customer, job] = await Promise.all([
            deliveryNotesRepo.getById(activeOrg.id, invoice.deliveryNoteId),
            customersRepo.getById(activeOrg.id, invoice.customerId),
            jobsRepo.getById(activeOrg.id, invoice.jobId),
          ]);
          const [trip, truck, driver] = note ? await Promise.all([
            tripsRepo.getById(activeOrg.id, note.tripId),
            trucksRepo.getById(activeOrg.id, note.vehicleRegistration ? (await tripsRepo.getById(activeOrg.id, note.tripId))?.truckId ?? "" : ""),
            driversRepo.getById(activeOrg.id, note.driverId),
          ]) : [null, null, null];
          if (!cancelled) setData({ invoice, note, customer, job, trip, truck, driver });
        } else {
          const note = await deliveryNotesRepo.getById(activeOrg.id, recordId);
          if (!note) throw new Error("Delivery Note not found in this workspace.");
          const [customer, job, trip, driver] = await Promise.all([
            customersRepo.list(activeOrg.id, { environment: "LIVE", extra: [] }).then(items => items.find(item => item.name === note.customerName) ?? null),
            jobsRepo.getById(activeOrg.id, note.jobId),
            tripsRepo.getById(activeOrg.id, note.tripId),
            driversRepo.getById(activeOrg.id, note.driverId),
          ]);
          const truck = trip ? await trucksRepo.getById(activeOrg.id, trip.truckId) : null;
          if (!cancelled) setData({ note, customer, job, trip, truck, driver });
        }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Document could not be loaded."); }
    };
    void load();
    return () => { cancelled = true; };
  }, [activeOrg, user, kind, recordId]);

  if (!activeOrg || !user) return null;
  if (error) return <main className="document-shell"><div className="document-error"><h1>Document unavailable</h1><p>{error}</p></div></main>;
  if (kind === "invoice" && !data.invoice) return <main className="document-shell"><div className="document-error">Loading Tax Invoice…</div></main>;
  if (kind === "delivery-note" && !data.note) return <main className="document-shell"><div className="document-error">Loading Delivery Note…</div></main>;

  return kind === "invoice" ? <InvoiceDocument data={data} org={activeOrg} /> : <DeliveryNoteDocument data={data} org={activeOrg} />;
}

function InvoiceDocument({ data, org }: { data: Related; org: any }) {
  const invoice = data.invoice!;
  const note = data.note;
  const job = data.job;
  const customer = data.customer;
  const currency = invoice.currency || org.currency || "BWP";
  const amount = Number(invoice.amount || 0);
  const quantity = note?.materialLines?.reduce((sum, line) => sum + Number(line.quantity || 0), 0) || 1;
  const unit = quantity > 0 ? amount / quantity : amount;
  return <main className="document-shell">
    <div className="document-actions"><button className="btn-primary" onClick={() => window.print()}>Print / Save PDF</button><a className="btn-secondary" href={`/${org.id}/business-controls`}>Back to Business Controls</a></div>
    <article className="print-page">
      <header className="doc-header"><div><div className="doc-brand">TRANSLEND</div><h1>TAX INVOICE</h1><div className="doc-muted">Translend Proprietary Limited</div><div className="doc-muted">{org.country || "Botswana"}</div></div><div className="doc-meta"><strong>{invoice.invoiceNumber}</strong><span>Invoice date: {dateOnly(invoice.issuedAt)}</span><span>Due: {dateOnly(invoice.dueAt)}</span><span>Currency: {currency}</span></div></header>
      <section className="doc-grid"><div><h3>Bill To</h3><strong>{customer?.name || invoice.customerName}</strong><div>{customer?.billingAddress || "Address on customer record not configured."}</div><div>{customer?.contactName || ""}</div><div>{customer?.contactEmail || ""}</div><div>{customer?.contactPhone || ""}</div></div><div><h3>Reference</h3><div>Client PO: {note?.orderReference || "—"}</div><div>Delivery Note: {note?.noteReference || invoice.deliveryNoteId}</div><div>Job: {job?.jobNumber || invoice.jobId}</div><div>Issued by: Translend</div></div></section>
      <table className="doc-table"><thead><tr><th>Date</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody><tr><td>{dateOnly(invoice.issuedAt)}</td><td>Transport / haulage services — {job?.origin || note?.loadingPoint || ""} to {job?.destination || note?.deliveryLocation || ""}<br/><span className="doc-muted">{job?.cargoDescription || note?.materialLines?.map(l => l.description).join(", ") || "Delivery service"}</span></td><td>{quantity.toLocaleString()}</td><td>{money(currency, unit)}</td><td>{money(currency, amount)}</td></tr></tbody></table>
      <section className="totals"><div><span>Subtotal</span><strong>{money(currency, amount)}</strong></div><div><span>VAT / tax</span><strong>Not separately configured</strong></div><div className="grand"><span>Total</span><strong>{money(currency, amount)}</strong></div></section>
      <section className="doc-notes"><h3>Invoice Notes & Terms</h3><ul><li>Claims, shortages, damages and delivery discrepancies should be raised within 48 hours of delivery.</li><li>Load measurement and quantity are based on the agreed loading / delivery measurement basis for the Job.</li><li>VAT or other tax treatment is governed by the workspace's authoritative tax configuration; this invoice record currently has no separate tax component.</li><li>Delivery acknowledgement should be confirmed by the site representative's signature and/or company stamp where applicable.</li><li>Vehicle registration and Delivery Note references form part of the supporting delivery record.</li><li>Payment terms: E.O.M. or the customer terms recorded on the live Customer account. Balance is due by the date above.</li></ul></section>
      <section className="bank-box"><h3>Payment / Bank Details</h3><div>Translend Proprietary Limited</div><div>Banking and remittance instructions: use the authoritative Translend finance instructions supplied to the customer. No bank account details are invented by this document.</div><div>Payment reference: <strong>{invoice.invoiceNumber}</strong></div></section>
      <footer className="doc-footer">This Tax Invoice is generated from the live Job, Delivery Note, POD and invoice record in the Translend workspace.</footer>
    </article>
    <style jsx global>{styles}</style>
  </main>;
}

function DeliveryNoteDocument({ data, org }: { data: Related; org: any }) {
  const note = data.note!;
  const currency = org.currency || "BWP";
  return <main className="document-shell">
    <div className="document-actions"><button className="btn-primary" onClick={() => window.print()}>Print / Save PDF</button><a className="btn-secondary" href={`/${org.id}/deliveries`}>Back to Deliveries</a></div>
    <article className="print-page">
      <header className="doc-header"><div><div className="doc-brand">TRANSLEND</div><h1>DELIVERY NOTE</h1><div className="doc-muted">Translend Proprietary Limited</div><div className="doc-muted">{org.country || "Botswana"}</div></div><div className="doc-meta"><strong>{note.noteReference}</strong><span>Date / time: {dateTime(note.noteDateTime)}</span><span>POD reference: {note.podReference || "—"}</span></div></header>
      <section className="doc-grid"><div><h3>Supplied To</h3><strong>{note.suppliedTo || note.customerName}</strong><div>{data.customer?.billingAddress || "Customer address on live record."}</div><div>{data.customer?.contactName || ""}</div><div>{data.customer?.contactPhone || ""}</div></div><div><h3>Delivery</h3><div>Location: {note.deliveryLocation || "—"}</div><div>Order / PO: {note.orderReference || "—"}</div><div>Job: {data.job?.jobNumber || note.jobId}</div><div>Vehicle: {note.vehicleRegistration || data.truck?.registrationNumber || "—"}</div><div>Driver: {note.driverName || data.driver?.fullName || "—"}</div><div>Loading point: {note.loadingPoint || data.job?.origin || "—"}</div></div></section>
      <table className="doc-table"><thead><tr><th>Material / Description</th><th>Expected</th><th>Delivered</th><th>Unit</th><th>Notes</th></tr></thead><tbody>{note.materialLines?.length ? note.materialLines.map(line => <tr key={line.id}><td>{line.description}{line.materialCode ? ` (${line.materialCode})` : ""}</td><td>{line.expectedQuantity ?? "—"}</td><td>{line.quantity}</td><td>{line.unit}</td><td>{line.notes || ""}</td></tr>) : <tr><td colSpan={5}>No material lines recorded.</td></tr>}</tbody></table>
      <section className="timing-grid"><div><strong>Arrival</strong><span>{dateTime(note.arrivalAt)}</span></div><div><strong>Departure</strong><span>{dateTime(note.departureAt)}</span></div><div><strong>POD state</strong><span>{note.podState}</span></div></section>
      <section className="signature-grid"><div><h3>Driver acknowledgement</h3><div className="signature-line">{note.acknowledgements?.find(a => a.role === "driver")?.name || note.driverName || ""}</div><span>Name / signature</span></div><div><h3>Foreman / receiver acknowledgement</h3><div className="signature-line">{note.receivedByName || note.acknowledgements?.find(a => a.role !== "driver")?.name || ""}</div><span>Name / signature / company stamp</span></div></section>
      <section className="doc-notes"><h3>Receipt / Discrepancy Notice</h3><p>Receiver should check the delivered material and quantity at the point of delivery. Any shortage, damage, wrong material or other discrepancy should be recorded on this Delivery Note before departure and supported by the POD/evidence record.</p><p>Received by: <strong>{note.receivedByName || "____________________________"}</strong> &nbsp; Contact: ____________________________</p></section>
      <footer className="doc-footer">This Delivery Note remains linked to the live Job, Trip and POD/evidence record. Currency context: {currency}.</footer>
    </article>
    <style jsx global>{styles}</style>
  </main>;
}

const styles = `
.document-shell{min-height:100vh;background:#f1f5f9;padding:24px;color:#0f172a}.document-actions{max-width:900px;margin:0 auto 16px;display:flex;gap:10px;justify-content:flex-end}.document-actions a{text-decoration:none}.print-page{max-width:900px;margin:0 auto;background:#fff;padding:42px 46px;box-shadow:0 8px 30px rgba(15,23,42,.08);min-height:1120px}.doc-header{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #0f172a;padding-bottom:20px;margin-bottom:26px}.doc-brand{font-weight:900;letter-spacing:.18em;font-size:22px}.doc-header h1{margin:8px 0 4px;font-size:30px;letter-spacing:.06em}.doc-muted{color:#64748b;font-size:13px}.doc-meta{display:grid;gap:5px;text-align:right;font-size:13px}.doc-meta strong{font-size:18px}.doc-grid{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-bottom:26px}.doc-grid h3,.doc-notes h3,.bank-box h3,.signature-grid h3{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin:0 0 7px}.doc-grid div{font-size:14px;line-height:1.55}.doc-table{width:100%;border-collapse:collapse;margin:18px 0}.doc-table th,.doc-table td{border:1px solid #cbd5e1;padding:10px 9px;text-align:left;font-size:13px;vertical-align:top}.doc-table th{background:#f8fafc;text-transform:uppercase;font-size:10px;letter-spacing:.06em}.doc-table th:nth-child(n+3),.doc-table td:nth-child(n+3){text-align:right}.totals{margin-left:auto;width:310px;display:grid;gap:8px;margin-top:18px}.totals>div{display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding:7px 0;font-size:13px}.totals .grand{font-size:17px;border-top:2px solid #0f172a;border-bottom:2px solid #0f172a;padding:10px 0}.doc-notes{margin-top:28px;border-top:1px solid #cbd5e1;padding-top:18px;font-size:12px;line-height:1.55}.doc-notes ul{margin:8px 0 0;padding-left:20px}.bank-box{margin-top:20px;border:1px solid #cbd5e1;padding:14px;font-size:12px;line-height:1.5}.doc-footer{margin-top:34px;padding-top:12px;border-top:1px solid #e2e8f0;color:#64748b;font-size:10px}.timing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:22px 0}.timing-grid>div{border:1px solid #cbd5e1;padding:12px;display:grid;gap:5px;font-size:12px}.signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:28px}.signature-line{min-height:45px;border-bottom:1px solid #0f172a;padding-top:24px;font-size:13px}.signature-grid span{font-size:10px;color:#64748b}.document-error{max-width:700px;margin:80px auto;background:#fff;padding:32px}.document-error h1{margin-top:0}@media(max-width:700px){.document-shell{padding:10px}.print-page{padding:24px 18px;min-height:auto}.doc-header,.doc-grid,.signature-grid{grid-template-columns:1fr;display:grid}.doc-meta{text-align:left}.timing-grid{grid-template-columns:1fr}.totals{width:100%}}@media print{.document-shell{padding:0;background:#fff}.document-actions{display:none}.print-page{box-shadow:none;max-width:none;margin:0;padding:12mm;min-height:0}.doc-header{break-inside:avoid}.doc-table{break-inside:auto}.doc-table tr{break-inside:avoid}.doc-notes,.bank-box,.signature-grid{break-inside:avoid}@page{size:A4;margin:0}}
`;
