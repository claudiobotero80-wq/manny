import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { ColorScheme } from '@/types'

/** Color tokens used by Juan in Figma → map to colorScheme properties */
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

/** Replace color tokens in any string value */
function replaceColorTokens(value: string, colorScheme: ColorScheme): string {
  let result = value
  for (const [token, key] of Object.entries(COLOR_TOKEN_MAP)) {
    const colorValue = colorScheme[key] as string
    if (colorValue) {
      // Case-insensitive replacement (handle both uppercase and lowercase hex)
      result = result.split(token).join(colorValue)
    }
  }
  return result
}

/** Apply color token replacement across entire SVG string (simpler and more reliable) */
function applyColorTokens(svgContent: string, colorScheme: ColorScheme): string {
  let result = svgContent
  for (const [token, key] of Object.entries(COLOR_TOKEN_MAP)) {
    const colorValue = colorScheme[key] as string
    if (colorValue) {
      result = result.split(token).join(colorValue)
    }
  }
  return result
}

/** Find an element by id in the parsed XML tree and apply a mutation */
function mutateById(
  node: unknown,
  targetId: string,
  mutate: (el: Record<string, unknown>) => void
): boolean {
  if (!node || typeof node !== 'object') return false

  const obj = node as Record<string, unknown>
  const id = obj['@_id'] as string | undefined

  if (id === targetId) {
    mutate(obj)
    return true
  }

  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if (Array.isArray(value)) {
      for (const item of value) {
        if (mutateById(item, targetId, mutate)) return true
      }
    } else if (value && typeof value === 'object') {
      if (mutateById(value, targetId, mutate)) return true
    }
  }

  return false
}

/**
 * Render an SVG template with field values and color scheme.
 *
 * Strategy:
 * 1. String-replace color tokens first (simple & reliable)
 * 2. Parse XML and mutate field values
 * 3. Serialize back to SVG string
 */
export function renderSvg(
  svgContent: string,
  values: Record<string, string>,
  colorScheme: ColorScheme
): string {
  // Step 1: Replace color tokens globally (before XML parsing)
  let svg = applyColorTokens(svgContent, colorScheme)

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    // Preserve text content
    parseTagValue: false,
    trimValues: false,
  })

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: false,
    suppressEmptyNode: false,
  })

  let parsed: Record<string, unknown>
  try {
    parsed = parser.parse(svg) as Record<string, unknown>
  } catch {
    console.error('[svg/renderer] Failed to parse SVG')
    return svgContent
  }

  // Step 2: Apply field values
  for (const [fieldId, value] of Object.entries(values)) {
    if (!value) continue

    if (
      fieldId.startsWith('manny-text-') ||
      fieldId.startsWith('manny-multiline-')
    ) {
      // Text replacement: update the #text content of matching element
      mutateById(parsed, fieldId, (el) => {
        // SVG text elements have #text or tspan children
        if (el['tspan']) {
          const tspan = el['tspan']
          if (Array.isArray(tspan)) {
            el['tspan'] = tspan.map((t: Record<string, unknown>) => ({
              ...t,
              '#text': value,
            }))
          } else if (typeof tspan === 'object') {
            ;(el['tspan'] as Record<string, unknown>)['#text'] = value
          }
        } else {
          el['#text'] = value
        }
      })
    } else if (
      fieldId.startsWith('manny-img-') ||
      fieldId.startsWith('manny-logo-')
    ) {
      // Image replacement: update href or xlink:href on <image> element
      // or convert <rect> to <image>
      mutateById(parsed, fieldId, (el) => {
        // If it's already an image element, update href
        el['@_href'] = value
        el['@_xlink:href'] = value
        // Make sure it preserves dimensions (width/height attrs stay)
      })
    }
  }

  // Step 3: Serialize back
  try {
    const result = builder.build(parsed) as string
    return result
  } catch {
    console.error('[svg/renderer] Failed to serialize SVG')
    return svg
  }
}
