import { gastronomiPrompts } from './gastronomia'

const promptsByVertical: Record<string, Record<string, string>> = {
  gastronomia: gastronomiPrompts,
}

export function getSystemPrompt(vertical: string, fieldId: string): string {
  const vertical_prompts = promptsByVertical[vertical] ?? gastronomiPrompts
  return vertical_prompts[fieldId] ?? vertical_prompts['default'] ?? gastronomiPrompts['default']
}
