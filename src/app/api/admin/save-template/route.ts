import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { svgContent, templateId, ...templateData } = body

    // 1. Upload SVG to Storage (server-side, service key bypasses RLS)
    if (svgContent && templateId) {
      const storageRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/templates/${templateId}.svg`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'image/svg+xml',
            'x-upsert': 'true',
          },
          body: svgContent,
        }
      )
      if (!storageRes.ok) {
        const err = await storageRes.text()
        return NextResponse.json({ error: `Storage upload failed: ${err}` }, { status: 400 })
      }
    }

    // 2. Insert into manny_templates (service key bypasses RLS)
    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/manny_templates`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(templateData),
    })

    if (!dbRes.ok) {
      const err = await dbRes.text()
      return NextResponse.json({ error: `DB insert failed: ${err}` }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
