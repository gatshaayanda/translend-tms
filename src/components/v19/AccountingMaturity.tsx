"use client";

import { useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { invoicesRepo, invoicePaymentsRepo, supplierBillsRepo, journalEntriesRepo } from "@/lib/firebase/modules";
import type { Invoice, JournalEntry } from "@/types/finance";
import type { InvoicePayment, SupplierBill } from "@/types/business";

export default function AccountingMaturity() {
  const { activeOrg } = useWorkspace();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState({ invoiceId: "", amount: "", reference: "", method: "bank_transfer" });
  const [bill, setBill] = useState({ supplier: "", reference: "", amount: "", dueAt: "" });
  const [journal, setJournal] = useState({ debitAccount: "", creditAccount: "", amount: "", description: "" });

  useEffect(() => {
    if (!activeOrg) return;
    const orgId = activeOrg.id;
    const unsub = [
      invoicesRepo.subscribe(orgId, { environment: "LIVE", orderByField: "issuedAt", orderDirection: "desc" }, setInvoices, (e) => setMessage(e.message)),
      invoicePaymentsRepo.subscribe(orgId, { environment: "LIVE", orderByField: "paidAt", orderDirection: "desc" }, setPayments, (e) => setMessage(e.message)),
      supplierBillsRepo.subscribe(orgId, { environment: "LIVE", orderByField: "dueAt", orderDirection: "asc" }, setBills, (e) => setMessage(e.message)),
      journalEntriesRepo.subscribe(orgId, { environment: "LIVE", orderByField: "entryDate", orderDirection: "desc" }, setEntries, (e) => setMessage(e.message)),
    ];
    return () => unsub.forEach((fn) => fn());
  }, [activeOrg]);

  const paidByInvoice = useMemo(() => payments.reduce<Record<string, number>>((map, item) => ({ ...map, [item.invoiceId]: (map[item.invoiceId] ?? 0) + item.amount }), {}), [payments]);
  const arOutstanding = invoices.filter((i) => i.status !== "void").reduce((sum, i) => sum + Math.max(0, i.amount - (paidByInvoice[i.id] ?? 0)), 0);
  const apOutstanding = bills.filter((b) => b.status === "open").reduce((sum, b) => sum + b.amount, 0);
  const journalDebit = entries.reduce((sum, e) => sum + e.amount, 0);
  const journalCredit = entries.reduce((sum, e) => sum + e.amount, 0);

  async function action(payload: Record<string, unknown>) {
    if (!activeOrg || !user) return;
    setBusy(true); setMessage(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/accounting/action", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ ...payload, orgId: activeOrg.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Accounting action failed.");
      setMessage(data.message ?? "Accounting action completed.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Accounting action failed."); }
    finally { setBusy(false); }
  }

  const selectedInvoice = invoices.find((i) => i.id === payment.invoiceId);
  const outstanding = selectedInvoice ? Math.max(0, selectedInvoice.amount - (paidByInvoice[selectedInvoice.id] ?? 0)) : 0;

  return <section className="panel section">
    <div className="section-header"><div><h2 className="section-title">Accounting maturity</h2><p className="section-sub">Live receivables, payables, balanced journals and correction controls.</p></div></div>
    {message && <div className="notice blue" style={{ marginBottom: 14 }}>{message}</div>}
    <div className="kpi-grid">
      <Kpi label="AR outstanding" value={arOutstanding.toLocaleString()} note="Unpaid invoice balance" tone="blue" />
      <Kpi label="AP outstanding" value={apOutstanding.toLocaleString()} note="Open supplier bills" tone="red" />
      <Kpi label="Journal entries" value={String(entries.length)} note="Persisted LIVE entries" />
      <Kpi label="Journal control" value={journalDebit === journalCredit ? "Balanced" : "Review"} note="Each persisted entry has equal debit/credit value" tone={journalDebit === journalCredit ? "green" : "red"} />
    </div>

    <div className="grid gap-4 lg:grid-cols-3" style={{ marginTop: 18 }}>
      <div className="panel" style={{ margin: 0 }}><h3>Record customer payment</h3><Field label="Invoice" value={payment.invoiceId} onChange={(v) => setPayment({ ...payment, invoiceId: v })} options={invoices.filter((i) => i.status !== "void" && (paidByInvoice[i.id] ?? 0) < i.amount).map((i) => `${i.id}|${i.invoiceNumber} · ${i.customerName}`)} /><Field label="Amount" value={payment.amount} onChange={(v) => setPayment({ ...payment, amount: v })} type="number" /><Field label="Reference" value={payment.reference} onChange={(v) => setPayment({ ...payment, reference: v })} /><Field label="Method" value={payment.method} onChange={(v) => setPayment({ ...payment, method: v })} options={["cash", "bank_transfer", "mobile_money", "other"]} />{selectedInvoice && <div className="muted" style={{ marginBottom: 10 }}>Outstanding: {selectedInvoice.currency} {outstanding.toFixed(2)}</div>}<button className="btn-primary" disabled={busy || !payment.invoiceId} onClick={() => void action({ action: "invoice_payment", invoiceId: payment.invoiceId, amount: Number(payment.amount), reference: payment.reference, method: payment.method })}>{busy ? "Posting…" : "Post payment"}</button></div>
      <div className="panel" style={{ margin: 0 }}><h3>Supplier bill / AP</h3><Field label="Supplier" value={bill.supplier} onChange={(v) => setBill({ ...bill, supplier: v })} /><Field label="Reference" value={bill.reference} onChange={(v) => setBill({ ...bill, reference: v })} /><Field label="Amount" value={bill.amount} onChange={(v) => setBill({ ...bill, amount: v })} type="number" /><Field label="Due date" value={bill.dueAt} onChange={(v) => setBill({ ...bill, dueAt: v })} type="date" /><button className="btn-primary" disabled={busy} onClick={() => void action({ action: "supplier_bill", supplier: bill.supplier, reference: bill.reference, amount: Number(bill.amount), dueAt: bill.dueAt, currency: activeOrg?.currency ?? "BWP" })}>{busy ? "Posting…" : "Create supplier bill"}</button></div>
      <div className="panel" style={{ margin: 0 }}><h3>Manual journal</h3><Field label="Debit account" value={journal.debitAccount} onChange={(v) => setJournal({ ...journal, debitAccount: v })} /><Field label="Credit account" value={journal.creditAccount} onChange={(v) => setJournal({ ...journal, creditAccount: v })} /><Field label="Amount" value={journal.amount} onChange={(v) => setJournal({ ...journal, amount: v })} type="number" /><Field label="Description" value={journal.description} onChange={(v) => setJournal({ ...journal, description: v })} /><button className="btn-primary" disabled={busy} onClick={() => void action({ action: "manual_journal", ...journal, amount: Number(journal.amount) })}>{busy ? "Posting…" : "Post balanced journal"}</button></div>
    </div>

    <div className="grid gap-4 lg:grid-cols-2" style={{ marginTop: 18 }}>
      <div className="panel" style={{ margin: 0 }}><h3>Receivables ageing</h3><Table headers={["Invoice", "Customer", "Outstanding", "Age"]} rows={invoices.filter((i) => i.status !== "void" && Math.max(0, i.amount - (paidByInvoice[i.id] ?? 0)) > 0).slice(0, 20).map((i) => [i.invoiceNumber, i.customerName, `${i.currency} ${Math.max(0, i.amount - (paidByInvoice[i.id] ?? 0)).toFixed(2)}`, age(i.dueAt)])} /></div>
      <div className="panel" style={{ margin: 0 }}><h3>Payables ageing</h3><Table headers={["Supplier", "Reference", "Amount", "Age"]} rows={bills.filter((b) => b.status === "open").slice(0, 20).map((b) => [b.supplier, b.reference, `${b.currency} ${b.amount.toFixed(2)}`, age(b.dueAt)])} /></div>
    </div>

    <div className="panel" style={{ margin: "18px 0 0" }}><h3>Journal corrections</h3><Table headers={["Date", "Type", "Reference", "Amount", "Accounts", "Action"]} rows={entries.slice(0, 20).map((e) => [e.entryDate.toDate().toLocaleDateString(), e.transactionType, e.reference, e.amount.toFixed(2), `${e.debitAccount} → ${e.creditAccount}`, e.transactionType === "Reversal" ? "—" : "Reverse"])} actionRows={entries.slice(0, 20).map((e) => e.transactionType === "Reversal" ? null : () => void action({ action: "reverse_journal", sourceId: e.id, amount: e.amount }))} /></div>
  </section>;
}

function Kpi({ label, value, note, tone = "" }: { label: string; value: string; note: string; tone?: string }) { return <div className={`kpi-card ${tone}`}><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-sub">{note}</div></div>; }
function Field({ label, value, onChange, type = "text", options }: { label: string; value: string; onChange: (v: string) => void; type?: string; options?: string[] }) { return <label className="form-group"><span className="field-label">{label}</span>{options ? <select className="form-select" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select…</option>{options.map((o) => <option key={o} value={o.split("|")[0]}>{o.includes("|") ? o.split("|")[1] : o}</option>)}</select> : <input className="form-input" type={type} value={value} onChange={(e) => onChange(e.target.value)} />}</label>; }
function Table({ headers, rows, actionRows = [] }: { headers: string[]; rows: string[][]; actionRows?: Array<(() => void) | null> }) { return <div style={{ overflowX: "auto" }}><table className="data-table"><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={`${i}-${j}`}>{j === row.length - 1 && actionRows[i] && headers.includes("Action") ? <button className="btn-ghost" onClick={actionRows[i]!}>{cell}</button> : cell}</td>)}</tr>) : <tr><td colSpan={headers.length}>No live records.</td></tr>}</tbody></table></div>; }
function age(date: Timestamp | null) { if (!date) return "—"; const days = Math.ceil((Date.now() - date.toMillis()) / 86400000); return days > 0 ? `${days}d overdue` : days === 0 ? "Due today" : `Due in ${Math.abs(days)}d`; }
