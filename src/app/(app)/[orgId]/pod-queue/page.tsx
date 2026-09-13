"use client";

import { useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { DeliveryPODQueue } from "@/components/deliveries/DeliveryPODQueue";
import { DeliveryPODContextDialog } from "@/components/deliveries/DeliveryPODContextDialog";
import type { DeliveryNote } from "@/types/core";

export default function PodQueuePage() {
  const { activeOrg } = useWorkspace();
  const [openNote, setOpenNote] = useState<DeliveryNote | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!activeOrg) return null;
  return <div className="space-y-6">
    <header><h1 className="text-xl font-semibold text-slate-50">POD Queue</h1><p className="mt-1 text-sm text-slate-400">Operational work still waiting for delivery evidence to be completed.</p></header>
    {error && <div className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">{error}</div>}
    <DeliveryPODQueue orgId={activeOrg.id} onOpen={setOpenNote} />
    {openNote && <DeliveryPODContextDialog orgId={activeOrg.id} note={openNote} onClose={() => setOpenNote(null)} onSaved={setOpenNote} onError={setError} />}
  </div>;
}
