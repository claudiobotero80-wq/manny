'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Download, Sparkles, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export function SuccessContent() {
  const searchParams = useSearchParams()
  const pieceId = searchParams.get('pieceId')
  const router = useRouter()

  const previewUrl = pieceId
    ? `/api/download/${pieceId}`
    : null

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
          <CheckCircle className="w-16 h-16 text-[#CCFF90]" />
        </div>

        <h1 className="text-3xl font-extrabold mb-2">¡Pago aprobado!</h1>
        <p className="text-zinc-400 mb-8">
          Tu pieza está siendo generada. En unos segundos estará lista para descargar.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4 mb-6">
          {previewUrl && (
            <a
              href={previewUrl}
              download
              className="block"
            >
              <Button
                size="lg"
                className="w-full bg-[#CCFF90] text-zinc-900 hover:bg-[#b8f070] font-bold flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Descargar mi pieza (PNG)
              </Button>
            </a>
          )}
          <Link href="/catalog">
            <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Crear otra pieza
            </Button>
          </Link>
        </div>

        <p className="text-xs text-zinc-600">
          ¿El botón no funciona todavía? Esperá unos segundos y recargá la página.
        </p>
      </div>
    </main>
  )
}
