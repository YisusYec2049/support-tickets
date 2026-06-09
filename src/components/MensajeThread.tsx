import type { MensajeCaso } from '../types'

interface Props {
  mensajes: MensajeCaso[]
  perspectiva?: 'usuario' | 'admin'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function MensajeThread({ mensajes, perspectiva = 'usuario' }: Props) {
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
        // "yo" es quien envió el mensaje desde esta perspectiva
        const esMio = m.autor === perspectiva
        return (
          <div
            key={m.id}
            className={`flex flex-col gap-1 ${esMio ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                esMio
                  ? 'bg-brand-700 text-white rounded-tr-sm'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
              }`}
            >
              {m.mensaje}
            </div>
            <span className="text-xs text-slate-400 px-1">
              {esMio
                ? perspectiva === 'admin' ? 'Tú' : 'Usted'
                : perspectiva === 'admin' ? 'Usuario' : 'Soporte Financiero'
              } · {formatDate(m.created_at)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
