"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { getMembershipsForUser, getOrganization, createOrganization, type CreateOrganizationInput } from "@/lib/firebase/workspace";
import type { Organization, OrgMember } from "@/types/core";

export type WorkspaceStatus = "idle" | "checking_workspace" | "company_setup" | "application" | "error";

interface WorkspaceContextValue {
  status: WorkspaceStatus;
  organizations: Organization[];
  memberships: OrgMember[];
  activeOrg: Organization | null;
  activeMembership: OrgMember | null;
  error: string | null;
  setActiveOrgId: (orgId: string) => void;
  createCompany: (input: CreateOrganizationInput) => Promise<void>;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

async function claimPendingInvite(user: { uid: string; getIdToken: () => Promise<string> }) {
  const token = await user.getIdToken();
  const response = await fetch("/api/invites/claim", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "We couldn't check your workspace invitation.");
  }
  return response.json() as Promise<{ claimed: boolean; orgId?: string }>;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth();
  const [status, setStatus] = useState<WorkspaceStatus>("idle");
  const [memberships, setMemberships] = useState<OrgMember[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(async () => {
    if (!user) return;
    setStatus("checking_workspace");
    setError(null);
    try {
      let memberList = await getMembershipsForUser(user.uid);
      if (memberList.length === 0) {
        const claim = await claimPendingInvite(user);
        if (claim.claimed) memberList = await getMembershipsForUser(user.uid);
      }
      setMemberships(memberList);
      if (memberList.length === 0) {
        setOrganizations([]);
        setStatus("company_setup");
        return;
      }
      const orgs = await Promise.all(memberList.map((m) => getOrganization(m.orgId)));
      const resolvedOrgs = orgs.filter((o): o is Organization => o !== null);
      setOrganizations(resolvedOrgs);
      const preferred = resolvedOrgs.find((o) => o.id === activeOrgId) ?? resolvedOrgs[0] ?? null;
      if (!preferred) {
        setStatus("company_setup");
        return;
      }
      setActiveOrgIdState(preferred.id);
      setStatus("application");
    } catch (err) {
      console.error("[WorkspaceContext] resolve failed:", err);
      setError(err instanceof Error ? err.message : "We couldn't load your company workspace. Please check your connection and try again.");
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (authStatus === "authenticated" && user) {
      resolve();
    } else if (authStatus === "unauthenticated") {
      setStatus("idle"); setMemberships([]); setOrganizations([]); setActiveOrgIdState(null); setError(null);
    }
  }, [authStatus, user, resolve]);

  const createCompany = useCallback(async (input: CreateOrganizationInput) => {
    if (!user) throw new Error("Cannot create a company while unauthenticated.");
    setStatus("checking_workspace");
    try {
      const orgId = await createOrganization(user.uid, { email: user.email ?? "", displayName: user.displayName ?? user.email ?? "Owner" }, input);
      setActiveOrgIdState(orgId);
      await resolve();
    } catch (err) {
      console.error("[WorkspaceContext] createCompany failed:", err);
      setError(err instanceof Error ? err.message : "Failed to create company workspace.");
      setStatus("error");
      throw err;
    }
  }, [user, resolve]);

  const activeOrg = useMemo(() => organizations.find((o) => o.id === activeOrgId) ?? null, [organizations, activeOrgId]);
  const activeMembership = useMemo(() => memberships.find((m) => m.orgId === activeOrgId) ?? null, [memberships, activeOrgId]);
  const value = useMemo(() => ({ status, organizations, memberships, activeOrg, activeMembership, error, setActiveOrgId: setActiveOrgIdState, createCompany, refresh: resolve }), [status, organizations, memberships, activeOrg, activeMembership, error, createCompany, resolve]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
