"use client";

// =============================================================
// WorkspaceContext — org/workspace resolution
// =============================================================
// Consumes AuthContext's "authenticated" state and resolves the
// remaining app-level states from the spec:
//   checking_workspace | company_setup | application | error
//
// This is deliberately a SEPARATE context from AuthContext. The
// old Translend bug conflated "are we done checking auth" with
// "are we done checking workspace" into one boolean, so a stuck
// workspace lookup looked identical to a stuck auth check and was
// impossible to diagnose from the UI. Here they are two state
// machines that compose, each independently inspectable.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import {
  getMembershipsForUser,
  getOrganization,
  createOrganization,
  type CreateOrganizationInput,
} from "@/lib/firebase/workspace";
import type { Organization, OrgMember } from "@/types/core";

export type WorkspaceStatus =
  | "idle" // auth not yet resolved; nothing to do
  | "checking_workspace"
  | "company_setup" // authenticated, zero orgs — must create one
  | "application" // resolved: activeOrg + activeMembership are set
  | "error";

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
      const memberList = await getMembershipsForUser(user.uid);
      setMemberships(memberList);

      if (memberList.length === 0) {
        setOrganizations([]);
        setStatus("company_setup");
        return;
      }

      const orgs = await Promise.all(memberList.map((m) => getOrganization(m.orgId)));
      const resolvedOrgs = orgs.filter((o): o is Organization => o !== null);
      setOrganizations(resolvedOrgs);

      const preferred =
        resolvedOrgs.find((o) => o.id === activeOrgId) ?? resolvedOrgs[0] ?? null;

      if (!preferred) {
        // Membership docs existed but their org docs are gone
        // (deleted org, or a data-consistency edge case). Treat as
        // needing setup rather than silently failing.
        setStatus("company_setup");
        return;
      }

      setActiveOrgIdState(preferred.id);
      setStatus("application");
    } catch (err) {
      console.error("[WorkspaceContext] resolve failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't load your company workspace. Please check your connection and try again."
      );
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (authStatus === "authenticated" && user) {
      resolve();
    } else if (authStatus === "unauthenticated") {
      setStatus("idle");
      setMemberships([]);
      setOrganizations([]);
      setActiveOrgIdState(null);
      setError(null);
    }
    // "authenticating" / "error" from AuthContext: leave workspace
    // status as-is; AppGate (below) reads auth status directly for
    // those and won't render workspace-dependent UI.
  }, [authStatus, user, resolve]);

  const createCompany = useCallback(
    async (input: CreateOrganizationInput) => {
      if (!user) throw new Error("Cannot create a company while unauthenticated.");
      setStatus("checking_workspace");
      try {
        const orgId = await createOrganization(
          user.uid,
          { email: user.email ?? "", displayName: user.displayName ?? user.email ?? "Owner" },
          input
        );
        setActiveOrgIdState(orgId);
        await resolve();
      } catch (err) {
        console.error("[WorkspaceContext] createCompany failed:", err);
        setError(err instanceof Error ? err.message : "Failed to create company workspace.");
        setStatus("error");
        throw err;
      }
    },
    [user, resolve]
  );

  const activeOrg = useMemo(
    () => organizations.find((o) => o.id === activeOrgId) ?? null,
    [organizations, activeOrgId]
  );
  const activeMembership = useMemo(
    () => memberships.find((m) => m.orgId === activeOrgId) ?? null,
    [memberships, activeOrgId]
  );

  const value = useMemo(
    () => ({
      status,
      organizations,
      memberships,
      activeOrg,
      activeMembership,
      error,
      setActiveOrgId: setActiveOrgIdState,
      createCompany,
      refresh: resolve,
    }),
    [status, organizations, memberships, activeOrg, activeMembership, error, createCompany, resolve]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within a WorkspaceProvider");
  return ctx;
}
