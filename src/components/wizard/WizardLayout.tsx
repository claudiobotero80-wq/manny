'use client'

import { useState } from 'react'
import { useWizardStore } from '@/stores/wizardStore'
import { WizardStep } from './WizardStep'
import { ColorPicker } from './ColorPicker'
import { LivePreview } from './LivePreview'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight, Loader2, ShoppingCart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LoginModal } from '@/components/auth/LoginModal'
import { SvgTemplate } from '@/types'

const WIZARD_INTENT_KEY = 'manny_wizard_intent'

export function WizardLayout() {
  const {
    template,
    currentStep,
    values,
    colorScheme,
    setValue,
    setColorScheme,
    nextStep,
    prevStep,
    isComplete,
    getActiveFields,
    dynamicFieldsLoading,
    isSvgTemplate,
  } = useWizardStore()
  const [finalizando, setFinalizando] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const router = useRouter()

  if (!template) return null

  const activeFields = getActiveFields()
  const field = activeFields[currentStep]
  const totalSteps = activeFields.length
  const progress = totalSteps > 0 ? ((currentStep + 1) / (totalSteps + 1)) * 100 : 0

  const isSvg = isSvgTemplate()
  const svgUrl = isSvg ? (template as SvgTemplate).svgUrl : undefined

  function saveIntent() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(WIZARD_INTENT_KEY, JSON.stringify({
        templateId: template!.id,
        fields: values,
        colors: colorScheme,
        savedAt: Date.now(),
      }))
    }
  }

  async function handleFinalizar() {
    const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

    // DEV MODE: skip auth + payment, go straight to download
    if (DEV_MODE) {
      setFinalizando(true)
      try {
        const isSvgTemplate = template?.type === 'svg'
        const endpoint = isSvgTemplate ? '/api/render-svg' : '/api/render'
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: template!.id,
            fields: values,
            colorScheme,
          }),
        })
        if (!res.ok) throw new Error('Render failed')
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${template!.id}-preview.png`
        a.click()
        URL.revokeObjectURL(url)
      } catch (err) {
        console.error('Dev download error:', err)
      } finally {
        setFinalizando(false)
      }
      return
    }

    // PROD: auth check → save → checkout
    setFinalizando(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        saveIntent()
        setShowLoginModal(true)
        setFinalizando(false)
        return
      }

      const res = await fetch('/api/pieces/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template!.id,
          fields: values,
          colors: colorScheme,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        console.error('Save failed:', data)
        setFinalizando(false)
        return
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem(WIZARD_INTENT_KEY)
      }

      router.push(`/checkout/${data.pieceId}`)
    } catch (err) {
      console.error('Finalizar error:', err)
      setFinalizando(false)
    }
  }

  const isLastStep = currentStep === totalSteps - 1
  const isColorStep = currentStep >= totalSteps

  // Loading state for SVG dynamic fields
  if (isSvg && dynamicFieldsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-500">Cargando campos del template...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        redirectTo="/__resume_intent"
      />

      <div className="flex h-screen overflow-hidden">
        {/* Left: Wizard */}
        <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col border-r border-zinc-200 dark:border-zinc-800">
          {/* Header */}
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => router.push('/catalog')}
              className="text-sm text-zinc-500 hover:text-zinc-700 flex items-center gap-1 mb-4"
            >
              <ChevronLeft className="w-4 h-4" />
              Volver al catálogo
            </button>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{template.name}</h1>
            <p className="text-sm text-zinc-500 mt-1">{template.description}</p>
            {isSvg && (
              <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-violet-100 text-violet-700 rounded-full">
                Template SVG
              </span>
            )}
            <div className="mt-4">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-zinc-400 mt-1">
                Paso {Math.min(currentStep + 1, totalSteps)} de {totalSteps}
              </p>
            </div>
          </div>

          {/* Step content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isColorStep ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Elegí los colores</h2>
                  <p className="text-sm text-zinc-500">Seleccioná la paleta que mejor represente tu marca</p>
                </div>
                <ColorPicker
                  schemes={template.colorSchemes}
                  selected={colorScheme}
                  onSelect={setColorScheme}
                />
              </div>
            ) : field ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">
                    {currentStep + 1}. {field.label}
                  </h2>
                </div>
                <WizardStep
                  field={field}
                  value={values[field.id] ?? ''}
                  onChange={(val) => setValue(field.id, val)}
                  allValues={values}
                  vertical={template.category}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-zinc-400">No hay campos configurados.</p>
              </div>
            )}
          </div>

          {/* Footer nav */}
          <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0 && !isColorStep}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>

            <div className="flex gap-2">
              {/* Color step: show Finalizar (→ checkout) */}
              {isColorStep && (
                <Button
                  onClick={handleFinalizar}
                  disabled={finalizando}
                  className="bg-[#CCFF90] text-zinc-900 hover:bg-[#b8f070] font-bold"
                >
                  {finalizando ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4 mr-2" />
                  )}
                  Finalizar
                </Button>
              )}

              {!isColorStep && (
                <Button
                  onClick={isLastStep ? () => useWizardStore.getState().nextStep() : nextStep}
                  disabled={field?.required && !values[field?.id]?.trim()}
                >
                  {isLastStep ? 'Elegir colores' : 'Siguiente'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="hidden md:flex flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-8">
          <div className="w-full max-w-lg">
            <LivePreview
              templateId={template.id}
              values={values}
              colorScheme={colorScheme}
              svgUrl={svgUrl}
            />
            <p className="text-center text-xs text-zinc-400 mt-3">Vista previa en tiempo real</p>
          </div>
        </div>
      </div>
    </>
  )
}
