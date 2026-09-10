'use client'

import { useState } from 'react'
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { translendAuth } from '@/lib/translend/firebase/client'

export default function TranslendAuth() {
  const [message, setMessage] = useState('Not signed in')
  const [busy, setBusy] = useState(false)

  async function signIn() {
    setBusy(true)
    try {
      const credential = await signInWithPopup(translendAuth, new GoogleAuthProvider())
      const idToken = await credential.user.getIdToken()
      const response = await fetch('/api/translend/auth/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      if (!response.ok) throw new Error('Server token verification failed')
      setMessage(`Signed in as ${credential.user.email ?? credential.user.uid}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Google sign-in failed')
    } finally { setBusy(false) }
  }

  async function signOutUser() {
    await signOut(translendAuth)
    setMessage('Not signed in')
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" onClick={signIn} disabled={busy}>{busy ? 'Signing in…' : 'Continue with Google'}</button>
      <button type="button" onClick={signOutUser}>Sign out</button>
      <span>{message}</span>
    </div>
  )
}
