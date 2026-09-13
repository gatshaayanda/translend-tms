import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let adminApp: App | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

function getAdminApp() {
  if (adminApp) return adminApp;
  const rawServiceAccount = process.env.FIREBASE_ADMIN_KEY;
  if (!rawServiceAccount) throw new Error("Missing FIREBASE_ADMIN_KEY environment variable.");
  let serviceAccount: { project_id: string; client_email: string; private_key: string };
  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch {
    throw new Error("FIREBASE_ADMIN_KEY is not valid service-account JSON.");
  }
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId || serviceAccount.project_id !== projectId) throw new Error("Firebase Admin project configuration does not match the application project.");
  adminApp = getApps().length > 0 ? getApps()[0] : initializeApp({ credential: cert({ projectId: serviceAccount.project_id, clientEmail: serviceAccount.client_email, privateKey: serviceAccount.private_key.replace(/\\n/g, "\n") }) });
  return adminApp;
}

export function getAdminAuth() {
  authInstance ??= getAuth(getAdminApp());
  return authInstance;
}

export function getAdminDb() {
  dbInstance ??= getFirestore(getAdminApp());
  return dbInstance;
}
