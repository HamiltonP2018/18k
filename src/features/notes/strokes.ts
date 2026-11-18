/** Trazos de los dibujos (datos puros, sin React). */

export interface Stroke {
  color: string
  /** Grosor como fracción del ancho. */
  size: number
  erase: boolean
  /** x0, y0, x1, y1… normalizados 0–1. */
  pts: number[]
}

/**
 * Trazos de un dibujo. Vive en el padre (useState) para que el borrador
 * sobreviva si el editor se cierra sin enviar.
 */
export class StrokeStore {
  private list: Stroke[] = []
  get all(): readonly Stroke[] {
    return this.list
  }
  get size(): number {
    return this.list.length
  }
  add(s: Stroke): void {
    this.list.push(s)
  }
  undo(): void {
    this.list.pop()
  }
  clear(): void {
    this.list = []
  }
}
