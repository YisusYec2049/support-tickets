import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MensajeCaso } from '../types'
import FileAttachment from '../components/FileAttachment'
import { fDateTime } from './formato'
import { ESTADO_LABEL } from './constantes'

/* ───────── íconos (los mismos trazos de la maqueta) ───────── */
const P: Record<string, string> = {
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/><path d="M8.8 12.2l2.2 2.2 4.3-4.4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  ticket: '<path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h12a2.5 2.5 0 0 1 2.5 2.5v1.2a2.3 2.3 0 0 0 0 4.6v1.2A2.5 2.5 0 0 1 18 18H6a2.5 2.5 0 0 1-2.5-2.5v-1.2a2.3 2.3 0 0 0 0-4.6z"/><path d="M9.5 6v12" stroke-dasharray="1.8 2"/>',
  pen: '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M13.5 8.5l3 3"/>',
  chat: '<path d="M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.6A7.5 7.5 0 1 1 20 12z"/>',
  arrowUR: '<path d="M7 17L17 7M8 7h9v9"/>',
  left: '<path d="M15 18l-6-6 6-6"/>',
  right: '<path d="M9 18l6-6-6-6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.8 2.8L16.2 9.6"/>',
  clip: '<path d="M20 11.5l-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  sheet: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9.5h16M4 15h16M10 4v16"/>',
}

export function Ic({ n, className, sw = 1.6, style }: { n: keyof typeof P | string; className?: string; sw?: number; style?: CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: P[n] ?? '' }}
    />
  )
}

/** Entrada escalonada: <div {...rise(1, 'otra-clase')}>. */
export const rise = (i: number, cls = '', style: CSSProperties = {}) => ({
  className: `rise ${cls}`.trim(),
  style: { animationDelay: `${i * 100}ms`, ...style } as CSSProperties,
})

/* ───────── estado del caso: solo azul, se distingue por forma ───────── */
export function Badge({ estado }: { estado: string }) {
  if (estado === 'resuelto') return <span className="st st-resuelto"><Ic n="check" sw={2} />Resuelto</span>
  return <span className={`st st-${estado}`}><i />{ESTADO_LABEL[estado] ?? estado}</span>
}

export function NewTag({ children }: { children: ReactNode }) {
  return <span className="newtag"><i />{children}</span>
}

export function Back({ to, children }: { to: string; children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <button className="back" onClick={() => navigate(to)}>
      <Ic n="left" sw={1.8} style={{ width: 16, height: 16 }} />{children}
    </button>
  )
}

export function FilePill({ url, name }: { url: string; name?: string }) {
  const label = name ?? decodeURIComponent(url.split('/').pop() ?? 'adjunto')
  return (
    <a className="file-pill" href={url} target="_blank" rel="noopener noreferrer" style={{ paddingRight: 12, textDecoration: 'none', color: 'inherit' }}>
      <Ic n="file" style={{ width: 16, height: 16, color: 'var(--b600)' }} />
      <span>{label}</span>
    </a>
  )
}

/** Adjunto de la solicitud: imagen o PDF se ven ahí mismo; Word/Excel con su ficha de descarga. */
export function AdjuntoSolicitud({ url }: { url: string }) {
  return (
    <div className="sol-media">
      <FileAttachment url={url} imageClassName="max-h-64 rounded-xl border border-black/5 object-contain hover:opacity-90 transition-opacity" />
    </div>
  )
}

/* ───────── conversación ───────── */
interface ThreadProps {
  mensajes: MensajeCaso[]
  /** Quién soy en esta vista: mis mensajes van a la derecha, en azul. */
  yo: 'usuario' | 'admin'
  /** Nombre corto del otro lado. */
  otro: string
  /** Índice del primer mensaje nuevo (se marca con una línea y la burbuja resaltada). */
  nuevoDesde?: number | null
  nuevoLabel?: string
  cerradoAt?: string
  vacio: string
}

export function Thread({ mensajes, yo, otro, nuevoDesde = null, nuevoLabel = 'Respuesta nueva', cerradoAt, vacio }: ThreadProps) {
  return (
    <div className="thread">
      {mensajes.length === 0 && <div className="empty-thread">{vacio}</div>}
      {mensajes.map((m, i) => {
        const mio = m.autor === yo
        const fresh = nuevoDesde !== null && i >= nuevoDesde && !mio
        return (
          <Fragment key={m.id}>
            {nuevoDesde !== null && i === nuevoDesde && <div className="cu-new">{nuevoLabel}</div>}
            <div className={`msg ${mio ? 'mine' : 'theirs'} ${fresh ? 'fresh' : ''}`}>
              <div className="bub">
                {m.mensaje}
                {m.adjunto_url && (
                  <div className="att-media">
                    <FileAttachment url={m.adjunto_url} imageClassName="max-h-56 rounded-xl object-contain hover:opacity-90 transition-opacity" />
                  </div>
                )}
              </div>
              <span className="meta num">{mio ? 'Tú' : otro} · {fDateTime(m.created_at)}</span>
            </div>
          </Fragment>
        )
      })}
      {cerradoAt && <span className="closed num"><Ic n="checkCircle" />Caso cerrado · {fDateTime(cerradoAt)}</span>}
    </div>
  )
}

/* ───────── caja de respuesta ───────── */
interface ComposerProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  sending: boolean
  file: File | null
  setFile: (f: File | null) => void
  error?: string | null
  placeholder: string
  label: string
  /** Solo admin: estado en que queda el caso al responder. */
  estado?: 'proceso' | 'resuelto'
  setEstado?: (e: 'proceso' | 'resuelto') => void
}

export function Composer({ value, onChange, onSubmit, sending, file, setFile, error, placeholder, label, estado, setEstado }: ComposerProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const preview = useMemo(() => (file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function quitar() {
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <form
      className="composer"
      onSubmit={(e) => { e.preventDefault(); if (value.trim() && !sending) onSubmit() }}
    >
      <label htmlFor="f-reply" className="sr">Mensaje</label>
      <textarea
        id="f-reply"
        rows={3}
        value={value}
        required
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            e.currentTarget.form?.requestSubmit()
          }
        }}
      />
      {file && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {preview && <span className="att-prev"><img src={preview} alt="Vista previa del adjunto" /></span>}
          <span className="file-pill">
            <span>{file.name}</span>
            <button type="button" onClick={quitar} aria-label="Quitar adjunto"><Ic n="x" sw={2} /></button>
          </span>
        </div>
      )}
      <div className="composer-bar">
        <button type="button" className="attach" onClick={() => fileRef.current?.click()}>
          <Ic n="clip" />Adjuntar imagen o pegar captura
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginLeft: 'auto' }}>
          {estado && setEstado && (
            <div className="seg" role="group" aria-label="Estado después de responder">
              <button type="button" aria-pressed={estado === 'proceso'} onClick={() => setEstado('proceso')}>Sigue en proceso</button>
              <button type="button" aria-pressed={estado === 'resuelto'} onClick={() => setEstado('resuelto')}>Resolver caso</button>
            </div>
          )}
          <span className="kbd"><kbd>Ctrl</kbd> + <kbd>Enter</kbd></span>
          <button className="btn btn-pri" type="submit" disabled={sending}>{sending ? 'Enviando…' : label}</button>
        </div>
      </div>
      {error && <p className="ac-err">{error}</p>}
    </form>
  )
}

/* ───────── aviso flotante ───────── */
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  const t = useRef<number | undefined>(undefined)
  function show(m: string) {
    setMsg(m)
    window.clearTimeout(t.current)
    t.current = window.setTimeout(() => setMsg(null), 2600)
  }
  useEffect(() => () => window.clearTimeout(t.current), [])
  const node = <div className={`toast ${msg ? 'show' : ''}`} role="status" aria-live="polite">{msg}</div>
  return { show, node }
}
