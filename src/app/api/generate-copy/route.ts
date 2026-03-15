import { NextRequest, NextResponse } from 'next/server'
import { createGroqClient } from '@/lib/ai/groq'
import { getSystemPrompt } from '@/lib/ai/prompts'

export async function POST(request: NextRequest) {
  try {
    const {
      fieldId,
      fieldLabel,
      userInput,
      vertical,
      wizardContext,
      brandProfile,
    } = await request.json()

    const groq = createGroqClient()

    // 1. Obtener el system prompt del archivo de prompts
    const systemPrompt = getSystemPrompt(vertical ?? 'gastronomia', fieldId ?? 'default')

    // 2. Construir el user message
    let userMessage = ''

    if (brandProfile?.businessName) {
      userMessage += `Negocio: ${brandProfile.businessName}\n`
    }
    if (brandProfile?.tone) {
      userMessage += `Tono: ${brandProfile.tone}\n`
    }
    if (brandProfile?.keywords?.length) {
      userMessage += `Keywords del negocio: ${brandProfile.keywords.join(', ')}\n`
    }

    // Contexto del wizard (campos ya completados)
    const contextEntries = Object.entries(wizardContext ?? {}).filter(
      ([k, v]) => k !== fieldId && v
    )
    if (contextEntries.length) {
      userMessage += `Contexto de la pieza:\n`
      contextEntries.forEach(([k, v]) => {
        userMessage += `- ${k}: ${v}\n`
      })
    }

    // Lo que el usuario quiere que diga
    if (userInput?.trim()) {
      userMessage += `\nIdea del usuario: ${userInput}`
    } else {
      userMessage += `\nGenerá una opción creativa para el campo "${fieldLabel ?? fieldId}".`
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
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
