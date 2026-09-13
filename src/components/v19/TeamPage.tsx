"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { listOrgMembers } from "@/lib/firebase/workspace";
import { ORG_ROLES, ROLE_LABELS, type OrgMember, type OrgRole } from "@/types/core";
import TeamMemberActions from "@/components/v19/TeamMemberActions";

const INVITABLE_ROLES = ORG_ROLES.filter((role) => role !== "owner");
type PendingInvite = { id: string; email: string; role: Exclude<OrgRole, "owner">; expiresAt: string };

export default function TeamPage() {
  const { activeOrg, activeMembership } = useWorkspace();
  const { user } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]); const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [email, setEmail] = useState(""); const [role, setRole] = useState<Exclude<OrgRole, "owner">>("driver");
  const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [saving, setSaving] = useState(false); const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!activeOrg || !user) return;
    setLoading(true); setError(null);
    try {
      const token = await user.getIdToken();
      const [memberList, inviteResponse] = await Promise.all([listOrgMembers(activeOrg.id), fetch(`/api/invites?orgId=${encodeURIComponent(activeOrg.id)}`, { headers: { Authorization: `Bearer ${token}` } })]);
      if (!inviteResponse.ok) { const data = await inviteResponse.json().catch(() => ({})); throw new Error(data.error ?? "Unable to load workspace invitations."); }
      setMembers(memberList); setInvites((await inviteResponse.json()).invites ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load the team. Try again."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [activeOrg, user]);

  if (!activeOrg || !activeMembership) return null;
  if (!["owner", "operations_manager"].includes(activeMembership.role)) return <div className="panel"><h1 className="page-title">Team & Invites</h1><p className="section-sub">Only the workspace owner and operations manager can manage members.</p></div>;

  const invite = async (event: FormEvent) => {
    event.preventDefault(); if (!user || !email.trim()) return;
    setSaving(true); setMessage(null); setError(null);
    try {
      const token = await user.getIdToken(); const response = await fetch("/api/invites", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ orgId: activeOrg.id, email, role }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Invitation could not be created.");
      setEmail(""); setMessage(`${data.email} is invited as ${ROLE_LABELS[role]}. They can sign in with Google and Translend will attach them to this workspace automatically.`); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Invitation failed."); }
    finally { setSaving(false); }
  };

  return <div className="space-y-6">
    <header className="page-header"><div><h1 className="page-title">Team & Invites</h1><p className="page-subtitle">Manage workspace access, invite people and control active member roles.</p></div><span className="badge green">WORKSPACE ACCESS</span></header>
    {loading && <div className="notice blue">Refreshing workspace access…</div>}
    {message && <div className="notice blue">{message}</div>}
    {error && <div className="notice" style={{ borderColor: "#F3C3C3", background: "var(--red-100)", color: "#902323" }}><strong>Could not complete this workspace action.</strong><br />{error}<br /><button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => void load()}>Try again</button></div>}
    <section className="panel"><div className="section-header"><div><h2 className="section-title">Invite a person</h2><p className="section-sub">No Firebase UID is required up front. The invitation is pending until the invited email signs in.</p></div></div><form onSubmit={invite} className="form-grid"><label className="form-group"><span className="field-label">Email</span><input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@company.com" required /></label><label className="form-group"><span className="field-label">Role</span><select className="form-select" value={role} onChange={(e) => setRole(e.target.value as Exclude<OrgRole, "owner">)}>{INVITABLE_ROLES.map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}</select></label><div className="form-actions" style={{ alignItems: "end" }}><button className="btn-primary" disabled={saving}>{saving ? "Creating invitation…" : "Invite person"}</button></div></form></section>
    <section className="panel"><div className="section-header"><div><h2 className="section-title">Active members</h2><p className="section-sub">Role changes and suspension are server-controlled and audited.</p></div><span className="badge teal">{members.filter((m) => m.status === "active").length} active</span></div><div className="list">{members.map((member) => <div className="list-row" key={member.uid}><div><strong>{member.displayName || member.email}</strong><span className="muted">{member.email}</span><TeamMemberActions orgId={activeOrg.id} member={member} actorRole={activeMembership.role} onDone={load} onError={setError} /></div><span className={`badge ${member.status === "active" ? "teal" : "orange"}`}>{member.status === "active" ? ROLE_LABELS[member.role] : member.status.toUpperCase()}</span></div>)}</div></section>
    <section className="panel"><div className="section-header"><div><h2 className="section-title">Pending invitations</h2><p className="section-sub">Invitations expire after 7 days. A new invite to the same email replaces the older pending invite.</p></div><span className="badge">{invites.length} pending</span></div>{invites.length === 0 ? <div className="notice blue">No pending invitations.</div> : <div className="list">{invites.map((invite) => <div className="list-row" key={invite.id}><div><strong>{invite.email}</strong><span className="muted">{ROLE_LABELS[invite.role]} · expires {new Date(invite.expiresAt).toLocaleDateString()}</span></div><span className="badge orange">PENDING</span></div>)}</div>}</section>
  </div>;
}
