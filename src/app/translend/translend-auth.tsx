'use client'

import { useEffect, useState } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { translendAuth } from '@/lib/translend/firebase/client'

export default function TranslendAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [message, setMessage] = useState('Checking sign-in state')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      translendAuth,
      (nextUser) => {
        setUser(nextUser)
        setMessage(nextUser ? `Signed in as ${nextUser.email ?? nextUser.uid}` : 'Not signed in')
      },
      (error) => setMessage(error.message),
    )

    return unsubscribe
  }, [])

  async function signIn() {
    setBusy(true)
    setMessage('Opening Google sign-in')
    try {
      const credential = await signInWithPopup(translendAuth, new GoogleAuthProvider())
      const idToken = await credential.user.getIdToken()
      const response = await fetch('/api/translend/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) throw new Error('Server token verification failed')
      setUser(credential.user)
      setMessage(`Signed in as ${credential.user.email ?? credential.user.uid}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Google sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  async function signOutUser() {
    setBusy(true)
    try {
      await signOut(translendAuth)
      setUser(null)
      setMessage('Not signed in')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sign-out failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 620 }}>
      <p style={{ margin: 0, color: '#53666c' }}>{message}</p>
      {user ? (
        <button type="button" onClick={signOutUser} disabled={busy}>
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      ) : (
        <button type="button" onClick={signIn} disabled={busy}>
          {busy ? 'Signing in…' : 'Continue with Google'}
        </button>
      )}
    </div>
  )
}
