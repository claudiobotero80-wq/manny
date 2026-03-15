'use client'

import { useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWizardStore } from '@/stores/wizardStore'
import { WizardLayout } from '@/components/wizard/WizardLayout'
import { SvgTemplate } from '@/types'

export default function WizardPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const { setTemplate, setDynamicFields, setDynamicFieldsLoading, template, isSvgTemplate } =
    useWizardStore()
  const router = useRouter()
  const svgFieldsFetched = useRef(false)
  const templateLoaded = useRef(false)

  // Load the template (from API — handles both JSX and Supabase SVG)
  useEffect(() => {
    if (template?.id === templateId) return
    if (templateLoaded.current) return
    templateLoaded.current = true

    fetch(`/api/template?id=${encodeURIComponent(templateId)}`)
      .then((res) => {
        if (!res.ok) {
          router.push('/catalog')
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (!data?.template) return
        setTemplate(data.template)
        svgFieldsFetched.current = false
        templateLoaded.current = false // allow re-fetch if templateId changes
      })
      .catch(() => {
        router.push('/catalog')
      })
  }, [templateId, setTemplate, template, router])

  // If SVG template: fetch dynamic fields
  useEffect(() => {
    if (!template || !isSvgTemplate() || svgFieldsFetched.current) return
    const svgTemplate = template as SvgTemplate
    if (!svgTemplate.svgUrl) return

    svgFieldsFetched.current = true
    setDynamicFieldsLoading(true)

    fetch(`/api/template-fields?svgUrl=${encodeURIComponent(svgTemplate.svgUrl)}`)
      .then((res) => res.json())
      .then((data) => {
        setDynamicFields(data.fields ?? [])
      })
      .catch((err) => {
        console.error('[wizard] Failed to load SVG fields:', err)
        setDynamicFields([])
      })
      .finally(() => {
        setDynamicFieldsLoading(false)
      })
  }, [template, isSvgTemplate, setDynamicFields, setDynamicFieldsLoading])

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-500">Cargando...</div>
      </div>
    )
  }

  return <WizardLayout />
}
