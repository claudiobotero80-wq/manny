'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { TemplateField, TextFieldConfig } from '@/types'
import { Sparkles, Loader2 } from 'lucide-react'

interface TextInputProps {
  field: TemplateField
  value: string
  onChange: (value: string) => void
  context?: Record<string, string>
  vertical?: string
}

export function TextInput({ field, value, onChange, context = {}, vertical = 'gastronomia' }: TextInputProps) {
  const [loading, setLoading] = useState(false)
  const config = field.config as TextFieldConfig

  async function generateWithAI() {
    if (!field.aiPrompt) return
    setLoading(true)
    try {
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldType: field.id,
          vertical,
          context,
          aiPrompt: field.aiPrompt,
        }),
      })
      const data = await res.json()
      if (data.text) onChange(data.text)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.aiPrompt && (
          <Button
            variant="ghost"
            size="sm"
            onClick={generateWithAI}
            disabled={loading}
            className="text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3 mr-1" />
            )}
            Generar con AI
          </Button>
        )}
      </div>

      {config.multiline ? (
        <Textarea
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={config.maxLength}
          rows={3}
          className="resize-none"
        />
      ) : (
        <Input
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={config.maxLength}
        />
      )}

      <div className="flex justify-between items-center">
        {field.helpText && (
          <p className="text-xs text-zinc-500">{field.helpText}</p>
        )}
        <span className="text-xs text-zinc-400 ml-auto">
          {value.length}/{config.maxLength}
        </span>
      </div>
    </div>
  )
}
