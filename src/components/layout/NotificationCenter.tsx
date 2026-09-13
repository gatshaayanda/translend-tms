"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Timestamp, where } from "firebase/firestore";
import { notificationsRepo } from "@/lib/firebase/modules";
import { useAuth } from "@/contexts/AuthContext";
import type { NotificationRecord } from "@/types/notifications";

export default function NotificationCenter({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    return notificationsRepo.subscribe(orgId, { environment: "LIVE", orderByField: "createdAt", orderDirection: "desc", limitTo: 30, extra: [where("recipientUid", "==", user.uid)] }, setItems, () => undefined);
  }, [orgId, user]);

  const unread = useMemo(() => items.filter((item) => !item.readAt), [items]);
  const markRead = async (item: NotificationRecord) => {
    if (!user || item.readAt) return;
    try { await notificationsRepo.update(orgId, user.uid, item.id, { readAt: Timestamp.now() }); } catch { /* keep notification visible; retry on next click */ }
  };

  return <div className="relative">
    <button onClick={() => setOpen((value) => !value)} aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ""}`} className="relative rounded-md border border-slate-800 px-2.5 py-1.5 text-slate-300 hover:bg-slate-900">♢{unread.length > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-4 text-slate-950">{unread.length > 9 ? "9+" : unread.length}</span>}</button>
    {open && <div className="absolute right-0 top-10 z-50 w-[min(380px,calc(100vw-2rem))] rounded-lg border border-slate-800 bg-slate-950 p-2 shadow-2xl">
      <div className="flex items-center justify-between px-2 py-1"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notifications</p><span className="text-xs text-slate-600">{unread.length} unread</span></div>
      <div className="mt-2 max-h-96 space-y-1 overflow-y-auto">
        {items.length === 0 ? <p className="px-2 py-6 text-center text-xs text-slate-600">No notifications yet.</p> : items.map((item) => <div key={item.id} className={`rounded-md border px-2.5 py-2 ${item.readAt ? "border-slate-900 bg-slate-950" : "border-slate-700 bg-slate-900/70"}`} onClick={() => void markRead(item)}>
          {item.href ? <Link href={item.href} onClick={() => setOpen(false)} className="block"><NotificationText item={item} /></Link> : <NotificationText item={item} />}
        </div>)}
      </div>
    </div>}
  </div>;
}

function NotificationText({ item }: { item: NotificationRecord }) {
  return <><div className="flex items-start justify-between gap-2"><p className="text-xs font-medium text-slate-200">{item.title}</p><span className={`text-[10px] uppercase ${item.severity === "urgent" ? "text-red-300" : item.severity === "warning" ? "text-amber-300" : "text-slate-500"}`}>{item.severity}</span></div><p className="mt-1 text-xs leading-5 text-slate-400">{item.message}</p><p className="mt-1 text-[10px] text-slate-600">{formatTimestamp(item.createdAt)}</p></>;
}

function formatTimestamp(value: Timestamp) { return value.toDate().toLocaleString(); }
