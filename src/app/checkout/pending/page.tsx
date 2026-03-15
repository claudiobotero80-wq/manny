import { Suspense } from 'react'
import { PendingContent } from './PendingContent'

export default function PendingPage() {
  return (
    <Suspense>
      <PendingContent />
    </Suspense>
  )
}
