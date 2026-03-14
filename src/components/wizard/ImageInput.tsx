'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { TemplateField, ImageFieldConfig } from '@/types'
import { Upload, Sparkles, Loader2, X } from 'lucide-react'

interface ImageInputProps {
  field: TemplateField
  value: string
  onChange: (value: string) => void
}

export function ImageInput({ field, value, onChange }: ImageInputProps) {
  const [loadingUpload, setLoadingUpload] = useState(false)
  const [loadingGenerate, setLoadingGenerate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const config = field.config as ImageFieldConfig

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoadingUpload(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        onChange(data.url)
      } else {
        setError(data.error ?? 'Error al subir imagen')
      }
    } catch {
      setError('Error al subir imagen')
    } finally {
      setLoadingUpload(false)
    }
  }

  async function handleGenerate() {
    setLoadingGenerate(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: config.generatePromptBase,
          style: 'food',
        }),
      })
      const data = await res.json()
      if (data.imageUrl) {
        onChange(data.imageUrl)
      } else {
        setError(data.error ?? 'Error al generar imagen')
      }
    } catch {
      setError('Error al generar imagen')
    } finally {
      setLoadingGenerate(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {value ? (
        <div className="relative aspect-square max-w-xs rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
          <button
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg p-8 text-center space-y-4">
          <div className="text-zinc-400 text-sm">Sin imagen</div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {config.allowUpload && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={loadingUpload || loadingGenerate}
                >
                  {loadingUpload ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Subir foto
                </Button>
              </>
            )}
            {config.allowGenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={loadingUpload || loadingGenerate}
                className="text-violet-600 border-violet-200 hover:bg-violet-50"
              >
                {loadingGenerate ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Generar con AI
              </Button>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
