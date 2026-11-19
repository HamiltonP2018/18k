/**
 * Preferencias del lienzo que se recuerdan en el celular:
 * pincel, color, grosor y opacidad de cada pincel, y colores recientes.
 */
import { useCallback, useState } from 'react'
import { local, STORAGE_KEYS } from '../../../lib/storage'
import { BRUSHES, brushDef } from './brushes'
import type { BrushId } from './doc'
import { DEFAULT_RECENTS, RECENTS_MAX } from './palette'

export type PaintBrush = Exclude<BrushId, 'eraser'>

export interface DrawSettings {
  brush: PaintBrush
  color: string
  size: Partial<Record<BrushId, number>>
  alpha: Partial<Record<BrushId, number>>
  recents: string[]
}

const HEX = /^#[0-9a-f]{6}$/i

function load(): DrawSettings {
  const fallback: DrawSettings = { brush: 'pen', color: '#3a2230', size: {}, alpha: {}, recents: DEFAULT_RECENTS }
  try {
    const raw = JSON.parse(local.get(STORAGE_KEYS.drawSettings) ?? 'null') as Partial<DrawSettings> | null
    if (!raw) return fallback
    return {
      brush: BRUSHES.some((b) => b.id === raw.brush) ? (raw.brush as PaintBrush) : 'pen',
      color: HEX.test(raw.color ?? '') ? raw.color! : fallback.color,
      size: typeof raw.size === 'object' && raw.size ? raw.size : {},
      alpha: typeof raw.alpha === 'object' && raw.alpha ? raw.alpha : {},
      recents: Array.isArray(raw.recents) ? raw.recents.filter((c) => HEX.test(c)).slice(0, RECENTS_MAX) : fallback.recents,
    }
  } catch {
    return fallback
  }
}

export function useDrawSettings() {
  const [settings, setSettings] = useState(load)

  const update = useCallback((fn: (s: DrawSettings) => DrawSettings) => {
    setSettings((s) => {
      const next = fn(s)
      local.set(STORAGE_KEYS.drawSettings, JSON.stringify(next))
      return next
    })
  }, [])

  const sizeOf = (b: BrushId) => {
    const [min, def, max] = brushDef(b).size
    const v = settings.size[b]
    return typeof v === 'number' && v >= min && v <= max ? v : def
  }
  const alphaOf = (b: BrushId) => {
    const d = brushDef(b)
    const v = settings.alpha[b]
    return d.alpha && typeof v === 'number' && v >= 0.05 && v <= 1 ? v : d.opacity
  }

  return {
    settings,
    sizeOf,
    alphaOf,
    setBrush: (brush: PaintBrush) => update((s) => ({ ...s, brush })),
    setColor: (color: string) => update((s) => ({ ...s, color })),
    setSize: (b: BrushId, v: number) => update((s) => ({ ...s, size: { ...s.size, [b]: v } })),
    setAlpha: (b: BrushId, v: number) => update((s) => ({ ...s, alpha: { ...s.alpha, [b]: v } })),
    /** Pone el color al principio de los recientes. */
    remember: (color: string) =>
      update((s) => (s.recents[0] === color ? s : { ...s, recents: [color, ...s.recents.filter((c) => c !== color)].slice(0, RECENTS_MAX) })),
  }
}
