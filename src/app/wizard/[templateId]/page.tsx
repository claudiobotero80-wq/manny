'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWizardStore } from '@/stores/wizardStore'
import { getTemplate } from '@/lib/templates/registry'
import { WizardLayout } from '@/components/wizard/WizardLayout'

export default function WizardPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const { setTemplate, template } = useWizardStore()
  const router = useRouter()

  useEffect(() => {
    const t = getTemplate(templateId)
    if (!t) {
      router.push('/catalog')
      return
    }
    // Only set if different template
    if (!template || template.id !== t.id) {
      setTemplate(t)
    }
  }, [templateId, setTemplate, template, router])

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-500">Cargando...</div>
      </div>
    )
  }

  return <WizardLayout />
}
