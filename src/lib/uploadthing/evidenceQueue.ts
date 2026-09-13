import type { User } from "firebase/auth";
import { uploadDeliveryEvidence, type DeliveryEvidenceKind } from "@/lib/uploadthing/client";

const DB_NAME = "translend-tms-offline";
const STORE_NAME = "deliveryEvidenceUploads";
const DB_VERSION = 1;

export interface PendingDeliveryEvidenceUpload {
  id: string;
  uid: string;
  orgId: string;
  deliveryId: string;
  deliveryNoteId: string;
  kind: DeliveryEvidenceKind;
  fileName: string;
  fileType: string;
  file: Blob;
  replacesEvidenceId?: string;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) return reject(new Error("Offline evidence storage is unavailable in this browser."));
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("uid", "uid", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline evidence storage."));
  });
}

export async function enqueueDeliveryEvidenceUpload(input: Omit<PendingDeliveryEvidenceUpload, "id" | "createdAt">) {
  const db = await openDb();
  const item: PendingDeliveryEvidenceUpload = { ...input, id: crypto.randomUUID(), createdAt: Date.now() };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not save the evidence upload for retry."));
  });
  db.close();
  return item;
}

export async function listPendingDeliveryEvidenceUploads(uid: string) {
  const db = await openDb();
  const items = await new Promise<PendingDeliveryEvidenceUpload[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).index("uid").getAll(uid);
    request.onsuccess = () => resolve((request.result as PendingDeliveryEvidenceUpload[]).sort((a, b) => a.createdAt - b.createdAt));
    request.onerror = () => reject(request.error ?? new Error("Could not read pending evidence uploads."));
  });
  db.close();
  return items;
}

export async function removePendingDeliveryEvidenceUpload(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not remove the completed evidence upload."));
  });
  db.close();
}

export async function flushPendingDeliveryEvidenceUploads(user: User) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { attempted: 0, completed: 0, remaining: 0 };
  const pending = await listPendingDeliveryEvidenceUploads(user.uid);
  let completed = 0;
  for (const item of pending) {
    try {
      const file = new File([item.file], item.fileName, { type: item.fileType });
      await uploadDeliveryEvidence({ user, orgId: item.orgId, deliveryId: item.deliveryId, deliveryNoteId: item.deliveryNoteId, kind: item.kind, file, ...(item.replacesEvidenceId ? { replacesEvidenceId: item.replacesEvidenceId } : {}) });
      await removePendingDeliveryEvidenceUpload(item.id);
      completed += 1;
    } catch {
      // Keep the item. A later online event or manual retry can safely attempt it again.
      break;
    }
  }
  return { attempted: pending.length, completed, remaining: pending.length - completed };
}
