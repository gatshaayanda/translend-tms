'use client'

import dynamic from 'next/dynamic'

const TranslendAuthGate = dynamic(() => import('./translend-auth'), {
  ssr: false,
})

const TranslendShell = dynamic(() => import('./translend-shell'), {
  ssr: false,
})

export default function TranslendPage() {
  return (
    <TranslendAuthGate>
      <TranslendShell />
    </TranslendAuthGate>
  )
}
