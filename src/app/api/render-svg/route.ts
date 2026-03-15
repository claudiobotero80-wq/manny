import { NextRequest, NextResponse } from 'next/server'
import { renderSvg } from '@/lib/svg/renderer'
import { ColorScheme } from '@/types'
import { Resvg } from '@resvg/resvg-wasm'

export const runtime = 'nodejs'

interface RenderSvgRequest {
  svgUrl: string
  values: Record<string, string>
  colorScheme: ColorScheme
  dimensions?: { width: number; height: number }
}

// Initialize resvg WASM once
let resvgInitialized = false
async function ensureResvg() {
  if (!resvgInitialized) {
    // @resvg/resvg-wasm needs the WASM binary initialized
    // In Next.js edge/nodejs, we use the bundled init
    try {
      const { initWasm } = await import('@resvg/resvg-wasm')
      const wasmRes = await fetch(
        'https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm'
      )
      const wasmBuf = await wasmRes.arrayBuffer()
      await initWasm(wasmBuf)
      resvgInitialized = true
    } catch {
      // May already be initialized or env doesn't support it
      resvgInitialized = true
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: RenderSvgRequest = await request.json()
    const { svgUrl, values, colorScheme, dimensions } = body

    if (!svgUrl) {
      return NextResponse.json({ error: 'svgUrl is required' }, { status: 400 })
    }

    // Fetch SVG from storage
    const svgRes = await fetch(svgUrl)
    if (!svgRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch SVG: ${svgRes.status}` },
        { status: 502 }
      )
    }
    const svgContent = await svgRes.text()

    // Apply values and color scheme
    const renderedSvg = renderSvg(svgContent, values ?? {}, colorScheme)

    // Convert SVG → PNG using resvg
    await ensureResvg()

    const width = dimensions?.width ?? 1080
    const height = dimensions?.height ?? 1080

    const resvg = new Resvg(renderedSvg, {
      fitTo: {
        mode: 'width',
        value: width,
      },
    })

    const pngData = resvg.render()
    const pngBuffer = pngData.asPng()

    return new NextResponse(Buffer.from(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('[render-svg] Error:', err)
    return NextResponse.json(
      { error: 'Render failed', detail: String(err) },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const svgUrl = searchParams.get('svgUrl') ?? ''
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

  const fakeBody: Parameters<typeof POST>[0] = new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ svgUrl, values, colorScheme }),
  }) as NextRequest

  return POST(fakeBody)
}
