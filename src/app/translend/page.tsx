import TranslendAuthGate from './translend-auth'
import TranslendShell from './translend-shell'

export default function TranslendPage() {
  return (
    <TranslendAuthGate>
      <TranslendShell />
    </TranslendAuthGate>
  )
}
