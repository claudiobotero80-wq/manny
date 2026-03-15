'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, ShoppingBag, Sparkles } from 'lucide-react'
import { PIECE_PRICE_LABEL } from '@/lib/pricing'

interface Piece {
  id: string
  template_id: string
  fields_json: Record<string, string>
  colors_json: Record<string, unknown>
  status: string
  price_ars: number
}

export function CheckoutClient({ piece }: { piece: Piece }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const previewParams = new URLSearchParams({
    templateId: piece.template_id,
    values: JSON.stringify(piece.fields_json),
    colorScheme: JSON.stringify(piece.colors_json),
  })
  const previewUrl = `/api/render?${previewParams.toString()}`

  async function handlePay() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pieceId: piece.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al crear el pago')
        setLoading(false)
        return
      }
      // Redirect to MP
      window.location.href = data.init_point
    } catch (err) {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 bg-[#CCFF90] rounded-lg flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
          </div>
          <span className="font-bold tracking-tight">Manny</span>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-start">
          {/* Left: Order info */}
          <div>
            <h1 className="text-3xl font-extrabold mb-2">Tu pieza está lista</h1>
            <p className="text-zinc-400 mb-8">
              Completá el pago para descargar tu PNG en alta resolución.
            </p>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Pieza</span>
                <span className="font-medium capitalize">{piece.template_id.replace(/-/g, ' ')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Formato</span>
                <span className="font-medium">PNG 1080×1080</span>
              </div>
              <div className="border-t border-zinc-800 pt-4 flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-extrabold text-[#CCFF90]">{PIECE_PRICE_LABEL}</span>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm mt-4">{error}</p>
            )}

            <Button
              onClick={handlePay}
              disabled={loading}
              size="lg"
              className="mt-6 w-full bg-[#009EE3] hover:bg-[#008cc9] text-white font-bold text-lg flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ShoppingBag className="w-5 h-5" />
              )}
              Pagar con Mercado Pago →
            </Button>

            <p className="text-xs text-zinc-500 text-center mt-3">
              Pago seguro procesado por Mercado Pago
            </p>
          </div>

          {/* Right: Preview */}
          <div>
            <p className="text-sm text-zinc-500 mb-3 text-center">Vista previa de tu pieza</p>
            <div className="rounded-xl overflow-hidden aspect-square shadow-2xl bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Preview de tu pieza"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
