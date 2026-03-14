import { create } from 'zustand'
import { Template, SvgTemplate, ColorScheme, TemplateField } from '@/types'

// Union type for wizard: either a JSX template or an SVG template
export type WizardTemplate = Template | SvgTemplate

interface WizardStore {
  template: WizardTemplate | null
  // For SVG templates, fields are loaded dynamically
  dynamicFields: TemplateField[]
  dynamicFieldsLoading: boolean
  currentStep: number
  values: Record<string, string>
  colorScheme: ColorScheme | null
  setTemplate: (t: WizardTemplate) => void
  setDynamicFields: (fields: TemplateField[]) => void
  setDynamicFieldsLoading: (loading: boolean) => void
  setValue: (fieldId: string, value: string) => void
  setColorScheme: (cs: ColorScheme) => void
  nextStep: () => void
  prevStep: () => void
  reset: () => void
  isComplete: () => boolean
  getActiveFields: () => TemplateField[]
  isSvgTemplate: () => boolean
}

export const useWizardStore = create<WizardStore>((set, get) => ({
  template: null,
  dynamicFields: [],
  dynamicFieldsLoading: false,
  currentStep: 0,
  values: {},
  colorScheme: null,

  setTemplate: (t) =>
    set({
      template: t,
      currentStep: 0,
      values: {},
      dynamicFields: [],
      dynamicFieldsLoading: false,
      colorScheme: t.colorSchemes[0] ?? null,
    }),

  setDynamicFields: (fields) => set({ dynamicFields: fields }),
  setDynamicFieldsLoading: (loading) => set({ dynamicFieldsLoading: loading }),

  setValue: (fieldId, value) =>
    set((state) => ({
      values: { ...state.values, [fieldId]: value },
    })),

  setColorScheme: (cs) => set({ colorScheme: cs }),

  nextStep: () =>
    set((state) => {
      const fields = get().getActiveFields()
      return {
        currentStep: Math.min(state.currentStep + 1, Math.max(0, fields.length - 1)),
      }
    }),

  prevStep: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 0),
    })),

  reset: () =>
    set({
      template: null,
      currentStep: 0,
      values: {},
      colorScheme: null,
      dynamicFields: [],
      dynamicFieldsLoading: false,
    }),

  isComplete: () => {
    const { values } = get()
    const fields = get().getActiveFields()
    return fields
      .filter((f) => f.required)
      .every((f) => !!values[f.id]?.trim())
  },

  getActiveFields: () => {
    const { template, dynamicFields } = get()
    if (!template) return []
    if (template.type === 'svg') return dynamicFields
    return (template as Template).fields ?? []
  },

  isSvgTemplate: () => {
    const { template } = get()
    return template?.type === 'svg'
  },
}))
