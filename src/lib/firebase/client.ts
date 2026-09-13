import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  enableMultiTabIndexedDbPersistence,
  getFirestore,
  waitForPendingWrites,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

let offlinePersistencePromise: Promise<OfflinePersistenceStatus> | null = null;

export type OfflinePersistenceStatus =
  | "enabled"
  | "already-enabled"
  | "unavailable"
  | "failed";

/**
 * Enables durable, multi-tab Firestore persistence in a browser.
 * Firestore then retains cached reads and queues supported writes while
 * the device is offline. This is intentionally a foundation only: the
 * application must still add domain-level mutation queues and conflict
 * resolution before claiming full offline CRUD for every workflow.
 */
export function enableOfflinePersistence(): Promise<OfflinePersistenceStatus> {
  if (typeof window === "undefined") return Promise.resolve("unavailable");
  if (!offlinePersistencePromise) {
    offlinePersistencePromise = enableMultiTabIndexedDbPersistence(db)
      .then(() => "enabled" as const)
      .catch((error: unknown) => {
        const code = error instanceof Error && "code" in error
          ? String((error as Error & { code?: string }).code)
          : "";
        if (code === "failed-precondition") return "already-enabled" as const;
        if (code === "unimplemented") return "unavailable" as const;
        return "failed" as const;
      });
  }
  return offlinePersistencePromise;
}

/**
 * Resolves once Firestore has sent the writes currently pending in the
 * local client. It is safe to call when there are no pending writes.
 */
export async function waitForOfflineWrites(): Promise<void> {
  await waitForPendingWrites(db);
}

export function getFirebase() {
  return { app, auth, db, storage };
}
