import 'server-only'

import { getAuth } from 'firebase-admin/auth'
import { translendAdminApp } from '@/lib/translend/firebase/admin'

export async function verifyTranslendIdToken(idToken: string) {
  if (!idToken) throw new Error('Missing Firebase ID token')
  return getAuth(translendAdminApp).verifyIdToken(idToken)
}
