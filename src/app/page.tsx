"use client";

// =============================================================
// Root page — auth + workspace gate
// =============================================================
// This is the front door of the app. AppGate renders whichever
// screen matches the current combined auth/workspace state. Once
// fully resolved (status === "application"), we redirect into the
// org-scoped Control Tower rather than rendering app content here
// — every real page lives under /(app)/[orgId]/*.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppGate from "@/components/layout/AppGate";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { LoadingScreen } from "@/components/ui/FullScreenState";

function RedirectToControlTower() {
  const { activeOrg } = useWorkspace();
  const router = useRouter();

  useEffect(() => {
    if (activeOrg) {
      router.replace(`/${activeOrg.id}/control-tower`);
    }
  }, [activeOrg, router]);

  return <LoadingScreen title="Opening Control Tower…" />;
}

export default function RootPage() {
  return (
    <AppGate>
      <RedirectToControlTower />
    </AppGate>
  );
}
