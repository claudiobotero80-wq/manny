import { NextRequest, NextResponse } from 'next/server'

// Using BFL API (Black Forest Labs) with FLUX.2 Klein 4B
// BFL key stored in BFL_API_KEY env var
// Async: POST → returns { id, polling_url } → poll polling_url every 2s
const BFL_BASE = 'https://api.bfl.ai'
const BFL_MODEL = 'flux-2-klein-4b' // fast + cheap; upgrade to flux-2-klein-9b for higher quality

const styleModifiers: Record<string, string> = {
  default: 'professional photography, high quality, well-lit',
  food: 'food photography, natural lighting, appetizing, restaurant quality',
  dark: 'dark background, moody lighting, dramatic shadows',
}

async function pollResult(pollingUrl: string, apiKey: string, maxAttempts = 25): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000))
    const res = await fetch(pollingUrl, {
      headers: { 'x-key': apiKey },
    })
    if (!res.ok) throw new Error(`Poll failed: ${res.status}`)
    const data = await res.json() as {
      status: string
      result?: { sample?: string }
    }
    if (data.status === 'Ready' && data.result?.sample) {
      return data.result.sample
    }
    if (['Error', 'Content Moderated', 'Request Moderated'].includes(data.status)) {
      throw new Error(`BFL task failed with status: ${data.status}`)
    }
    // statuses: Pending, Processing → keep polling
  }
  throw new Error('BFL task timed out after polling')
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, style = 'food' } = await request.json()

    const apiKey = process.env.BFL_API_KEY
    if (!apiKey) throw new Error('BFL_API_KEY not configured')

    const modifier = styleModifiers[style] ?? styleModifiers.default
    const enrichedPrompt = `${prompt}, ${modifier}, 4k, photorealistic`

    // Step 1: Submit generation task
    const submitRes = await fetch(`${BFL_BASE}/v1/${BFL_MODEL}`, {
      method: 'POST',
      headers: {
        'x-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: enrichedPrompt,
        width: 1024,
        height: 1024,
        output_format: 'jpeg',
        safety_tolerance: 2,
      }),
    })

    if (!submitRes.ok) {
      const errBody = await submitRes.text()
      throw new Error(`BFL submit failed (${submitRes.status}): ${errBody}`)
    }

    const submitData = await submitRes.json() as { id?: string; polling_url?: string }
    const pollingUrl = submitData.polling_url
    if (!pollingUrl) throw new Error('BFL returned no polling_url')

    // Step 2: Poll using the polling_url from the response (may be a regional endpoint)
    const imageUrl = await pollResult(pollingUrl, apiKey)

    return NextResponse.json({ imageUrl })
  } catch (err) {
    console.error('generate-image error:', err)
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
  }
}
