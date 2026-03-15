import { NextRequest, NextResponse } from 'next/server'
import { parseSvgFields } from '@/lib/svg/parser'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const svgUrl = searchParams.get('svgUrl')

  if (!svgUrl) {
    return NextResponse.json({ error: 'svgUrl is required' }, { status: 400 })
  }

  try {
    const res = await fetch(svgUrl, {
      headers: { 'Accept': 'image/svg+xml, text/xml, */*' },
      // Next.js cache: revalidate every hour
      next: { revalidate: 3600 },
    } as RequestInit)

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch SVG: ${res.status} ${res.statusText}` },
        { status: 502 }
      )
    }

    const svgContent = await res.text()
    const fields = parseSvgFields(svgContent)

    return NextResponse.json({ fields })
  } catch (err) {
    console.error('[template-fields] Error:', err)
    return NextResponse.json(
      { error: 'Failed to parse SVG template' },
      { status: 500 }
    )
  }
}
