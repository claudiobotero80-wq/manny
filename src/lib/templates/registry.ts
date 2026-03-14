import { Template } from '@/types'
import promoRestaurante from './promo-restaurante'

export const templates: Template[] = [promoRestaurante]

export function getTemplate(id: string): Template | undefined {
  return templates.find((t) => t.id === id)
}

export function getTemplatesByCategory(category: string): Template[] {
  return templates.filter((t) => t.category === category)
}
