'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Upload, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import { parseSvgFields } from '@/lib/svg/parser'
import { renderSvg } from '@/lib/svg/renderer'
import { ColorScheme, SvgTemplate } from '@/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const DEFAULT_PREVIEW_SCHEME: ColorScheme = {
  id: 'preview',
  name: 'Preview',
  primary: '#1a1a1a',
  secondary: '#CCFF90',
  background: '#0A0A0A',
  text: '#FFFFFF',
}

const DEFAULT_COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'dark',
    name: 'Oscuro',
    primary: '#1a1a1a',
    secondary: '#CCFF90',
    background: '#0A0A0A',
    text: '#FFFFFF',
  },
  {
    id: 'light',
    name: 'Claro',
    primary: '#ffffff',
    secondary: '#FF6B6B',
    background: '#FAFAFA',
    text: '#1a1a1a',
  },
  {
    id: 'warm',
    name: 'Cálido',
    primary: '#2D1B0E',
    secondary: '#E8A835',
    background: '#1C1007',
    text: '#F5E6C8',
  },
]

interface UploadStatus {
  type: 'idle' | 'uploading' | 'success' | 'error'
  message?: string
}

interface TemplateRecord {
  id: string
  name: string
  description?: string
  category?: string
  svg_url?: string
  active?: boolean
}

export default function AdminTemplatesPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [svgContent, setSvgContent] = useState<string>('')
  const [svgFileName, setSvgFileName] = useState('')
  const [previewSvg, setPreviewSvg] = useState<string>('')

  // Form fields
  const [formId, setFormId] = useState('')
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState('general')
  const [formWidth, setFormWidth] = useState('1080')
  const [formHeight, setFormHeight] = useState('1080')

  const [detectedFields, setDetectedFields] = useState<ReturnType<typeof parseSvgFields>>([])
  const [status, setStatus] = useState<UploadStatus>({ type: 'idle' })

  // Existing templates list
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    setLoadingTemplates(true)
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/manny_templates?select=id,name,description,category,svg_url,active&order=name.asc`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      )
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
    } finally {
      setLoadingTemplates(false)
    }
  }

  async function handleDelete(templateId: string, templateName: string) {
    if (!window.confirm(`¿Eliminar el template "${templateName}"? Esta acción no se puede deshacer.`)) {
      return
    }

    setDeletingId(templateId)
    try {
      const res = await fetch('/api/admin/delete-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      })

      if (!res.ok) {
        const errData = await res.json()
        alert(`Error al eliminar: ${errData.error || res.statusText}`)
        return
      }

      // Remove from local state without reloading
      setTemplates((prev) => prev.filter((t) => t.id !== templateId))
    } catch (err) {
      alert(`Error al eliminar: ${String(err)}`)
    } finally {
      setDeletingId(null)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setSvgFileName(file.name)
    // Auto-fill ID from filename
    const autoId = file.name.replace(/\.svg$/i, '').replace(/[^a-z0-9-]/gi, '-').toLowerCase()
    setFormId(autoId)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      setSvgContent(content)

      // Parse fields
      const fields = parseSvgFields(content)
      setDetectedFields(fields)

      // Generate preview with placeholder scheme
      const rendered = renderSvg(content, {}, DEFAULT_PREVIEW_SCHEME)
      setPreviewSvg(rendered)
    }
    reader.readAsText(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!svgContent || !formId || !formName) return

    setStatus({ type: 'uploading', message: 'Subiendo SVG...' })

    try {
      // Storage + DB via server API (service role, bypasses RLS)
      const publicSvgUrl = `${SUPABASE_URL}/storage/v1/object/public/templates/${formId}.svg`

      const res = await fetch('/api/admin/save-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          svgContent,
          templateId: formId,
          id: formId,
          name: formName,
          description: formDescription,
          category: formCategory,
          preview_image: '',
          dimensions: {
            width: parseInt(formWidth) || 1080,
            height: parseInt(formHeight) || 1080,
          },
          type: 'svg',
          svg_url: publicSvgUrl,
          color_schemes: DEFAULT_COLOR_SCHEMES,
          active: true,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || res.statusText)
      }

      setStatus({ type: 'success', message: `Template "${formName}" guardado correctamente.` })
      // Refresh the templates list
      fetchTemplates()
    } catch (err) {
      setStatus({ type: 'error', message: String(err) })
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
          Admin — Templates SVG
        </h1>
        <p className="text-zinc-500 mb-8">
          Subí un SVG exportado de Figma con convención de nombres{' '}
          <code className="bg-zinc-200 dark:bg-zinc-800 px-1 rounded text-sm">manny-*</code>
        </p>

        {/* Existing templates */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
            Templates existentes
          </h2>
          {loadingTemplates ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando templates...
            </div>
          ) : templates.length === 0 ? (
            <p className="text-zinc-400 text-sm">No hay templates cargados todavía.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-zinc-900 dark:text-white truncate">{t.name}</p>
                    <p className="text-xs text-zinc-400 font-mono truncate mt-0.5">{t.id}</p>
                    {t.category && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full">
                        {t.category}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(t.id, t.name)}
                    disabled={deletingId === t.id}
                    className="shrink-0"
                  >
                    {deletingId === t.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    <span className="ml-1.5">Eliminar</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr className="border-zinc-200 dark:border-zinc-800 mb-10" />

        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-6">
          Subir nuevo template
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Archivo SVG</label>
              <div
                className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-zinc-400 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                {svgFileName ? (
                  <p className="text-sm font-medium">{svgFileName}</p>
                ) : (
                  <p className="text-sm text-zinc-500">Hacé clic para seleccionar un SVG</p>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".svg,image/svg+xml"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Detected fields */}
            {detectedFields.length > 0 && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                  ✓ {detectedFields.length} campo(s) detectado(s)
                </p>
                <ul className="text-xs text-green-600 dark:text-green-400 space-y-1">
                  {detectedFields.map((f) => (
                    <li key={f.id}>
                      <span className="font-mono bg-green-100 dark:bg-green-900 px-1 rounded">{f.id}</span>
                      {' → '}
                      <span>{f.label}</span>
                      {' '}
                      <span className="text-green-500">({f.type})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Form fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ID (slug único)</label>
                <Input
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  placeholder="mi-template-2024"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Promo Navidad"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Template para promociones navideñas"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoría</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-900"
                >
                  <option value="general">General</option>
                  <option value="restaurante">Restaurante</option>
                  <option value="retail">Retail</option>
                  <option value="servicios">Servicios</option>
                  <option value="eventos">Eventos</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ancho (px)</label>
                  <Input
                    type="number"
                    value={formWidth}
                    onChange={(e) => setFormWidth(e.target.value)}
                    placeholder="1080"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Alto (px)</label>
                  <Input
                    type="number"
                    value={formHeight}
                    onChange={(e) => setFormHeight(e.target.value)}
                    placeholder="1080"
                  />
                </div>
              </div>
            </div>

            {/* Status message */}
            {status.type !== 'idle' && (
              <div
                className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
                  status.type === 'success'
                    ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                    : status.type === 'error'
                    ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                }`}
              >
                {status.type === 'uploading' && <Loader2 className="w-4 h-4 animate-spin" />}
                {status.type === 'success' && <CheckCircle className="w-4 h-4" />}
                {status.type === 'error' && <AlertCircle className="w-4 h-4" />}
                {status.message}
              </div>
            )}

            <Button
              type="submit"
              disabled={!svgContent || !formId || !formName || status.type === 'uploading'}
              className="w-full"
            >
              {status.type === 'uploading' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Guardar Template
                </>
              )}
            </Button>
          </form>

          {/* Preview */}
          <div>
            <h2 className="text-sm font-medium mb-3">Vista previa (con colores placeholder)</h2>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-900 aspect-square flex items-center justify-center">
              {previewSvg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(previewSvg)}`}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <p className="text-zinc-500 text-sm">Seleccioná un SVG para ver la preview</p>
              )}
            </div>

            <div className="mt-4 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-xs text-zinc-500 space-y-1">
              <p className="font-medium text-zinc-700 dark:text-zinc-300">Convención de capas en Figma:</p>
              <p><code>manny-text-*</code> → campo de texto</p>
              <p><code>manny-multiline-*</code> → textarea</p>
              <p><code>manny-img-*</code> → imagen (con AI)</p>
              <p><code>manny-logo-*</code> → logo (solo upload)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
