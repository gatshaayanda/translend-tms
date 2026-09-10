import 'server-only'

import { getAuth } from 'firebase-admin/auth'
import { getTranslendAdminApp } from '@/lib/translend/firebase/admin'

export async function verifyTranslendIdToken(idToken: string) {
  if (!idToken) throw new Error('Missing Firebase ID token')
  return getAuth(getTranslendAdminApp()).verifyIdToken(idToken)
}
