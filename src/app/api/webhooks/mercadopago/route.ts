import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://manny-v2.vercel.app'

async function generateAndStorePNG(
  pieceId: string,
  piece: {
    template_id: string
    fields_json: Record<string, string>
    colors_json: Record<string, unknown>
  }
): Promise<string | null> {
  try {
    const supabase = getServiceClient()

    // Check if this is an SVG template
    const { data: tmpl } = await supabase
      .from('manny_templates')
      .select('type, svg_url')
      .eq('id', piece.template_id)
      .maybeSingle()

    let renderRes: Response

    if (tmpl?.type === 'svg' && tmpl.svg_url) {
      renderRes = await fetch(`${BASE_URL}/api/render-svg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          svgUrl: tmpl.svg_url,
          values: piece.fields_json,
          colorScheme: piece.colors_json,
          dimensions: { width: 1080, height: 1080 },
        }),
      })
    } else {
      renderRes = await fetch(`${BASE_URL}/api/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: piece.template_id,
          values: piece.fields_json,
          colorScheme: piece.colors_json,
          dimensions: { width: 1080, height: 1080 },
        }),
      })
    }

    if (!renderRes.ok) {
      console.error('Render failed:', await renderRes.text())
      return null
    }

    const buffer = Buffer.from(await renderRes.arrayBuffer())
    const filename = `${pieceId}/final.png`

    const { error: uploadError } = await supabase.storage
      .from('pieces')
      .upload(filename, buffer, {
        contentType: 'image/png',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return null
    }

    const { data: urlData } = supabase.storage
      .from('pieces')
      .getPublicUrl(filename)

    return urlData.publicUrl
  } catch (err) {
    console.error('generateAndStorePNG error:', err)
    return null
  }
}

export async function POST(request: NextRequest) {
  const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!mpToken) {
    return NextResponse.json({ received: true })
  }

  try {
    const body = await request.json()

    const topic = body.topic || body.type
    const dataId = body.data?.id || body.id

    if (topic !== 'payment' || !dataId) {
      return NextResponse.json({ received: true })
    }

    const { MercadoPagoConfig, Payment } = await import('mercadopago')
    const mp = new MercadoPagoConfig({ accessToken: mpToken })
    const payment = new Payment(mp)
    const paymentData = await payment.get({ id: String(dataId) })

    if (paymentData.status !== 'approved') {
      return NextResponse.json({ received: true })
    }

    const pieceId = paymentData.external_reference
    if (!pieceId) {
      return NextResponse.json({ received: true })
    }

    const supabase = getServiceClient()

    const { data: piece, error: pieceError } = await supabase
      .from('manny_pieces')
      .select('id, template_id, fields_json, colors_json, status')
      .eq('id', pieceId)
      .single()

    if (pieceError || !piece) {
      console.error('Piece not found:', pieceId)
      return NextResponse.json({ received: true })
    }

    if (piece.status === 'paid') {
      return NextResponse.json({ received: true })
    }

    const imageUrl = await generateAndStorePNG(pieceId, piece)

    await supabase
      .from('manny_pieces')
      .update({
        status: 'paid',
        mp_payment_id: String(paymentData.id),
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pieceId)

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ received: true })
  }
}
