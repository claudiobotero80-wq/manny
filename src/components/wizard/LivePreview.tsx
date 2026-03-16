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

/** Color tokens used by Figma → map to colorScheme properties */
const COLOR_TOKEN_MAP: Record<string, keyof ColorScheme> = {
  '#FF0099': 'primary',
  '#ff0099': 'primary',
  '#00FF99': 'secondary',
  '#00ff99': 'secondary',
  '#FFFF00': 'background',
  '#ffff00': 'background',
  '#FF6600': 'text',
  '#ff6600': 'text',
}

/** Apply color token replacements to SVG string */
function applyColorTokens(svg: string, colorScheme: ColorScheme): string {
  let result = svg
  for (const [token, key] of Object.entries(COLOR_TOKEN_MAP)) {
    const colorValue = colorScheme[key] as string
    if (colorValue) {
      result = result.split(token).join(colorValue)
    }
  }
  return result
}

/**
 * BUG-006 fix: Replace text content of SVG <text>/<tspan> elements by id.
 * Pattern: (<(text|tspan)[^>]*id="fieldId"[^>]*>)(content)(</...>)
 */
function replaceTextInSvg(svg: string, fieldId: string, value: string): string {
  // Replace content inside <text id="fieldId">...</text>
  const textPattern = new RegExp(
    `(<(?:text|tspan)[^>]*id="${fieldId}"[^>]*>)([\\s\\S]*?)(</(?:text|tspan)>)`,
    'g'
  )
  const replaced = svg.replace(textPattern, `$1${value}$3`)
  if (replaced !== svg) return replaced

  // Also try nested: <text ...><tspan id="fieldId">...</tspan></text>
  return replaced
}

/**
 * BUG-007 fix: Replace image inside <pattern> referenced by an element with id="fieldId".
 * Figma exports: <rect id="manny-img-X" fill="url(#patternXXX)"> with <image> inside <pattern id="patternXXX">.
 */
function replaceImageInSvg(svg: string, fieldId: string, imageUrl: string): string {
  // Find the element with this id and extract its fill="url(#patternId)"
  const elMatch = svg.match(
    new RegExp(`<[^>]+id="${fieldId}"[^>]+fill="url\\(#([^)]+)\\)"[^>]*>`)
  )
  if (elMatch) {
    const patternId = elMatch[1]
    // Replace href inside that pattern's <image> element
    const result = svg.replace(
      new RegExp(
        `(<pattern[^>]*id="${patternId}"[^>]*>[\\s\\S]*?<image[^>]*)(xlink:href|href)="[^"]*"`
      ),
      `$1$2="${imageUrl}"`
    )
    if (result !== svg) return result
  }

  // Fallback: try direct href replacement on element with manny-img id
  return svg.replace(
    new RegExp(`(<[^>]+id="${fieldId}"[^>]*)(href|xlink:href)="[^"]*"`),
    `$1$2="${imageUrl}"`
  )
}

/**
 * Apply all field values to the SVG string client-side.
 * BUG-006: text fields become visible without going through resvg
 * BUG-007: image fields update the pattern-referenced <image> element
 */
function applyFieldsToSvg(
  svg: string,
  values: Record<string, string>
): string {
  let result = svg
  for (const [fieldId, value] of Object.entries(values)) {
    if (!value) continue

    if (
      fieldId.startsWith('manny-text-') ||
      fieldId.startsWith('manny-multiline-')
    ) {
      result = replaceTextInSvg(result, fieldId, value)
    } else if (
      fieldId.startsWith('manny-img-') ||
      fieldId.startsWith('manny-logo-')
    ) {
      result = replaceImageInSvg(result, fieldId, value)
    }
  }
  return result
}

export function LivePreview({ templateId, values, colorScheme, svgUrl }: LivePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // BUG-006: raw SVG fetched once and reused for client-side rendering
  const [rawSvg, setRawSvg] = useState<string | null>(null)

  // Fetch the raw SVG once when svgUrl changes
  useEffect(() => {
    if (!svgUrl) {
      setRawSvg(null)
      return
    }
    setLoading(true)
    fetch(svgUrl)
      .then((r) => r.text())
      .then((text) => {
        setRawSvg(text)
      })
      .catch((err) => {
        console.error('[LivePreview] Failed to fetch SVG:', err)
        setRawSvg(null)
      })
      .finally(() => setLoading(false))
  }, [svgUrl])

  const fetchPreview = useCallback(async () => {
    if (!colorScheme) return

    if (svgUrl) {
      if (!rawSvg) return // still loading or failed

      // BUG-006 fix: Apply substitutions client-side — no server round-trip needed
      // This avoids resvg's font loading failure for Figma fonts
      let modifiedSvg = applyColorTokens(rawSvg, colorScheme)
      modifiedSvg = applyFieldsToSvg(modifiedSvg, values)

      // Encode as data URI for the <img> tag
      setPreviewUrl(
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(modifiedSvg)}`
      )
    } else {
      // JSX template: use legacy render endpoint
      setLoading(true)
      const params = new URLSearchParams({
        templateId,
        values: JSON.stringify(values),
        colorScheme: JSON.stringify(colorScheme),
      })
      setPreviewUrl(`/api/render?${params.toString()}`)
      setLoading(false)
    }
  }, [templateId, values, colorScheme, svgUrl, rawSvg])

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
