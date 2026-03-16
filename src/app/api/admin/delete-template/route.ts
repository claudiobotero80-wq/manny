import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  try {
    const { templateId } = await req.json()

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 })
    }

    // 1. Delete from manny_templates
    const dbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/manny_templates?id=eq.${encodeURIComponent(templateId)}`,
      {
        method: 'DELETE',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          Prefer: 'return=minimal',
        },
      }
    )

    if (!dbRes.ok) {
      const err = await dbRes.text()
      return NextResponse.json({ error: `DB delete failed: ${err}` }, { status: 400 })
    }

    // 2. Delete SVG file from storage bucket `templates`
    const storageRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/templates/${templateId}.svg`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      }
    )

    // Storage delete: 200 or 404 are both acceptable (file may not exist)
    if (!storageRes.ok && storageRes.status !== 404) {
      const err = await storageRes.text()
      return NextResponse.json({ error: `Storage delete failed: ${err}` }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
