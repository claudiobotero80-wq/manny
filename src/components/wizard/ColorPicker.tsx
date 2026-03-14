'use client'

import { ColorScheme } from '@/types'

interface ColorPickerProps {
  schemes: ColorScheme[]
  selected: ColorScheme | null
  onSelect: (scheme: ColorScheme) => void
}

export function ColorPicker({ schemes, selected, onSelect }: ColorPickerProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Paleta de colores</label>
      <div className="flex gap-3">
        {schemes.map((scheme) => (
          <button
            key={scheme.id}
            onClick={() => onSelect(scheme)}
            className={`group relative flex flex-col items-center gap-1 p-1 rounded-lg border-2 transition-all ${
              selected?.id === scheme.id
                ? 'border-zinc-900 dark:border-white'
                : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-600'
            }`}
            title={scheme.name}
          >
            {/* Color preview circles */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: scheme.background, border: '1px solid rgba(0,0,0,0.1)' }}
            >
              <div
                className="w-5 h-5 rounded-full"
                style={{ backgroundColor: scheme.secondary }}
              />
            </div>
            <span className="text-xs text-zinc-500">{scheme.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
