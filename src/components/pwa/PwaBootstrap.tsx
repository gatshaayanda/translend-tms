"use client";

import { useEffect, useState } from "react";
import { enableOfflinePersistence, waitForOfflineWrites } from "@/lib/firebase/client";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type SyncState = "starting" | "ready" | "offline" | "syncing" | "synced" | "unavailable" | "failed";

export function PwaBootstrap() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [online, setOnline] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>("starting");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => undefined); }, { once: true });
    }

    const onBeforeInstall = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallPromptEvent); };
    const onConnectionChange = () => {
      const nextOnline = navigator.onLine;
      setOnline(nextOnline);
      setSyncState(nextOnline ? "syncing" : "offline");
      if (nextOnline) {
        void waitForOfflineWrites()
          .then(() => setSyncState("synced"))
          .catch(() => setSyncState("ready"));
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("online", onConnectionChange);
    window.addEventListener("offline", onConnectionChange);
    onConnectionChange();

    void enableOfflinePersistence().then((status) => {
      if (status === "unavailable" || status === "failed") {
        setSyncState(status);
        return;
      }
      if (!navigator.onLine) {
        setSyncState("offline");
        return;
      }
      setSyncState("syncing");
      return waitForOfflineWrites()
        .then(() => setSyncState("synced"))
        .catch(() => setSyncState("ready"));
    });

    return () => {
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

  const syncLabel = {
    starting: "Preparing offline support…",
    ready: "Offline support ready",
    offline: "Offline — local Firestore changes will sync when you reconnect",
    syncing: "Syncing local changes…",
    synced: "Synced",
    unavailable: "Offline storage is not available in this browser",
    failed: "Offline storage could not be enabled",
  }[syncState];

  return <>
    {!online && <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/10 bg-white px-4 py-3 text-center text-xs font-semibold text-gray-700 shadow-lg">{syncLabel}</div>}
    {online && syncState === "syncing" && <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/10 bg-white px-4 py-2 text-center text-[11px] font-semibold text-gray-600 shadow-lg">{syncLabel}</div>}
    {online && (syncState === "unavailable" || syncState === "failed") && <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/10 bg-white px-4 py-3 text-center text-xs font-semibold text-gray-700 shadow-lg">{syncLabel}</div>}
    {installEvent && <button onClick={install} className="fixed bottom-4 right-4 z-40 rounded-full bg-black px-4 py-3 text-xs font-bold text-white shadow-lg">Install Translend</button>}
  </>;
}
