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

/**
 * Replace all fill/stroke colors inside a <g id="manny-color-[id]"> group.
 * Skips fill="none" and fill="url(...)" (patterns/gradients).
 */
function replaceColorInSvg(svg: string, fieldId: string, colorValue: string): string {
  const groupMatch = svg.match(
    new RegExp(`(<g[^>]*id="${fieldId}"[^>]*>)([\\s\\S]*?)(</g>)`)
  )
  if (!groupMatch) return svg

  const [fullMatch, open, inner, close] = groupMatch
  const updatedInner = inner
    .replace(/fill="([^"]+)"/g, (m, val) =>
      val === 'none' || val.startsWith('url(') ? m : `fill="${colorValue}"`
    )
    .replace(/stroke="([^"]+)"/g, (m, val) =>
      val === 'none' || val.startsWith('url(') ? m : `stroke="${colorValue}"`
    )
  return svg.replace(fullMatch, `${open}${updatedInner}${close}`)
}

/** Apply color token replacements to SVG string (JSX templates with colorScheme) */
function applyColorTokens(svg: string, colorScheme: ColorScheme): string {
  // Only used for JSX templates — SVG templates use manny-color-* groups instead
  const COLOR_TOKEN_MAP: Record<string, keyof ColorScheme> = {
    '#FF0099': 'primary', '#ff0099': 'primary',
    '#00FF99': 'secondary', '#00ff99': 'secondary',
    '#FFFF00': 'background', '#ffff00': 'background',
    '#FF6600': 'text', '#ff6600': 'text',
  }
  let result = svg
  for (const [token, key] of Object.entries(COLOR_TOKEN_MAP)) {
    const colorValue = colorScheme[key] as string
    if (colorValue) result = result.split(token).join(colorValue)
  }
  return result
}

/**
 * Auto-wrap text into SVG tspan elements using canvas text measurement.
 * Uses the original SVG tspans to infer: x position, startY, lineHeight, fontSize, fontFamily.
 * Uses the original tspan content widths to infer maxWidth (the column width the designer intended).
 * Returns a string of <tspan> elements ready to be inserted inside a <text> element.
 */
function autoWrapTextToTspans(
  value: string,
  originalInner: string,
  openTag: string
): string {
  // Extract all original tspans
  const tspanMatches = [...originalInner.matchAll(/<tspan([^>]*)>([^<]*)<\/tspan>/g)]
  if (!tspanMatches.length) return value

  // x, startY from first tspan
  const firstAttrs = tspanMatches[0][1]
  const xStr = firstAttrs.match(/\bx="([^"]+)"/)?.[1] ?? '0'
  const yStr = firstAttrs.match(/\by="([^"]+)"/)?.[1] ?? '0'
  const x = parseFloat(xStr)
  const startY = parseFloat(yStr)

  // lineHeight = y delta between first two tspans (default: fontSize * 1.2)
  const fontSizeStr = openTag.match(/font-size="([^"]+)"/)?.[1] ?? '16'
  const fontSize = parseFloat(fontSizeStr)
  let lineHeight = fontSize * 1.25
  if (tspanMatches.length > 1) {
    const y2Str = tspanMatches[1][1].match(/\by="([^"]+)"/)?.[1]
    if (y2Str) lineHeight = parseFloat(y2Str) - startY
  }

  // fontFamily from <text> tag
  const fontFamily = openTag.match(/font-family="([^"]+)"/)?.[1] ?? 'sans-serif'

  // maxWidth: measure longest original tspan content with canvas
  let maxWidth = fontSize * 20 // safe fallback
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.font = `${fontSize}px ${fontFamily}`
      const widths = tspanMatches.map((m) => ctx.measureText(m[2].trim()).width)
      maxWidth = Math.max(...widths, fontSize * 10)
    }
  }

  // Word-wrap user text into lines
  const words = value.split(' ').filter((w) => w.length > 0)
  const lines: string[] = []
  let current = ''

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.font = `${fontSize}px ${fontFamily}`
      for (const word of words) {
        const test = current ? `${current} ${word}` : word
        if (ctx.measureText(test).width > maxWidth && current) {
          lines.push(current)
          current = word
        } else {
          current = test
        }
      }
    }
  }
  if (current) lines.push(current)
  if (!lines.length) lines.push(value)

  // Generate tspan elements
  return lines
    .map((line, i) => `<tspan x="${xStr}" y="${startY + i * lineHeight}">${line}</tspan>`)
    .join('\n')
}

/**
 * Replace text content of SVG <text> elements by id, with auto word-wrap.
 * Uses canvas.measureText() to distribute user text across tspan lines
 * matching the column width from the original SVG design.
 */
function replaceTextInSvg(svg: string, fieldId: string, value: string): string {
  const textPattern = new RegExp(
    `(<text[^>]*id="${fieldId}"[^>]*>)([\\s\\S]*?)(</text>)`,
    'g'
  )

  const replaced = svg.replace(textPattern, (match, open, inner, close) => {
    const wrappedTspans = autoWrapTextToTspans(value, inner, open)
    return `${open}${wrappedTspans}${close}`
  })

  if (replaced !== svg) return replaced

  // Fallback: tspan with direct id
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
    } else if (fieldId.startsWith('manny-color-')) {
      result = replaceColorInSvg(result, fieldId, value)
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
