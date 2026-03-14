import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'

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

    const result = await fal.subscribe('fal-ai/flux/schnell', {
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
