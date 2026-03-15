import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PIECE_PRICE_ARS } from '@/lib/pricing'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://manny-v2.vercel.app'

export async function POST(request: NextRequest) {
  const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN

  if (!mpToken) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 503 })
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { pieceId } = body

    if (!pieceId) {
      return NextResponse.json({ error: 'pieceId is required' }, { status: 400 })
    }

    // Verify piece ownership
    const { data: piece, error: pieceError } = await supabase
      .from('manny_pieces')
      .select('id, template_id, status')
      .eq('id', pieceId)
      .eq('user_id', user.id)
      .single()

    if (pieceError || !piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    // Create MP preference
    const { MercadoPagoConfig, Preference } = await import('mercadopago')
    const mp = new MercadoPagoConfig({ accessToken: mpToken })
    const preference = new Preference(mp)

    const response = await preference.create({
      body: {
        items: [
          {
            id: pieceId,
            title: 'Pieza Manny — diseño para tu negocio',
            description: `Template: ${piece.template_id}`,
            quantity: 1,
            unit_price: PIECE_PRICE_ARS,
            currency_id: 'ARS',
          },
        ],
        back_urls: {
          success: `${BASE_URL}/checkout/success?pieceId=${pieceId}`,
          failure: `${BASE_URL}/checkout/failure?pieceId=${pieceId}`,
          pending: `${BASE_URL}/checkout/pending?pieceId=${pieceId}`,
        },
        auto_return: 'approved',
        notification_url: `${BASE_URL}/api/webhooks/mercadopago`,
        external_reference: pieceId,
      },
    })

    // Save preference id
    await supabase
      .from('manny_pieces')
      .update({ mp_preference_id: response.id })
      .eq('id', pieceId)

    return NextResponse.json({ init_point: response.init_point })
  } catch (err) {
    console.error('Checkout create error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
