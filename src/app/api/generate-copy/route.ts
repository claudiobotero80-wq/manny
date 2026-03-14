import { NextRequest, NextResponse } from 'next/server'
import { createGroqClient } from '@/lib/ai/groq'

export async function POST(request: NextRequest) {
  try {
    const { fieldType, vertical, context, aiPrompt } = await request.json()

    const groq = createGroqClient()

    const systemPrompt = `Sos un copywriter experto en marketing para pequeños negocios en Argentina. 
Escribís SOLO el texto pedido, en español rioplatense, con tono cercano, directo y vendedor.
Nada de explicaciones ni contexto extra — solo el texto.`

    const userPrompt = `${aiPrompt || `Generá un ${fieldType} para ${vertical}`}.
Contexto del negocio: ${JSON.stringify(context)}.
Máximo: ${fieldType === 'titulo' ? '50' : fieldType === 'cta' ? '30' : '120'} caracteres.
Respondé SOLO con el texto, sin comillas.`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 100,
      temperature: 0.8,
    })

    const text = completion.choices[0]?.message?.content?.trim() ?? ''

    return NextResponse.json({ text })
  } catch (err) {
    console.error('generate-copy error:', err)
    return NextResponse.json({ error: 'Failed to generate copy' }, { status: 500 })
  }
}
