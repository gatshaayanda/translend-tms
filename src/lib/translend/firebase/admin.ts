import 'server-only'

import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0]

  const serviceAccount = process.env.FIREBASE_ADMIN_KEY
  if (!serviceAccount) throw new Error('FIREBASE_ADMIN_KEY is not configured')

  return initializeApp({ credential: cert(JSON.parse(serviceAccount)) })
}

export const translendAdminApp = getAdminApp()
export const translendAdminDb = getFirestore(translendAdminApp)
