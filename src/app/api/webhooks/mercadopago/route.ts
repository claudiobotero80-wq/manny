import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Use service client (no cookie needed — webhook has no user session)
function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://manny-v2.vercel.app'

async function generateAndStorePNG(pieceId: string, piece: { template_id: string; fields_json: Record<string, string>; colors_json: Record<string, unknown> }) {
  try {
    // Call our own render endpoint to get the PNG
    const renderRes = await fetch(`${BASE_URL}/api/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: piece.template_id,
        values: piece.fields_json,
        colorScheme: piece.colors_json,
        dimensions: { width: 1080, height: 1080 },
      }),
    })

    if (!renderRes.ok) {
      console.error('Render failed:', await renderRes.text())
      return null
    }

    const buffer = Buffer.from(await renderRes.arrayBuffer())
    const filename = `${pieceId}/final.png`

    const supabase = getServiceClient()
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

    // MP sends topic=payment with data.id or type=payment
    const topic = body.topic || body.type
    const dataId = body.data?.id || body.id

    if (topic !== 'payment' || !dataId) {
      return NextResponse.json({ received: true })
    }

    // Fetch payment details from MP
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

    // Get piece data
    const { data: piece, error: pieceError } = await supabase
      .from('manny_pieces')
      .select('id, template_id, fields_json, colors_json, status')
      .eq('id', pieceId)
      .single()

    if (pieceError || !piece) {
      console.error('Piece not found:', pieceId)
      return NextResponse.json({ received: true })
    }

    // Already paid — skip
    if (piece.status === 'paid') {
      return NextResponse.json({ received: true })
    }

    // Generate PNG and store
    const imageUrl = await generateAndStorePNG(pieceId, piece)

    // Update piece status
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
