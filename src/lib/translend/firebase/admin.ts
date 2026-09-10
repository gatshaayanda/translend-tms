import 'server-only'

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let cachedApp: App | undefined

export function getTranslendAdminApp() {
  if (cachedApp) return cachedApp
  if (getApps().length > 0) {
    cachedApp = getApps()[0]
    return cachedApp
  }

  const serviceAccount = process.env.FIREBASE_ADMIN_KEY
  if (!serviceAccount) throw new Error('FIREBASE_ADMIN_KEY is not configured')

  cachedApp = initializeApp({ credential: cert(JSON.parse(serviceAccount)) })
  return cachedApp
}

export function getTranslendAdminDb(): Firestore {
  return getFirestore(getTranslendAdminApp())
}
