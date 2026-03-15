import { hardcodedTemplates, fetchSvgTemplates } from '@/lib/templates/registry'
import { TemplateGrid } from '@/components/catalog/TemplateGrid'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Template, SvgTemplate } from '@/types'

export const revalidate = 60

export default async function CatalogPage() {
  // Merge hardcoded JSX templates with SVG templates from Supabase
  const svgTemplates = await fetchSvgTemplates()

  // Convert SvgTemplates to the Template shape for TemplateGrid display
  // (TemplateGrid only needs display fields, not fields array)
  const allTemplates: (Template | SvgTemplate)[] = [
    ...hardcodedTemplates,
    ...svgTemplates,
  ]

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#CCFF90] rounded-lg flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
          </div>
          <span className="font-bold text-zinc-900 dark:text-white">Manny</span>
        </Link>
        <Link
          href="/admin/templates"
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        >
          Admin ↗
        </Link>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">Templates</h1>
          <p className="text-zinc-500">
            Elegí el tipo de pieza que querés crear
            {svgTemplates.length > 0 && (
              <span className="ml-2 text-xs bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 px-2 py-0.5 rounded-full">
                {svgTemplates.length} SVG nuevo{svgTemplates.length !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>

        <TemplateGrid templates={allTemplates as Template[]} />
      </main>
    </div>
  )
}
