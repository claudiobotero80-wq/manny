export interface TextFieldConfig {
  maxLength: number
  multiline: boolean
  suggestions?: string[]
}

export interface ImageFieldConfig {
  aspectRatio: string
  allowUpload: boolean
  allowGenerate: boolean
  generatePromptBase: string
}

export interface TemplateField {
  id: string
  type: 'text' | 'image' | 'logo'
  label: string
  placeholder?: string
  helpText?: string
  required: boolean
  config: TextFieldConfig | ImageFieldConfig
  aiPrompt?: string
}

export interface ColorScheme {
  id: string
  name: string
  primary: string
  secondary: string
  background: string
  text: string
}

export interface Template {
  id: string
  name: string
  description: string
  category: string
  previewImage: string
  dimensions: { width: number; height: number }
  fields: TemplateField[]
  colorSchemes: ColorScheme[]
  component: string
}

export interface WizardSession {
  templateId: string
  currentStep: number
  values: Record<string, string>
  colorScheme: ColorScheme
}
