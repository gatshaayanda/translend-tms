"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppGate from "@/components/layout/AppGate";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { LoadingScreen } from "@/components/ui/FullScreenState";

function RedirectToWorkspaceEntry() {
  const { activeOrg, activeMembership } = useWorkspace();
  const router = useRouter();

  useEffect(() => {
    if (activeOrg && activeMembership) {
      router.replace(`/${activeOrg.id}/${activeMembership.role === "driver" ? "my-trip" : "control-tower"}`);
    }
  }, [activeOrg, activeMembership, router]);

  return <LoadingScreen title="Opening your Translend workspace…" />;
}

export default function RootPage() {
  return (
    <AppGate>
      <RedirectToWorkspaceEntry />
    </AppGate>
  );
}
