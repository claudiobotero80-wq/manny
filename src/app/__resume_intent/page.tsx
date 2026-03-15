'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const WIZARD_INTENT_KEY = 'manny_wizard_intent'

export default function ResumeIntentPage() {
  const router = useRouter()

  useEffect(() => {
    async function resume() {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(WIZARD_INTENT_KEY) : null
      if (!raw) {
        router.push('/catalog')
        return
      }

      try {
        const intent = JSON.parse(raw)
        const { templateId, fields, colors } = intent

        const res = await fetch('/api/pieces/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId, fields, colors }),
        })

        const data = await res.json()
        if (!res.ok || !data.pieceId) {
          router.push('/catalog')
          return
        }

        localStorage.removeItem(WIZARD_INTENT_KEY)
        router.push(`/checkout/${data.pieceId}`)
      } catch {
        router.push('/catalog')
      }
    }

    resume()
  }, [router])

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#CCFF90]" />
        <p>Recuperando tu pieza...</p>
      </div>
    </main>
  )
}
