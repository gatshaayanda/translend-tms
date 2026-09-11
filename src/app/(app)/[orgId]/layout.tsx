"use client";

// =============================================================
// Translend layout — /(app)/[orgId]/*
// =============================================================
// Wraps AppGate (full auth+workspace resolution) around every
// page under an org-scoped route, THEN checks that the [orgId] in
// the URL actually matches a workspace the signed-in user belongs
// to. This stops a user from ever seeing another org's shell just
// by editing the URL — a mismatch redirects to their real active
// org rather than rendering anything.

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AppGate from "@/components/layout/AppGate";
import AppShell from "@/components/layout/AppShell";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { LoadingScreen, ErrorScreen } from "@/components/ui/FullScreenState";

function OrgGuard({ children }: { children: React.ReactNode }) {
  const params = useParams<{ orgId: string }>();
  const router = useRouter();
  const { organizations, activeOrg, setActiveOrgId } = useWorkspace();

  const urlOrgId = params.orgId;
  const belongsToUrlOrg = organizations.some((o) => o.id === urlOrgId);

  useEffect(() => {
    if (!belongsToUrlOrg && activeOrg) {
      // URL points at an org this user isn't a member of (or a
      // stale/incorrect id) — send them to their real active org.
      router.replace(`/${activeOrg.id}/control-tower`);
    } else if (belongsToUrlOrg && activeOrg?.id !== urlOrgId) {
      // User has access, just wasn't the "active" one — switch.
      setActiveOrgId(urlOrgId);
    }
  }, [belongsToUrlOrg, activeOrg, urlOrgId, router, setActiveOrgId]);

  if (!belongsToUrlOrg) {
    return <LoadingScreen title="Switching workspace…" />;
  }

  return <AppShell>{children}</AppShell>;
}

export default function TranslendLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppGate>
      <OrgErrorBoundaryFallback>
        <OrgGuard>{children}</OrgGuard>
      </OrgErrorBoundaryFallback>
    </AppGate>
  );
}

// Lightweight guard against a null activeOrg slipping through a
// race between AppGate resolving and this layout mounting.
function OrgErrorBoundaryFallback({ children }: { children: React.ReactNode }) {
  const { activeOrg, status } = useWorkspace();
  if (status === "application" && !activeOrg) {
    return (
      <ErrorScreen
        title="Workspace unavailable"
        message="Your active workspace couldn't be determined. Please retry."
      />
    );
  }
  return <>{children}</>;
}
