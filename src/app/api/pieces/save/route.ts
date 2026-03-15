import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PIECE_PRICE_ARS } from '@/lib/pricing'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { templateId, fields, colors } = body

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('manny_pieces')
      .insert({
        user_id: user.id,
        template_id: templateId,
        fields_json: fields ?? {},
        colors_json: colors ?? {},
        status: 'draft',
        price_ars: PIECE_PRICE_ARS,
      })
      .select('id')
      .single()

    if (error) {
      console.error('DB error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ pieceId: data.id })
  } catch (err) {
    console.error('Save piece error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
