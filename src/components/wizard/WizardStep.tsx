'use client'

import { TemplateField, ImageFieldConfig, ColorFieldConfig } from '@/types'
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

  if (field.type === 'color') {
    const config = field.config as ColorFieldConfig
    const currentValue = value || config.defaultValue || '#000000'
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <input
            type="color"
            value={currentValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-16 h-16 rounded-lg cursor-pointer border border-zinc-200 dark:border-zinc-700 p-1 bg-white dark:bg-zinc-800"
          />
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">{field.label}</p>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">{currentValue}</p>
          </div>
        </div>
        {field.helpText && (
          <p className="text-sm text-zinc-500">{field.helpText}</p>
        )}
      </div>
    )
  }

  return null
}
