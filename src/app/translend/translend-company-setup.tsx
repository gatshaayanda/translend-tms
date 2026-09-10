'use client'

import { FormEvent, useMemo, useState } from 'react'
import { User } from 'firebase/auth'
import { createTranslendWorkspace } from '@/lib/translend/workspace'

type Props = { user: User; onCreated: (organizationId: string) => void }

export default function TranslendCompanySetup({ user, onCreated }: Props) {
  const [companyName, setCompanyName] = useState('')
  const [country, setCountry] = useState('')
  const [currency, setCurrency] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!companyName.trim()) return
    setBusy(true)
    setError('')
    try {
      const organizationId = await createTranslendWorkspace({
        user: { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL },
        companyName,
        country,
        currency,
        timezone,
      })
      onCreated(organizationId)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'We could not create your workspace.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={centerStyle}>
      <section style={cardStyle}>
        <div style={logoStyle}>T</div>
        <span style={eyebrowStyle}>FIRST TIME SETUP</span>
        <h1 style={headingStyle}>Set up your company workspace.</h1>
        <p style={copyStyle}>Create the private workspace your team will use for real transport operations. You can add the operational records after you enter.</p>
        <form onSubmit={submit}>
          <label style={labelStyle}>Company name<input autoFocus required value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="e.g. Acme Transport" style={inputStyle} /></label>
          <div style={gridStyle}>
            <label style={labelStyle}>Country<input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Country" style={inputStyle} /></label>
            <label style={labelStyle}>Currency<input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} placeholder="e.g. BWP" maxLength={3} style={inputStyle} /></label>
          </div>
          <div style={timezoneStyle}>Timezone <strong>{timezone}</strong> · detected from this device</div>
          {error && <div style={errorStyle}>{error}</div>}
          <button disabled={busy || !companyName.trim()} style={{ ...primaryStyle, opacity: busy || !companyName.trim() ? .65 : 1 }}>{busy ? 'Creating workspace…' : 'Create company workspace'}</button>
        </form>
        <small style={smallStyle}>You will become the Owner of this workspace. Your company data is kept separate from other Translend companies.</small>
      </section>
    </main>
  )
}

const centerStyle = { minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#eef2f4', padding: 20, fontFamily: 'Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif' } as const
const cardStyle = { width: 'min(100%, 560px)', background: '#fff', border: '1px solid #e3e8ec', borderRadius: 18, padding: 30, boxShadow: '0 18px 55px rgba(14,42,48,.10)' } as const
const logoStyle = { width: 48, height: 48, borderRadius: 13, display: 'grid', placeItems: 'center', background: '#0c6c7d', color: '#fff', fontSize: 25, fontWeight: 900 } as const
const eyebrowStyle = { display: 'block', marginTop: 20, color: '#0c6c7d', fontSize: 10, fontWeight: 900, letterSpacing: '.13em' } as const
const headingStyle = { margin: '8px 0 6px', fontSize: 30, letterSpacing: '-.04em' } as const
const copyStyle = { margin: '0 0 22px', color: '#607278', lineHeight: 1.6 } as const
const labelStyle = { display: 'grid', gap: 7, marginBottom: 14, color: '#53666c', fontSize: 11, fontWeight: 800 } as const
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '12px 11px', border: '1px solid #d8e0e4', borderRadius: 9, fontSize: 13, color: '#243b41', outline: 'none' } as const
const gridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } as const
const timezoneStyle = { padding: 11, margin: '2px 0 14px', borderRadius: 9, background: '#f4f7f8', color: '#718188', fontSize: 11 } as const
const primaryStyle = { width: '100%', padding: '12px 14px', border: '1px solid #0c6c7d', borderRadius: 9, background: '#0c6c7d', color: '#fff', fontWeight: 850, cursor: 'pointer' } as const
const errorStyle = { margin: '0 0 14px', padding: 11, borderRadius: 8, background: '#fde8e8', color: '#9f3030', fontSize: 12, lineHeight: 1.5 } as const
const smallStyle = { display: 'block', marginTop: 16, color: '#91a0a5', lineHeight: 1.5 } as const
