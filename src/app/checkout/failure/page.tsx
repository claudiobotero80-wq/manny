import { Suspense } from 'react'
import { FailureContent } from './FailureContent'

export default function FailurePage() {
  return (
    <Suspense>
      <FailureContent />
    </Suspense>
  )
}
