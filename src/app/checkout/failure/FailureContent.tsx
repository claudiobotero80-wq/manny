'use client'

import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { XCircle, Sparkles } from 'lucide-react'
import Link from 'next/link'

export function FailureContent() {
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
          <XCircle className="w-16 h-16 text-red-400" />
        </div>

        <h1 className="text-3xl font-extrabold mb-2">No se pudo procesar el pago</h1>
        <p className="text-zinc-400 mb-8">
          Algo salió mal con tu pago. Podés intentarlo de nuevo sin perder tu pieza.
        </p>

        <div className="space-y-3">
          {pieceId && (
            <Link href={`/checkout/${pieceId}`}>
              <Button
                size="lg"
                className="w-full bg-[#CCFF90] text-zinc-900 hover:bg-[#b8f070] font-bold"
              >
                Reintentar pago
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
