import { templates } from '@/lib/templates/registry'
import { TemplateGrid } from '@/components/catalog/TemplateGrid'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function CatalogPage() {
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
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">Templates</h1>
          <p className="text-zinc-500">Elegí el tipo de pieza que querés crear</p>
        </div>

        <TemplateGrid templates={templates} />
      </main>
    </div>
  )
}
