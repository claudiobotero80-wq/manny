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
 * BUG-007 fix: Update the href of the first <image> inside a <pattern> with the given id.
 * Figma exports images as <rect fill="url(#patternXXX)"> with the actual <image> inside <defs><pattern>.
 */
function updatePatternImage(
  node: unknown,
  patternId: string,
  imageUrl: string
): boolean {
  if (!node || typeof node !== 'object') return false

  const obj = node as Record<string, unknown>

  // Check if this node is a <pattern> with the target id
  const nodeId = obj['@_id'] as string | undefined
  if (nodeId === patternId) {
    // Find the first <image> inside this pattern and update its href
    const imageEl = obj['image'] as Record<string, unknown> | undefined
    if (imageEl) {
      imageEl['@_href'] = imageUrl
      imageEl['@_xlink:href'] = imageUrl
      return true
    }
    // Could be an array of images
    const images = obj['image'] as Array<Record<string, unknown>> | undefined
    if (Array.isArray(images) && images.length > 0) {
      images[0]['@_href'] = imageUrl
      images[0]['@_xlink:href'] = imageUrl
      return true
    }
  }

  // Recurse into children
  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if (Array.isArray(value)) {
      for (const item of value) {
        if (updatePatternImage(item, patternId, imageUrl)) return true
      }
    } else if (value && typeof value === 'object') {
      if (updatePatternImage(value, patternId, imageUrl)) return true
    }
  }

  return false
}

/**
 * Render an SVG template with field values and color scheme.
 *
 * Strategy:
 * 1. String-replace color tokens first (simple & reliable)
 * 2. Inject fallback font style for resvg (BUG-006 Part B)
 * 3. Parse XML and mutate field values
 * 4. Serialize back to SVG string
 */
export function renderSvg(
  svgContent: string,
  values: Record<string, string>,
  colorScheme: ColorScheme
): string {
  // Step 1: Replace color tokens globally (before XML parsing)
  let svg = applyColorTokens(svgContent, colorScheme)

  // Step 2: BUG-006 Part B — inject fallback font style so resvg renders text
  // when Figma's external fonts are unavailable
  if (!svg.includes('font-family: sans-serif')) {
    svg = svg.replace(
      '</svg>',
      '<style>text, tspan { font-family: sans-serif; }</style></svg>'
    )
  }

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

  // Step 3: Apply field values
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
      // BUG-007 fix: Image replacement
      // Figma exports images as <rect fill="url(#patternXXX)"> with the real
      // <image> inside <defs><pattern id="patternXXX">. We need to update both.
      mutateById(parsed, fieldId, (el) => {
        // Update href directly (handles actual <image> elements)
        el['@_href'] = value
        el['@_xlink:href'] = value

        // Check if this element references a pattern (Figma's typical export)
        const fill = el['@_fill'] as string | undefined
        if (fill) {
          const match = fill.match(/url\(#([^)]+)\)/)
          if (match) {
            updatePatternImage(parsed, match[1], value)
          }
        }
      })
    }
  }

  // Step 4: Serialize back
  try {
    const result = builder.build(parsed) as string
    return result
  } catch {
    console.error('[svg/renderer] Failed to serialize SVG')
    return svg
  }
}
