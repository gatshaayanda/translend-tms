"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { invoicesRepo } from "@/lib/firebase/modules";
import type { Invoice } from "@/types/finance";

export default function CreditDebitNotesPage() {
  const { activeOrg } = useWorkspace();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceId, setInvoiceId] = useState("");
  const [noteType, setNoteType] = useState("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!activeOrg) return;
    return invoicesRepo.subscribe(activeOrg.id, { environment: "LIVE" }, setInvoices);
  }, [activeOrg]);

  const issue = async () => {
    if (!activeOrg || !user || !invoiceId || !reason.trim() || !amount) { setMessage("Select an invoice, enter an amount and provide a reason."); return; }
    setBusy(true); setMessage(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/accounting/invoice-adjustment", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ orgId: activeOrg.id, invoiceId, noteType, amount: Number(amount), reason: reason.trim() }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(String(payload.error ?? "Could not issue adjustment."));
      setMessage(payload.message); setAmount(""); setReason("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not issue adjustment."); }
    finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <header className="page-header"><div><h1 className="page-title">Credit & Debit Notes</h1><p className="page-subtitle">Controlled invoice adjustments without rewriting issued invoices.</p></div><span className="badge green">LIVE DATA</span></header>
    {message && <div className="notice blue">{message}</div>}
    <div className="notice blue">Adjustments are separate authoritative documents. Issued invoices remain immutable; each note creates its own journal posting and audit record.</div>
    <section className="grid-2 section">
      <div className="form-card">
        <h3>Issue adjustment</h3>
        <label className="form-group"><span className="field-label">Invoice</span><select className="form-select" value={invoiceId} onChange={e => setInvoiceId(e.target.value)}><option value="">Select invoice…</option>{invoices.filter(i => i.status !== "void").map(i => <option key={i.id} value={i.id}>{i.invoiceNumber} · {i.customerName} · {i.currency} {i.amount.toLocaleString()}</option>)}</select></label>
        <label className="form-group"><span className="field-label">Note type</span><select className="form-select" value={noteType} onChange={e => setNoteType(e.target.value)}><option value="credit">Credit note</option><option value="debit">Debit note</option></select></label>
        <label className="form-group"><span className="field-label">Amount</span><input className="form-input" type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <label className="form-group"><span className="field-label">Reason</span><textarea className="form-input" rows={4} value={reason} onChange={e => setReason(e.target.value)} placeholder="Describe the correction or adjustment" /></label>
        <button className="btn-primary" type="button" disabled={busy} onClick={issue}>{busy ? "Issuing…" : `Issue ${noteType === "credit" ? "Credit" : "Debit"} Note`}</button>
      </div>
      <div className="panel">
        <h3>Adjustment control</h3>
        <p className="panel-sub">Credit notes reduce the receivable/revenue position. Debit notes increase it. Both are posted separately from the original invoice so the customer-facing invoice history remains traceable.</p>
        <div className="kpi-grid"><div className="kpi-card blue"><div className="kpi-label">Invoices</div><div className="kpi-value">{invoices.length}</div><div className="kpi-sub">Live invoice records</div></div><div className="kpi-card green"><div className="kpi-label">Currency</div><div className="kpi-value">{activeOrg?.currency ?? "BWP"}</div><div className="kpi-sub">Workspace currency</div></div></div>
      </div>
    </section>
  </div>;
}
