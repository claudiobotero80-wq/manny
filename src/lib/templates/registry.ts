import { Template, SvgTemplate } from '@/types'
import promoRestaurante from './promo-restaurante'

// Supabase config (read from env at runtime)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Hardcoded JSX templates (legacy / fallback)
export const hardcodedTemplates: Template[] = [promoRestaurante]

// Fetch SVG templates from Supabase manny_templates table
export async function fetchSvgTemplates(): Promise<SvgTemplate[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return []
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/manny_templates?active=eq.true&type=eq.svg&select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        next: { revalidate: 60 },
      } as RequestInit
    )
    if (!res.ok) return []
    const rows = await res.json() as Array<{
      id: string
      name: string
      description: string
      category: string
      preview_image: string
      dimensions: { width: number; height: number }
      type: string
      svg_url: string
      color_schemes: SvgTemplate['colorSchemes']
    }>

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      category: row.category ?? 'general',
      previewImage: row.preview_image ?? '',
      dimensions: row.dimensions ?? { width: 1080, height: 1080 },
      type: 'svg' as const,
      svgUrl: row.svg_url,
      colorSchemes: row.color_schemes ?? [],
    }))
  } catch {
    return []
  }
}

// Synchronous helpers (for client-side use with cached data)
export const templates: Template[] = hardcodedTemplates

export function getTemplate(id: string): Template | undefined {
  return hardcodedTemplates.find((t) => t.id === id)
}

export function getTemplatesByCategory(category: string): Template[] {
  return hardcodedTemplates.filter((t) => t.category === category)
}
