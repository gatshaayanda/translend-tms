"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function PwaBootstrap() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => undefined); }, { once: true });
    }
    const onBeforeInstall = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallPromptEvent); };
    const updateConnection = () => setOnline(navigator.onLine);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    updateConnection();
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === "accepted") setInstallEvent(null);
  };

  return <>
    {!online && <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/10 bg-white px-4 py-3 text-center text-xs font-semibold text-gray-700 shadow-lg">You are offline. Translend is showing cached app shell; live business mutations require a connection.</div>}
    {installEvent && <button onClick={install} className="fixed bottom-4 right-4 z-40 rounded-full bg-black px-4 py-3 text-xs font-bold text-white shadow-lg">Install Translend</button>}
  </>;
}
