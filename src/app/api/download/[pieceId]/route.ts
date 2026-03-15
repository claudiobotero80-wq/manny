import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pieceId: string }> }
) {
  const { pieceId } = await params

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: piece, error } = await supabase
      .from('manny_pieces')
      .select('id, status, image_url, user_id')
      .eq('id', pieceId)
      .eq('user_id', user.id)
      .single()

    if (error || !piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    if (piece.status !== 'paid') {
      return NextResponse.json({ error: 'Payment required' }, { status: 402 })
    }

    if (!piece.image_url) {
      return NextResponse.json({ error: 'Image not ready yet' }, { status: 202 })
    }

    return NextResponse.redirect(piece.image_url)
  } catch (err) {
    console.error('Download error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
