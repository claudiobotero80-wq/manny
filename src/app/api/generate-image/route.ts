import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'

// TODO: Switch to FLUX.2 Klein (fal-ai/flux-2/klein or similar) once it becomes
// available on FAL.ai. As of 2025-03, the model is NOT yet listed in the FAL catalog
// (all candidate IDs return 404). Using fal-ai/flux/schnell as fallback.
// Track: https://fal.ai/models — search for "flux-2" or "FLUX.2 Klein"
const IMAGE_MODEL = 'fal-ai/flux/schnell' // fallback: FLUX.2 Klein not yet on FAL

const styleModifiers: Record<string, string> = {
  default: 'professional photography, high quality, well-lit',
  food: 'food photography, natural lighting, appetizing, restaurant quality',
  dark: 'dark background, moody lighting, dramatic shadows',
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, style = 'food' } = await request.json()

    fal.config({ credentials: process.env.FAL_KEY })

    const modifier = styleModifiers[style] ?? styleModifiers.default
    const enrichedPrompt = `${prompt}, ${modifier}, 4k, photorealistic`

    const result = await fal.subscribe(IMAGE_MODEL, {
      input: {
        prompt: enrichedPrompt,
        image_size: 'square_hd',
        num_inference_steps: 4,
        num_images: 1,
      },
    }) as { images?: Array<{ url: string }> }

    const imageUrl = result?.images?.[0]?.url

    if (!imageUrl) {
      throw new Error('No image returned from FAL')
    }

    return NextResponse.json({ imageUrl })
  } catch (err) {
    console.error('generate-image error:', err)
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
  }
}
