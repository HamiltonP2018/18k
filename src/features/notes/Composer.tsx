/**
 * Editor de notitas (hoja modal) con dos pestañas: Escribir y Dibujar.
 * El borrador (texto y trazos) se conserva si se cierra sin enviar.
 */
import { useEffect, useRef, useState } from 'react'
import { Brush, Loader2, PenLine, SendHorizontal } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Button } from '../../components/Button'
import { heartBurst } from '../../lib/confetti'
import { local, STORAGE_KEYS } from '../../lib/storage'
import { cx } from '../../lib/cx'
import { useNotes } from './NotesContext'
import { DrawingPad, type DrawingPadHandle } from './DrawingPad'
import { StrokeStore } from './strokes'
import { PAPER } from './colors'
import { LIMITS, NOTE_COLORS, type NoteColor } from './protocol'
import styles from './Composer.module.css'

export type ComposerTab = 'text' | 'draw'

export interface ComposerProps {
  open: boolean
  tab: ComposerTab
  onTab: (t: ComposerTab) => void
  onClose: () => void
}

const savedColor = (): NoteColor => {
  const c = local.get(STORAGE_KEYS.noteColor)
  return (NOTE_COLORS as readonly string[]).includes(c ?? '') ? (c as NoteColor) : 'cream'
}

export function Composer({ open, tab, onTab, onClose }: ComposerProps) {
  const { send, setActivity, status } = useNotes()
  const [color, setColorState] = useState<NoteColor>(savedColor)
  const [text, setText] = useState('')
  const [caption, setCaption] = useState('')
  const [hasInk, setHasInk] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [store] = useState(() => new StrokeStore())
  const pad = useRef<DrawingPadHandle | null>(null)

  const setColor = (c: NoteColor) => {
    setColorState(c)
    local.set(STORAGE_KEYS.noteColor, c)
  }

  useEffect(() => {
    if (!open) setActivity(null)
  }, [open, setActivity])

  const close = () => {
    setActivity(null)
    setError(null)
    onClose()
  }

  const online = status === 'online'
  const canSend = online && !sending && (tab === 'text' ? text.trim().length > 0 : hasInk)

  const submit = async () => {
    if (!canSend) return
    setSending(true)
    setError(null)
    try {
      if (tab === 'text') {
        await send({ kind: 'text', text: text.trim(), color })
        setText('')
      } else {
        const image = pad.current?.exportImage()
        if (!image) throw new Error('Dibuja algo primero ✍️')
        await send({ kind: 'drawing', text: caption.trim(), color, image })
        store.clear()
        setCaption('')
        setHasInk(false)
      }
      setActivity(null)
      heartBurst({ y: 0.75, count: 50, power: 0.6 })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar')
    } finally {
      setSending(false)
    }
  }

  return (
    <Sheet open={open} onClose={close} title={tab === 'text' ? 'Escríbele una notita' : 'Hazle un dibujito'} className={styles.sheet}>
      <div className={styles.tabs} role="tablist" aria-label="Tipo de notita">
        <button type="button" role="tab" aria-selected={tab === 'text'} className={cx(styles.tab, tab === 'text' && styles.tabOn)} onClick={() => onTab('text')}>
          <PenLine aria-hidden strokeWidth={1.7} /> Escribir
        </button>
        <button type="button" role="tab" aria-selected={tab === 'draw'} className={cx(styles.tab, tab === 'draw' && styles.tabOn)} onClick={() => onTab('draw')}>
          <Brush aria-hidden strokeWidth={1.7} /> Dibujar
        </button>
      </div>

      <div className={styles.colors} role="radiogroup" aria-label="Color del papel">
        {NOTE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={`Papel ${PAPER[c].label}`}
            className={cx(styles.swatch, color === c && styles.swatchOn)}
            style={{ background: PAPER[c].bg }}
            onClick={() => setColor(c)}
          />
        ))}
      </div>

      {tab === 'text' ? (
        <div className={styles.paper} style={{ background: PAPER[color].bg }}>
          <textarea
            className={styles.textarea}
            value={text}
            onChange={(e) => {
              setText(e.target.value.slice(0, LIMITS.text))
              setActivity(e.target.value ? 'typing' : null)
            }}
            onBlur={() => setActivity(null)}
            placeholder="Te extraño… ✍️"
            rows={6}
            maxLength={LIMITS.text}
            aria-label="Texto de la notita"
            autoFocus
          />
          <span className={styles.counter} aria-hidden>
            {text.length}/{LIMITS.text}
          </span>
        </div>
      ) : (
        <div className={styles.draw}>
          <DrawingPad ref={pad} store={store} paper={PAPER[color].bg} onChange={setHasInk} onActivity={() => setActivity('drawing')} />
          <input
            className={styles.caption}
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 120))}
            placeholder="Dedicatoria (opcional)"
            aria-label="Dedicatoria del dibujo"
            maxLength={120}
          />
        </div>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!online && <p className={styles.offline}>Sin conexión… se reconecta solo en unos segundos.</p>}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        className={styles.send}
        onClick={() => void submit()}
        disabled={!canSend}
        icon={sending ? <Loader2 className={styles.spin} aria-hidden /> : <SendHorizontal aria-hidden />}
      >
        {sending ? 'Enviando…' : 'Enviar'}
      </Button>
    </Sheet>
  )
}
