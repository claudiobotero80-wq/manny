'use client'

import { Template } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface TemplateCardProps {
  template: Template
}

export function TemplateCard({ template }: TemplateCardProps) {
  const router = useRouter()

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      {/* Preview area */}
      <div
        className="aspect-square bg-zinc-900 flex items-center justify-center relative overflow-hidden"
        onClick={() => router.push(`/wizard/${template.id}`)}
      >
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-zinc-600 text-sm">Vista previa</span>
        </div>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white font-semibold">Usar template →</span>
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{template.name}</CardTitle>
            <CardDescription className="text-sm mt-0.5">{template.description}</CardDescription>
          </div>
          <span className="shrink-0 text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full text-zinc-500 capitalize">
            {template.category}
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <Button
          className="w-full"
          onClick={() => router.push(`/wizard/${template.id}`)}
        >
          Empezar →
        </Button>
      </CardContent>
    </Card>
  )
}
