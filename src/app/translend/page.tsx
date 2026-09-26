"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import AppGate from "@/components/layout/AppGate";
import { LoadingScreen } from "@/components/ui/FullScreenState";

function TranslendEntry() {
  const router = useRouter();
  const { activeOrg, activeMembership } = useWorkspace();

  useEffect(() => {
    if (activeOrg && activeMembership) {
      router.replace(`/${activeOrg.id}/${activeMembership.role === "driver" ? "my-trip" : "control-tower"}`);
    } else {
      router.replace("/");
    }
  }, [activeOrg, activeMembership, router]);

  return <LoadingScreen title="Opening your Translend workspace…" />;
}

export default function TranslendPage() {
  return <AppGate><TranslendEntry /></AppGate>;
}
