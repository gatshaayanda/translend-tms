"use client";

import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { accountingPeriodsRepo, chartAccountsRepo } from "@/lib/firebase/modules";
import type { AccountingPeriod, ChartAccount } from "@/types/business";

const CATEGORIES: ChartAccount["category"][] = ["asset", "liability", "equity", "revenue", "expense"];

export default function AccountingControls() {
  const { activeOrg } = useWorkspace();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [account, setAccount] = useState({ code: "", name: "", category: "expense" as ChartAccount["category"] });
  const [period, setPeriod] = useState({ name: "", startsAt: "", endsAt: "" });

  useEffect(() => {
    if (!activeOrg) return;
    const orgId = activeOrg.id;
    const unsubAccounts = chartAccountsRepo.subscribe(orgId, { environment: "LIVE", orderByField: "code" }, setAccounts, (err) => setMessage(err.message));
    const unsubPeriods = accountingPeriodsRepo.subscribe(orgId, { environment: "LIVE", orderByField: "startsAt", orderDirection: "desc" }, setPeriods, (err) => setMessage(err.message));
    return () => { unsubAccounts(); unsubPeriods(); };
  }, [activeOrg]);

  const createAccount = async () => {
    if (!activeOrg || !user) return;
    if (!account.code.trim() || !account.name.trim()) { setMessage("Account code and name are required."); return; }
    if (accounts.some((item) => item.code.toLowerCase() === account.code.trim().toLowerCase() && item.deletedAt === null)) { setMessage("That account code already exists."); return; }
    try {
      await chartAccountsRepo.create(activeOrg.id, user.uid, { code: account.code.trim(), name: account.name.trim(), category: account.category, active: true }, "LIVE");
      setAccount({ code: "", name: "", category: "expense" });
      setMessage("Chart account created.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Failed to create chart account."); }
  };

  const createPeriod = async () => {
    if (!activeOrg || !user) return;
    if (!period.name.trim() || !period.startsAt || !period.endsAt) { setMessage("Period name, start and end dates are required."); return; }
    const startsAt = new Date(`${period.startsAt}T00:00:00`);
    const endsAt = new Date(`${period.endsAt}T23:59:59`);
    if (endsAt <= startsAt) { setMessage("The accounting period end must be after its start."); return; }
    if (periods.some((item) => item.status === "open" && item.startsAt.toMillis() < endsAt.getTime() && item.endsAt.toMillis() > startsAt.getTime())) { setMessage("The new period overlaps an existing open accounting period."); return; }
    try {
      await accountingPeriodsRepo.create(activeOrg.id, user.uid, { name: period.name.trim(), startsAt: Timestamp.fromDate(startsAt), endsAt: Timestamp.fromDate(endsAt), status: "open" }, "LIVE");
      setPeriod({ name: "", startsAt: "", endsAt: "" });
      setMessage("Accounting period opened.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Failed to create accounting period."); }
  };

  const toggleAccount = async (item: ChartAccount) => {
    if (!activeOrg || !user) return;
    try { await chartAccountsRepo.update(activeOrg.id, user.uid, item.id, { active: !item.active }); setMessage(`${item.code} is now ${item.active ? "inactive" : "active"}.`); }
    catch (err) { setMessage(err instanceof Error ? err.message : "Account status could not be updated."); }
  };

  const closePeriod = async (item: AccountingPeriod) => {
    if (!activeOrg || !user) return;
    try { await accountingPeriodsRepo.update(activeOrg.id, user.uid, item.id, { status: "closed" }); setMessage(`${item.name} closed.`); }
    catch (err) { setMessage(err instanceof Error ? err.message : "Accounting period could not be closed."); }
  };

  return <section className="panel section">
    <div className="section-header"><div><h2 className="section-title">Accounting controls</h2><p className="section-sub">Chart of accounts and accounting periods are persisted LIVE controls, separate from journal entries.</p></div></div>
    {message && <div className="notice blue" style={{ marginBottom: 14 }}>{message}</div>}
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="panel" style={{ margin: 0 }}>
        <h3>Chart of accounts</h3>
        <div className="form-grid">
          <label className="form-group"><span className="field-label">Code</span><input className="form-input" value={account.code} onChange={(e) => setAccount({ ...account, code: e.target.value })} placeholder="e.g. 5100" /></label>
          <label className="form-group"><span className="field-label">Name</span><input className="form-input" value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} placeholder="Fuel expense" /></label>
          <label className="form-group"><span className="field-label">Category</span><select className="form-select" value={account.category} onChange={(e) => setAccount({ ...account, category: e.target.value as ChartAccount["category"] })}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
          <button className="btn-primary" type="button" onClick={createAccount}>Add account</button>
        </div>
        <div className="list" style={{ marginTop: 14 }}>{accounts.length === 0 ? <div className="muted">No chart accounts configured yet.</div> : accounts.map((item) => <div className="list-row" key={item.id}><div><strong>{item.code} · {item.name}</strong><span className="muted">{item.category} · {item.active ? "Active" : "Inactive"}</span></div><button className="btn-ghost" type="button" onClick={() => toggleAccount(item)}>{item.active ? "Deactivate" : "Activate"}</button></div>)}</div>
      </div>
      <div className="panel" style={{ margin: 0 }}>
        <h3>Accounting periods</h3>
        <div className="form-grid">
          <label className="form-group"><span className="field-label">Period name</span><input className="form-input" value={period.name} onChange={(e) => setPeriod({ ...period, name: e.target.value })} placeholder="September 2026" /></label>
          <label className="form-group"><span className="field-label">Starts</span><input className="form-input" type="date" value={period.startsAt} onChange={(e) => setPeriod({ ...period, startsAt: e.target.value })} /></label>
          <label className="form-group"><span className="field-label">Ends</span><input className="form-input" type="date" value={period.endsAt} onChange={(e) => setPeriod({ ...period, endsAt: e.target.value })} /></label>
          <button className="btn-primary" type="button" onClick={createPeriod}>Open period</button>
        </div>
        <div className="list" style={{ marginTop: 14 }}>{periods.length === 0 ? <div className="muted">No accounting periods configured yet.</div> : periods.map((item) => <div className="list-row" key={item.id}><div><strong>{item.name}</strong><span className="muted">{item.startsAt.toDate().toLocaleDateString()} → {item.endsAt.toDate().toLocaleDateString()} · {item.status}</span></div>{item.status === "open" && <button className="btn-ghost" type="button" onClick={() => closePeriod(item)}>Close period</button>}</div>)}</div>
      </div>
    </div>
  </section>;
}
