"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS, ORG_ROLES, type OrgMember, type OrgRole } from "@/types/core";

export default function TeamMemberActions({ orgId, member, actorRole, onDone, onError }: { orgId: string; member: OrgMember; actorRole: OrgRole; onDone: () => void; onError: (message: string) => void }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  if (member.role === "owner" || member.uid === user?.uid || (actorRole === "operations_manager" && member.role === "operations_manager")) return null;
  const roles = ORG_ROLES.filter((role) => role !== "owner");
  const run = async (action: "change_role" | "suspend" | "restore", role?: OrgRole) => {
    if (!user) return onError("You must be signed in to manage workspace access.");
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/team/member-action", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ orgId, memberUid: member.uid, action, ...(role ? { role } : {}) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Workspace member action failed.");
      onDone();
    } catch (err) { onError(err instanceof Error ? err.message : "Workspace member action failed."); }
    finally { setBusy(false); }
  };
  return <div className="mt-2 flex flex-wrap items-center gap-2">
    <select className="form-select" value={member.role} disabled={busy} onChange={(event) => void run("change_role", event.target.value as OrgRole)} aria-label={`Change role for ${member.displayName || member.email}`}>{roles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select>
    {member.status === "active" ? <button className="btn-secondary" disabled={busy} onClick={() => void run("suspend")}>{busy ? "Saving…" : "Suspend"}</button> : <button className="btn-secondary" disabled={busy} onClick={() => void run("restore")}>{busy ? "Saving…" : "Restore"}</button>}
  </div>;
}
