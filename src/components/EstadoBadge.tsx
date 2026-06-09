interface Props {
  estado: string
}

const MAP: Record<string, { label: string; classes: string }> = {
  pendiente: {
    label: 'Pendiente',
    classes: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  },
  proceso: {
    label: 'En Proceso',
    classes: 'bg-blue-100 text-blue-800 border border-blue-300',
  },
  resuelto: {
    label: 'Resuelto',
    classes: 'bg-green-100 text-green-800 border border-green-300',
  },
}

export default function EstadoBadge({ estado }: Props) {
  const cfg = MAP[estado] ?? {
    label: estado,
    classes: 'bg-slate-100 text-slate-700 border border-slate-300',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  )
}
