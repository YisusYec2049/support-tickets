import type { MensajeCaso } from '../types'

interface Props {
  mensajes: MensajeCaso[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function MensajeThread({ mensajes }: Props) {
  if (mensajes.length === 0) {
    return (
      <p className="text-slate-500 text-sm italic text-center py-6">
        No hay mensajes en este caso todavía.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {mensajes.map((m) => {
        const isAdmin = m.autor === 'admin'
        return (
          <div
            key={m.id}
            className={`flex flex-col gap-1 ${isAdmin ? 'items-start' : 'items-end'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                isAdmin
                  ? 'bg-brand-700 text-white rounded-tl-sm'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tr-sm'
              }`}
            >
              {m.mensaje}
            </div>
            <span className="text-xs text-slate-400 px-1">
              {isAdmin ? 'Soporte Financiero' : 'Usted'} · {formatDate(m.created_at)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
