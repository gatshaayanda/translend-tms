"use client";

import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { DeliveryPODQueue } from "@/components/deliveries/DeliveryPODQueue";
import type { DeliveryNote } from "@/types/core";

export default function PodQueuePage() {
  const { activeOrg } = useWorkspace();
  const router = useRouter();
  if (!activeOrg) return null;
  const openNote = (_note: DeliveryNote) => router.push(`/${activeOrg.id}/deliveries`);
  return <div className="space-y-6"><header><h1 className="text-xl font-semibold text-slate-50">POD Queue</h1><p className="mt-1 text-sm text-slate-400">Operational work still waiting for delivery evidence to be completed.</p></header><DeliveryPODQueue orgId={activeOrg.id} onOpen={openNote} /></div>;
}
