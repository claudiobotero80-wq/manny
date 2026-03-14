import { Template } from '@/types'
import { TemplateCard } from './TemplateCard'

interface TemplateGridProps {
  templates: Template[]
}

export function TemplateGrid({ templates }: TemplateGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {templates.map((template) => (
        <TemplateCard key={template.id} template={template} />
      ))}
    </div>
  )
}
