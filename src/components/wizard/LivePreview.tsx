'use client'

import { useEffect, useState, useCallback } from 'react'
import { ColorScheme } from '@/types'
import { Loader2 } from 'lucide-react'

interface LivePreviewProps {
  templateId: string
  values: Record<string, string>
  colorScheme: ColorScheme | null
  // For SVG templates
  svgUrl?: string
}

export function LivePreview({ templateId, values, colorScheme, svgUrl }: LivePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchPreview = useCallback(async () => {
    if (!colorScheme) return
    setLoading(true)
    try {
      if (svgUrl) {
        // SVG template: use render-svg endpoint
        const params = new URLSearchParams({
          svgUrl,
          values: JSON.stringify(values),
          colorScheme: JSON.stringify(colorScheme),
        })
        setPreviewUrl(`/api/render-svg?${params.toString()}`)
      } else {
        // JSX template: use legacy render endpoint
        const params = new URLSearchParams({
          templateId,
          values: JSON.stringify(values),
          colorScheme: JSON.stringify(colorScheme),
        })
        setPreviewUrl(`/api/render?${params.toString()}`)
      }
    } finally {
      setLoading(false)
    }
  }, [templateId, values, colorScheme, svgUrl])

  useEffect(() => {
    const timeout = setTimeout(fetchPreview, 500)
    return () => clearTimeout(timeout)
  }, [fetchPreview])

  return (
    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-zinc-900 shadow-2xl">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      )}
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Preview"
          className="w-full h-full object-contain"
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
          key={previewUrl}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-zinc-500 text-sm">Vista previa...</span>
        </div>
      )}
    </div>
  )
}
