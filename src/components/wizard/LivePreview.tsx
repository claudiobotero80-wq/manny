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
 */
function replaceTextInSvg(svg: string, fieldId: string, value: string): string {
  const textPattern = new RegExp(
    `(<(?:text|tspan)[^>]*id="${fieldId}"[^>]*>)([\\s\\S]*?)(</(?:text|tspan)>)`,
    'g'
  )
  return svg.replace(textPattern, `$1${value}$3`)
}

/**
 * BUG-007 fix: Replace image inside <pattern> referenced by an element with id="fieldId".
 * 
 * Fixed: regex now handles ANY attribute order (Figma may put fill before id or vice versa).
 * Previous bug: regex required id BEFORE fill in the element tag.
 */
function replaceImageInSvg(svg: string, fieldId: string, imageUrl: string): string {
  // Find the opening tag of the element with this id (any attribute order)
  const elementTagMatch = svg.match(
    new RegExp(`<[^>]+id="${fieldId}"[^>]*>`)
  )

  if (elementTagMatch) {
    const elementTag = elementTagMatch[0]
    // Extract fill="url(#patternId)" from the tag (attribute order doesn't matter now)
    const fillMatch = elementTag.match(/fill="url\(#([^)]+)\)"/)
    if (fillMatch) {
      const patternId = fillMatch[1]
      // Replace href inside that pattern's <image> element
      const result = svg.replace(
        new RegExp(
          `(<pattern[^>]*id="${patternId}"[^>]*>[\\s\\S]*?<image[^>]*)(xlink:href|href)="[^"]*"`
        ),
        `$1$2="${imageUrl}"`
      )
      if (result !== svg) return result
    }
  }

  // Fallback: try direct href replacement on element with manny-img id
  return svg.replace(
    new RegExp(`(<[^>]+id="${fieldId}"[^>]*)(href|xlink:href)="[^"]*"`),
    `$1$2="${imageUrl}"`
  )
}

/** Apply all field values to the SVG string client-side */
function applyFieldsToSvg(svg: string, values: Record<string, string>): string {
  let result = svg
  for (const [fieldId, value] of Object.entries(values)) {
    if (!value) continue
    if (fieldId.startsWith('manny-text-') || fieldId.startsWith('manny-multiline-')) {
      result = replaceTextInSvg(result, fieldId, value)
    } else if (fieldId.startsWith('manny-img-') || fieldId.startsWith('manny-logo-')) {
      result = replaceImageInSvg(result, fieldId, value)
    }
  }
  return result
}

/**
 * Make SVG fill its container by overriding width/height with 100%.
 * Figma exports fixed pixel dimensions; we need it to be responsive.
 */
function makeSvgResponsive(svg: string): string {
  return svg.replace(/<svg([^>]*)>/, (match, attrs: string) => {
    // Remove fixed width/height attrs, keep viewBox
    const cleaned = attrs
      .replace(/\s+width="[^"]*"/, '')
      .replace(/\s+height="[^"]*"/, '')
    return `<svg${cleaned} style="width:100%;height:100%">`
  })
}

export function LivePreview({ templateId, values, colorScheme, svgUrl }: LivePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [rawSvg, setRawSvg] = useState<string | null>(null)

  // Fetch the raw SVG once when svgUrl changes
  useEffect(() => {
    if (!svgUrl) {
      setRawSvg(null)
      setSvgContent(null)
      return
    }
    setLoading(true)
    fetch(svgUrl)
      .then((r) => r.text())
      .then((text) => setRawSvg(text))
      .catch((err) => {
        console.error('[LivePreview] Failed to fetch SVG:', err)
        setRawSvg(null)
      })
      .finally(() => setLoading(false))
  }, [svgUrl])

  const fetchPreview = useCallback(async () => {
    if (!colorScheme) return

    if (svgUrl) {
      if (!rawSvg) return

      // BUG-006 fix: Render client-side as inline SVG (no server round-trip, no data URI size limit)
      // dangerouslySetInnerHTML allows browser to handle fonts + external images natively
      let modified = applyColorTokens(rawSvg, colorScheme)
      modified = applyFieldsToSvg(modified, values)
      modified = makeSvgResponsive(modified)
      setSvgContent(modified)
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

      {/* SVG templates: inline rendering (BUG-006 fix — avoids data URI size limit) */}
      {svgContent ? (
        <div
          className="w-full h-full"
          // Safe: SVG comes from Juan's admin uploads, not user input
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      ) : previewUrl ? (
        // JSX templates: server-rendered PNG
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
