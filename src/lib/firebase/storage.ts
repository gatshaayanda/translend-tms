// =============================================================
// Firebase Storage helper — POD uploads
// =============================================================
// Storage layout: /organizations/{orgId}/pod/{tripId}/{fileName}
// Kept separate from the Firestore repository layer since Storage
// has a different API shape (upload -> URL, not doc CRUD).

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebase } from "./client";

export async function uploadPodFile(orgId: string, tripId: string, file: File): Promise<string> {
  const { storage } = getFirebase();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `organizations/${orgId}/pod/${tripId}/${Date.now()}_${safeName}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
