import { NextRequest, NextResponse } from 'next/server'
import { hardcodedTemplates } from '@/lib/templates/registry'
import { Template, SvgTemplate } from '@/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  // Check hardcoded templates first
  const hardcoded = hardcodedTemplates.find((t) => t.id === id)
  if (hardcoded) {
    return NextResponse.json({ template: hardcoded })
  }

  // Check Supabase manny_templates
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/manny_templates?id=eq.${encodeURIComponent(id)}&active=eq.true&select=*&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          next: { revalidate: 60 },
        } as RequestInit
      )

      if (res.ok) {
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

        if (rows.length > 0) {
          const row = rows[0]
          const template: SvgTemplate = {
            id: row.id,
            name: row.name,
            description: row.description ?? '',
            category: row.category ?? 'general',
            previewImage: row.preview_image ?? '',
            dimensions: row.dimensions ?? { width: 1080, height: 1080 },
            type: 'svg',
            svgUrl: row.svg_url,
            colorSchemes: row.color_schemes ?? [],
          }
          return NextResponse.json({ template })
        }
      }
    } catch {
      // fall through to 404
    }
  }

  return NextResponse.json({ error: 'Template not found' }, { status: 404 })
}
