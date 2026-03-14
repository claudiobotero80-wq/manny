'use client'

import { TemplateField, ImageFieldConfig } from '@/types'
import { TextInput } from './TextInput'
import { ImageInput } from './ImageInput'

interface WizardStepProps {
  field: TemplateField
  value: string
  onChange: (value: string) => void
  allValues: Record<string, string>
  vertical?: string
}

export function WizardStep({ field, value, onChange, allValues, vertical }: WizardStepProps) {
  if (field.type === 'text') {
    return (
      <TextInput
        field={field}
        value={value}
        onChange={onChange}
        context={allValues}
        vertical={vertical}
      />
    )
  }

  if (field.type === 'image' || field.type === 'logo') {
    const config = field.config as ImageFieldConfig
    if (config.allowUpload || config.allowGenerate) {
      return <ImageInput field={field} value={value} onChange={onChange} />
    }
  }

  return null
}
