import { create } from 'zustand'
import { Template, ColorScheme } from '@/types'

interface WizardStore {
  template: Template | null
  currentStep: number
  values: Record<string, string>
  colorScheme: ColorScheme | null
  setTemplate: (t: Template) => void
  setValue: (fieldId: string, value: string) => void
  setColorScheme: (cs: ColorScheme) => void
  nextStep: () => void
  prevStep: () => void
  reset: () => void
  isComplete: () => boolean
}

export const useWizardStore = create<WizardStore>((set, get) => ({
  template: null,
  currentStep: 0,
  values: {},
  colorScheme: null,

  setTemplate: (t) =>
    set({
      template: t,
      currentStep: 0,
      values: {},
      colorScheme: t.colorSchemes[0] ?? null,
    }),

  setValue: (fieldId, value) =>
    set((state) => ({
      values: { ...state.values, [fieldId]: value },
    })),

  setColorScheme: (cs) => set({ colorScheme: cs }),

  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(
        state.currentStep + 1,
        (state.template?.fields.length ?? 1) - 1
      ),
    })),

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
    }),

  isComplete: () => {
    const { template, values } = get()
    if (!template) return false
    return template.fields
      .filter((f) => f.required)
      .every((f) => !!values[f.id]?.trim())
  },
}))
