import { NextResponse } from 'next/server'
import { verifyTranslendIdToken } from '@/lib/translend/auth/verify-id-token'

export async function POST(request: Request) {
  try {
    const body = await request.json() as { idToken?: string }
    const decoded = await verifyTranslendIdToken(body.idToken ?? '')
    return NextResponse.json({ ok: true, uid: decoded.uid, email: decoded.email ?? null })
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid Firebase ID token' }, { status: 401 })
  }
}
