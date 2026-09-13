"use client";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ReportsHub } from "@/components/v19/ReportsHub";

export default function ReportsPage() {
  const { activeOrg } = useWorkspace();
  if (!activeOrg) return null;
  return <ReportsHub orgId={activeOrg.id} />;
}
