'use client'

import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Clock, Sparkles } from 'lucide-react'
import Link from 'next/link'

export function PendingContent() {
  const searchParams = useSearchParams()
  const pieceId = searchParams.get('pieceId')

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-7 h-7 bg-[#CCFF90] rounded-lg flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
          </div>
          <span className="font-bold tracking-tight">Manny</span>
        </div>

        <div className="flex justify-center mb-4">
          <Clock className="w-16 h-16 text-yellow-400" />
        </div>

        <h1 className="text-3xl font-extrabold mb-2">Pago en proceso</h1>
        <p className="text-zinc-400 mb-8">
          Tu pago está siendo verificado. En cuanto se confirme, tu pieza quedará lista para descargar.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 text-sm text-zinc-400">
          Revisá tu email — te avisamos cuando esté listo.
        </div>

        <div className="space-y-3">
          {pieceId && (
            <Link href={`/checkout/success?pieceId=${pieceId}`}>
              <Button
                size="lg"
                className="w-full bg-yellow-400 text-zinc-900 hover:bg-yellow-300 font-bold"
              >
                Verificar estado del pago
              </Button>
            </Link>
          )}
          <Link href="/catalog">
            <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Volver al catálogo
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
