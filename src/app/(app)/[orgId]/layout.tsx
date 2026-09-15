"use client";

import { useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import AppGate from "@/components/layout/AppGate";
import AppShell from "@/components/layout/AppShell";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { LoadingScreen, ErrorScreen } from "@/components/ui/FullScreenState";

function OrgGuard({ children }: { children: React.ReactNode }) {
  const params = useParams<{ orgId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { organizations, activeOrg, activeMembership, setActiveOrgId } = useWorkspace();

  const urlOrgId = params.orgId;
  const belongsToUrlOrg = organizations.some((o) => o.id === urlOrgId);
  const relativePath = pathname?.replace(`/${urlOrgId}`, "") ?? "";
  const driverAllowed = relativePath === "/my-trip" || relativePath.startsWith("/my-trip/") || relativePath === "/trucks" || relativePath.startsWith("/trucks/") || relativePath === "/deliveries" || relativePath.startsWith("/deliveries/");

  useEffect(() => {
    if (!belongsToUrlOrg && activeOrg) {
      router.replace(`/${activeOrg.id}/${activeMembership?.role === "driver" ? "my-trip" : "control-tower"}`);
    } else if (belongsToUrlOrg && activeOrg?.id !== urlOrgId) {
      setActiveOrgId(urlOrgId);
    } else if (belongsToUrlOrg && activeMembership?.role === "driver" && !driverAllowed) {
      router.replace(`/${urlOrgId}/my-trip`);
    }
  }, [belongsToUrlOrg, activeOrg, activeMembership, urlOrgId, driverAllowed, router, setActiveOrgId]);

  if (!belongsToUrlOrg) return <LoadingScreen title="Switching workspace…" />;
  if (activeMembership?.role === "driver" && !driverAllowed) return <LoadingScreen title="Opening your driver workspace…" />;

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

function OrgErrorBoundaryFallback({ children }: { children: React.ReactNode }) {
  const { activeOrg, status } = useWorkspace();
  if (status === "application" && !activeOrg) {
    return <ErrorScreen title="Workspace unavailable" message="Your active workspace couldn't be determined. Please retry." />;
  }
  return <>{children}</>;
}
