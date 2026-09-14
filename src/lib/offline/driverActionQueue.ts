import { auth } from "@/lib/firebase/client";

export type QueuedDriverAction = {
  id: string;
  createdAt: number;
  orgId: string;
  endpoint: "/api/driver/trip-status" | "/api/driver/delivery-action" | "/api/driver/vehicle-action";
  payload: Record<string, unknown>;
  attempts: number;
  lastError: string | null;
};

const DB_NAME = "translend-offline";
const STORE = "driver-actions";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open offline storage."));
  });
}

export function newDriverActionId() {
  return `drv_${Date.now()}_${crypto.randomUUID()}`;
}

export async function enqueueDriverAction(
  action: Omit<QueuedDriverAction, "id" | "createdAt" | "attempts" | "lastError">
): Promise<string> {
  const db = await openDb();
  const id = newDriverActionId();
  const record: QueuedDriverAction = {
    ...action,
    id,
    createdAt: Date.now(),
    payload: { ...action.payload, idempotencyKey: id },
    attempts: 0,
    lastError: null,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Unable to queue offline action."));
  });
  db.close();
  return record.id;
}

export async function listQueuedDriverActions(): Promise<QueuedDriverAction[]> {
  const db = await openDb();
  const records = await new Promise<QueuedDriverAction[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).index("createdAt").getAll();
    request.onsuccess = () => resolve((request.result as QueuedDriverAction[]).sort((a, b) => a.createdAt - b.createdAt));
    request.onerror = () => reject(request.error ?? new Error("Unable to read offline actions."));
  });
  db.close();
  return records;
}

async function removeDriverAction(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Unable to remove synced action."));
  });
  db.close();
}

async function recordFailure(action: QueuedDriverAction, error: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ ...action, attempts: action.attempts + 1, lastError: error });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Unable to record offline action failure."));
  });
  db.close();
}

function isNetworkFailure(error: unknown) {
  if (!navigator.onLine) return true;
  if (!(error instanceof Error)) return false;
  return /network|failed to fetch|load failed|fetch/i.test(error.message);
}

export async function syncQueuedDriverActions(): Promise<{ synced: number; failed: number; pending: number }> {
  if (typeof window === "undefined" || !navigator.onLine || !auth.currentUser) {
    return { synced: 0, failed: 0, pending: 0 };
  }

  const actions = await listQueuedDriverActions();
  let synced = 0;
  let failed = 0;
  for (const action of actions) {
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(action.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(action.payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = typeof data?.error === "string" ? data.error : `Server rejected queued action (${response.status}).`;
        await recordFailure(action, error);
        failed += 1;
        continue;
      }
      await removeDriverAction(action.id);
      synced += 1;
    } catch (error) {
      if (isNetworkFailure(error)) break;
      await recordFailure(action, error instanceof Error ? error.message : "Queued action failed.");
      failed += 1;
    }
  }

  const remaining = await listQueuedDriverActions();
  return { synced, failed, pending: remaining.length };
}
