"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { enableOfflinePersistence, waitForOfflineWrites } from "@/lib/firebase/client";
import { syncQueuedDriverActions } from "@/lib/offline/driverActionQueue";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type SyncState = "starting" | "ready" | "offline" | "syncing" | "synced" | "attention" | "unavailable" | "failed";

export function PwaBootstrap() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [online, setOnline] = useState(() => typeof navigator !== "undefined" ? navigator.onLine : true);
  const [, setSyncState] = useState<SyncState>(() => typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "starting");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const register = () => { void navigator.serviceWorker.register("/sw.js").catch(() => undefined); };
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }

    const syncNow = async () => {
      if (!navigator.onLine) {
        setOnline(false);
        setSyncState("offline");
        return;
      }
      setOnline(true);
      setSyncState("syncing");
      try {
        await waitForOfflineWrites();
        const result = await syncQueuedDriverActions();
        if (result.blocked > 0) setSyncState("attention");
        else if (result.pending > 0) setSyncState("ready");
        else setSyncState("synced");
      } catch {
        setSyncState("ready");
      }
    };

    const onBeforeInstall = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallPromptEvent); };
    const onConnectionChange = () => { void syncNow(); };
    const unsubscribeAuth = onAuthStateChanged(auth, () => { if (navigator.onLine) void syncNow(); });

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("online", onConnectionChange);
    window.addEventListener("offline", onConnectionChange);

    void enableOfflinePersistence().then((status) => {
      if (status === "unavailable" || status === "failed") {
        setSyncState(status);
        return;
      }
      void syncNow();
    });

    return () => {
      unsubscribeAuth();
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("online", onConnectionChange);
      window.removeEventListener("offline", onConnectionChange);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === "accepted") setInstallEvent(null);
  };

  return <>
    {installEvent && <button onClick={install} className="fixed bottom-4 right-4 z-40 rounded-full bg-black px-4 py-3 text-xs font-bold text-white shadow-lg">Install Translend</button>}
  </>;
}
