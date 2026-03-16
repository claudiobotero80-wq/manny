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
  const isSvg = isSvgTemplate()
  const svgUrl = isSvg ? (template as SvgTemplate).svgUrl : undefined

  // Split fields into non-color and color groups
  const nonColorFields = activeFields.filter((f) => f.type !== 'color')
  const colorFields = activeFields.filter((f) => f.type === 'color')
  const hasColorFields = colorFields.length > 0

  // Total steps: one per non-color field + 1 unified color step (if any color fields)
  const totalSteps = nonColorFields.length + (hasColorFields ? 1 : 0)
  const isUnifiedColorStep = hasColorFields && currentStep === nonColorFields.length

  const field = isUnifiedColorStep ? null : nonColorFields[currentStep]
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0

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
          body: JSON.stringify(
            isSvgTemplate
              ? { svgUrl: (template as SvgTemplate).svgUrl, values, colorScheme }
              : { templateId: template!.id, fields: values, colorScheme }
          ),
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
  // Legacy JSX color scheme picker (non-SVG templates with colorSchemes)
  const hasColorSchemes = (template.colorSchemes?.length ?? 0) > 0
  const isColorStep = !isSvg && currentStep >= nonColorFields.length && !hasColorFields
  // SVG templates: finalizar button on last step (whether that's a color step or a field step)
  const isSvgLastStep = isSvg && isLastStep && totalSteps > 0

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
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => router.push('/catalog')}
                className="text-sm text-zinc-500 hover:text-zinc-700 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Volver al catálogo
              </button>
              <button
                onClick={() => router.push('/')}
                className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Cambiar template
              </button>
            </div>
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
              // Legacy JSX template color scheme picker
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
            ) : isUnifiedColorStep ? (
              // Unified color step: all manny-color-* fields in one screen
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Elegí los colores</h2>
                  <p className="text-sm text-zinc-500">Personalizá los colores de tu diseño</p>
                </div>
                <div className="space-y-5">
                  {colorFields.map((cf) => {
                    const currentValue = values[cf.id] || (cf.config as import('@/types').ColorFieldConfig).defaultValue || '#000000'
                    return (
                      <div key={cf.id} className="flex items-center gap-4">
                        <input
                          type="color"
                          value={currentValue}
                          onChange={(e) => setValue(cf.id, e.target.value)}
                          className="w-14 h-14 rounded-lg cursor-pointer border border-zinc-200 dark:border-zinc-700 p-1 bg-white dark:bg-zinc-800 flex-shrink-0"
                        />
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">{cf.label}</p>
                          <p className="text-xs text-zinc-500 font-mono mt-0.5">{currentValue}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
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
              disabled={currentStep === 0 && !isColorStep && !isUnifiedColorStep}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>

            <div className="flex gap-2">
              {/* Unified color step OR legacy color step OR SVG last step: show Finalizar */}
              {(isColorStep || isUnifiedColorStep || isSvgLastStep) && (
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

              {!isColorStep && !isUnifiedColorStep && !isSvgLastStep && (
                <Button
                  onClick={isLastStep && hasColorSchemes && !hasColorFields ? () => useWizardStore.getState().nextStep() : nextStep}
                  disabled={field?.required && !values[field?.id]?.trim()}
                >
                  {isLastStep && hasColorSchemes && !hasColorFields ? 'Elegir colores' : 'Siguiente'}
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
