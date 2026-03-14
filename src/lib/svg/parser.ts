import { XMLParser } from 'fast-xml-parser'
import { TemplateField, TextFieldConfig, ImageFieldConfig } from '@/types'

// Patterns that indicate Manny-managed fields
const MANNY_PATTERNS = [
  { prefix: 'manny-text-', type: 'text' as const, multiline: false },
  { prefix: 'manny-multiline-', type: 'text' as const, multiline: true },
  { prefix: 'manny-img-', type: 'image' as const, allowGenerate: true },
  { prefix: 'manny-logo-', type: 'logo' as const, allowGenerate: false },
]

/** Convert snake/kebab-case suffix to human-readable label */
function humanize(suffix: string): string {
  return suffix
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

/** Collect all element IDs recursively from parsed XML object */
function collectIds(node: unknown, ids: string[] = []): string[] {
  if (!node || typeof node !== 'object') return ids

  const obj = node as Record<string, unknown>

  // Check for @_id attribute (fast-xml-parser stores attributes with @_ prefix)
  const id = obj['@_id'] as string | undefined
  if (id) ids.push(id)

  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        collectIds(item, ids)
      }
    } else if (value && typeof value === 'object') {
      collectIds(value, ids)
    }
  }

  return ids
}

export function parseSvgFields(svgContent: string): TemplateField[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
  })

  let parsed: unknown
  try {
    parsed = parser.parse(svgContent)
  } catch {
    console.error('[svg/parser] Failed to parse SVG')
    return []
  }

  const ids = collectIds(parsed)
  const fields: TemplateField[] = []

  for (const id of ids) {
    for (const pattern of MANNY_PATTERNS) {
      if (id.startsWith(pattern.prefix)) {
        const suffix = id.slice(pattern.prefix.length)
        const label = humanize(suffix)

        if (pattern.type === 'text') {
          const multiline = pattern.multiline
          const config: TextFieldConfig = {
            maxLength: multiline ? 500 : 120,
            multiline,
          }
          fields.push({
            id,
            type: 'text',
            label,
            placeholder: `Ingresá ${label.toLowerCase()}`,
            required: true,
            config,
          })
        } else {
          // image or logo
          const config: ImageFieldConfig = {
            aspectRatio: '1:1',
            allowUpload: true,
            allowGenerate: pattern.type === 'image' ? pattern.allowGenerate! : false,
            generatePromptBase: pattern.type === 'image'
              ? `Imagen de ${label.toLowerCase()} para material de marketing`
              : '',
          }
          fields.push({
            id,
            type: pattern.type,
            label,
            helpText: pattern.type === 'image'
              ? 'Subí una imagen o generá una con IA'
              : 'Subí tu logo (PNG con fondo transparente recomendado)',
            required: false,
            config,
          })
        }
        break // matched — no need to check other patterns
      }
    }
  }

  return fields
}
