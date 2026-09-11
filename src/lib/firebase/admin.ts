import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const rawServiceAccount = process.env.FIREBASE_ADMIN_KEY;

if (!rawServiceAccount) {
  throw new Error("Missing FIREBASE_ADMIN_KEY environment variable.");
}

let serviceAccount: {
  project_id: string;
  client_email: string;
  private_key: string;
};

try {
  serviceAccount = JSON.parse(rawServiceAccount);
} catch {
  throw new Error("FIREBASE_ADMIN_KEY is not valid service-account JSON.");
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId || serviceAccount.project_id !== projectId) {
  throw new Error(
    "Firebase Admin project configuration does not match the application project.",
  );
}

const adminApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
        }),
      });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
