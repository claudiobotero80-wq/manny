export const runtime = 'edge'

import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
import { ColorScheme } from '@/types'

interface RenderRequest {
  templateId: string
  values: Record<string, string>
  colorScheme: ColorScheme
  dimensions?: { width: number; height: number }
}

export async function POST(request: NextRequest) {
  try {
    const body: RenderRequest = await request.json()
    const { templateId, values, colorScheme, dimensions } = body

    const width = dimensions?.width ?? 1080
    const height = dimensions?.height ?? 1080
    const scale = width / 1080

    if (templateId === 'promo-restaurante') {
      const { titulo = 'Tu plato especial', descripcion = '', imagen, cta = 'Reservá ya' } = values

      const response = new ImageResponse(
        (
          <div
            style={{
              width,
              height,
              backgroundColor: colorScheme.background,
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Inter, sans-serif',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Background image */}
            {imagen && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagen}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.45,
                  }}
                  alt=""
                />
              </div>
            )}

            {/* Gradient overlay */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '65%',
                background: `linear-gradient(to top, ${colorScheme.background}FF 0%, ${colorScheme.background}CC 50%, ${colorScheme.background}00 100%)`,
                display: 'flex',
              }}
            />

            {/* Top accent bar */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: Math.round(6 * scale),
                backgroundColor: colorScheme.secondary,
                display: 'flex',
              }}
            />

            {/* Content */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: Math.round(72 * scale),
                display: 'flex',
                flexDirection: 'column',
                gap: Math.round(24 * scale),
              }}
            >
              {/* Label */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: Math.round(12 * scale),
                }}
              >
                <div
                  style={{
                    width: Math.round(40 * scale),
                    height: Math.round(3 * scale),
                    backgroundColor: colorScheme.secondary,
                    display: 'flex',
                  }}
                />
                <span
                  style={{
                    color: colorScheme.secondary,
                    fontSize: Math.round(20 * scale),
                    fontWeight: 600,
                    letterSpacing: '0.15em',
                  }}
                >
                  ESPECIAL
                </span>
              </div>

              {/* Title */}
              <div
                style={{
                  color: colorScheme.text,
                  fontSize: Math.round(86 * scale),
                  fontWeight: 800,
                  lineHeight: 1.05,
                  maxWidth: Math.round(900 * scale),
                }}
              >
                {titulo}
              </div>

              {/* Description */}
              {descripcion ? (
                <div
                  style={{
                    color: colorScheme.text,
                    fontSize: Math.round(28 * scale),
                    fontWeight: 400,
                    lineHeight: 1.5,
                    opacity: 0.75,
                    maxWidth: Math.round(700 * scale),
                  }}
                >
                  {descripcion}
                </div>
              ) : null}

              {/* CTA */}
              {cta ? (
                <div style={{ display: 'flex', marginTop: Math.round(8 * scale) }}>
                  <div
                    style={{
                      backgroundColor: colorScheme.secondary,
                      color: colorScheme.primary,
                      padding: `${Math.round(18 * scale)}px ${Math.round(40 * scale)}px`,
                      fontSize: Math.round(24 * scale),
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {cta}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ),
        { width, height }
      )

      return response
    }

    return new Response(JSON.stringify({ error: 'Template not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Render error:', err)
    return new Response(JSON.stringify({ error: 'Render failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const templateId = searchParams.get('templateId') ?? 'promo-restaurante'
  const valuesRaw = searchParams.get('values')
  const colorSchemeRaw = searchParams.get('colorScheme')

  const values: Record<string, string> = valuesRaw ? JSON.parse(valuesRaw) : {}
  const colorScheme: ColorScheme = colorSchemeRaw
    ? JSON.parse(colorSchemeRaw)
    : {
        id: 'dark',
        name: 'Oscuro',
        primary: '#1a1a1a',
        secondary: '#CCFF90',
        background: '#0A0A0A',
        text: '#FFFFFF',
      }

  const fakeRequest = new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId, values, colorScheme }),
  })

  return POST(new NextRequest(fakeRequest))
}
