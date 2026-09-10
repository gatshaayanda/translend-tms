import dynamic from 'next/dynamic'

const TranslendAuthGate = dynamic(() => import('./translend-auth'), {
  ssr: false,
})

export default function TranslendPage() {
  return (
    <TranslendAuthGate>
      <div />
    </TranslendAuthGate>
  )
}
