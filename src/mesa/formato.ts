export const fDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })

export const fDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

/** "hace 5 min", "hace 3 h", "ayer", "hace 4 días". */
export function rel(iso: string): string {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 60) return `hace ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} días`
}

export function dur(ms: number): string {
  const t = Math.floor(ms / 60000)
  const d = Math.floor(t / 1440)
  const h = Math.floor((t % 1440) / 60)
  const mi = t % 60
  if (d > 0) return `${d} d ${h} h`
  if (h > 0) return `${h} h ${mi} min`
  return `${mi} min`
}

export function tiempoResolucion(c: { estado: string; created_at: string; updated_at: string }): string {
  if (c.estado !== 'resuelto') return '—'
  return dur(new Date(c.updated_at).getTime() - new Date(c.created_at).getTime())
}

/** "Jueves 12 de noviembre · 9:07 a. m." */
export function reloj(d = new Date()): string {
  const f = d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    f.charAt(0).toUpperCase() + f.slice(1).replace(',', '') + ' · ' +
    d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
  )
}
