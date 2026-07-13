interface Props {
  estado: string
}

type Tone = 'warn' | 'info' | 'good' | 'neutral'

const MAP: Record<string, { label: string; tone: Tone }> = {
  pendiente: { label: 'Pendiente', tone: 'warn' },
  proceso: { label: 'En Proceso', tone: 'info' },
  resuelto: { label: 'Resuelto', tone: 'good' },
}

const PILL_CLASSES: Record<Tone, string> = {
  warn: 'bg-amber-500/10 text-amber-700',
  info: 'bg-blue-500/10 text-blue-700',
  good: 'bg-green-500/10 text-green-700',
  neutral: 'bg-slate-500/10 text-slate-700',
}

const DOT_CLASSES: Record<Tone, string> = {
  warn: 'bg-amber-500',
  info: 'bg-blue-500',
  good: 'bg-green-500',
  neutral: 'bg-slate-500',
}

export default function EstadoBadge({ estado }: Props) {
  const cfg = MAP[estado] ?? { label: estado, tone: 'neutral' as Tone }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${PILL_CLASSES[cfg.tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[cfg.tone]}`} />
      {cfg.label}
    </span>
  )
}
