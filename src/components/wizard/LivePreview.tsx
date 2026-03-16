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
 * BUG-006 fix (v2): Replace text content of SVG <text> elements by id.
 *
 * CRITICAL: closing tag must be </text>, NOT </(?:text|tspan)>.
 * Non-greedy regex would match the first inner </tspan>, producing malformed SVG
 * like <text ...>value</tspan> which the browser silently drops.
 *
 * BUG-008 fix: must preserve the first <tspan x y> wrapper.
 * Replacing the full innerHTML with raw text strips x/y positioning attributes
 * → text renders at SVG default position (often outside visible area).
 * Strategy: extract first tspan's x/y, inject value inside it, drop remaining tspans.
 */
function replaceTextInSvg(svg: string, fieldId: string, value: string): string {
  // Match the full <text id="fieldId"...>...</text> element
  const textPattern = new RegExp(
    `(<text[^>]*id="${fieldId}"[^>]*>)([\\s\\S]*?)(</text>)`,
    'g'
  )

  const replaced = svg.replace(textPattern, (match, open, inner, close) => {
    // Extract x and y from the first <tspan> inside the text element
    const tspanMatch = inner.match(/<tspan([^>]*)>/)
    if (tspanMatch) {
      const tspanAttrs = tspanMatch[1]
      // Preserve x and y positioning, inject new value
      return `${open}<tspan${tspanAttrs}>${value}</tspan>${close}`
    }
    // No tspan found — inject value directly (text element has direct content)
    return `${open}${value}${close}`
  })

  if (replaced !== svg) return replaced

  // Fallback: tspan with direct id (less common in Figma exports)
  const tspanPattern = new RegExp(
    `(<tspan[^>]*id="${fieldId}"[^>]*>)([^<]*)(</tspan>)`,
    'g'
  )
  return svg.replace(tspanPattern, `$1${value}$3`)
}

/**
 * BUG-007 fix (v2): Replace image for a field that may be a <g> group (Figma export).
 *
 * Figma exports image layers as:
 *   <g id="manny-img-foto">
 *     <rect x y w h rx fill="#D9D9D9"/>          ← gray placeholder
 *     <rect x y w h rx fill="url(#patternId)"/>  ← actual image via pattern
 *   </g>
 * Pattern chain: <pattern id="patternId"> → <use xlink:href="#imageId"> → <image id="imageId" href="data:..."/>
 *
 * Strategy: extract rect dimensions from the group, then inject a clean <image>+<clipPath>.
 * Also handles plain <rect id="manny-img-*" fill="url(#...)"> and <image id="manny-img-*"> elements.
 */
function replaceImageInSvg(svg: string, fieldId: string, imageUrl: string): string {
  // --- Case 1: <g id="manny-img-*"> group (Figma standard export) ---
  const groupMatch = svg.match(
    new RegExp(`<g id="${fieldId}"[^>]*>([\\s\\S]*?)</g>`)
  )
  if (groupMatch) {
    const groupContent = groupMatch[1]
    // Extract dimensions from the first <rect> inside the group
    const rectMatch = groupContent.match(
      /<rect\s+([^/]*?)\/?>/ // first rect tag in the group
    )
    if (rectMatch) {
      const rectAttrs = rectMatch[1]
      const x = rectAttrs.match(/\bx="([^"]*)"/)
      const y = rectAttrs.match(/\by="([^"]*)"/)
      const w = rectAttrs.match(/\bwidth="([^"]*)"/)
      const h = rectAttrs.match(/\bheight="([^"]*)"/)
      const rx = rectAttrs.match(/\brx="([^"]*)"/)
      if (x && y && w && h) {
        const clipId = `clip-${fieldId}`
        const newGroup = `<g id="${fieldId}">
<clipPath id="${clipId}"><rect x="${x[1]}" y="${y[1]}" width="${w[1]}" height="${h[1]}"${rx ? ` rx="${rx[1]}"` : ''}/></clipPath>
<image href="${imageUrl}" x="${x[1]}" y="${y[1]}" width="${w[1]}" height="${h[1]}" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>
</g>`
        return svg.replace(groupMatch[0], newGroup)
      }
    }
  }

  // --- Case 2: <rect id="manny-img-*" fill="url(#patternId)"> ---
  const rectTagMatch = svg.match(
    new RegExp(`<[^>]+id="${fieldId}"[^>]*>`)
  )
  if (rectTagMatch) {
    const elementTag = rectTagMatch[0]
    const fillMatch = elementTag.match(/fill="url\(#([^)]+)\)"/)
    if (fillMatch) {
      const patternId = fillMatch[1]
      // Find the image ID referenced via <use xlink:href="#imageId"> inside the pattern
      const patternMatch = svg.match(
        new RegExp(`<pattern[^>]*id="${patternId}"[^>]*>([\\s\\S]*?)</pattern>`)
      )
      if (patternMatch) {
        const useMatch = patternMatch[1].match(/xlink:href="#([^"]+)"/)
        if (useMatch) {
          const imageId = useMatch[1]
          // Update the actual <image> element's href
          return svg.replace(
            new RegExp(`(<image[^>]*id="${imageId}"[^>]*)(xlink:href|href)="[^"]*"`),
            `$1$2="${imageUrl}"`
          )
        }
      }
      // Fallback: directly update href inside pattern
      return svg.replace(
        new RegExp(`(<pattern[^>]*id="${patternId}"[^>]*>[\\s\\S]*?<image[^>]*)(xlink:href|href)="[^"]*"`),
        `$1$2="${imageUrl}"`
      )
    }
  }

  // --- Case 3: direct <image id="manny-img-*"> element ---
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
