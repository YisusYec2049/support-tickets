import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CasoSoporte } from '../types'
import { getLastSeen } from './datos'

export interface MsgResumen {
  caso_id: string
  autor: 'usuario' | 'admin'
  mensaje: string
  created_at: string
}

export interface CasoConResumen extends CasoSoporte {
  /** Mensajes de Soporte que esta persona no ha visto en este navegador. */
  noLeidos: number
  ultimo: MsgResumen | null
  ultimoAdmin: MsgResumen | null
}

/** Caso con respuesta nueva de Soporte: su ficha toma el foco en Inicio (y vibra). */
export const esCaliente = (c: CasoConResumen) => c.noLeidos > 0 && c.estado !== 'resuelto'

/** Casos del correo en sesión, con su último mensaje y cuántas respuestas no ha visto. */
export function useCasosUsuario(correo: string) {
  const [casos, setCasos] = useState<CasoConResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!correo) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('casos_soporte')
        .select('*')
        .eq('correo', correo)
        .order('created_at', { ascending: false })
      if (err) throw err
      const lista = (data ?? []) as CasoSoporte[]

      let msgs: MsgResumen[] = []
      if (lista.length) {
        const { data: m, error: mErr } = await supabase
          .from('mensajes_casos')
          .select('caso_id, autor, mensaje, created_at')
          .in('caso_id', lista.map((c) => c.id))
          .order('created_at', { ascending: true })
        if (mErr) throw mErr
        msgs = (m ?? []) as MsgResumen[]
      }

      setCasos(
        lista.map((c) => {
          const propios = msgs.filter((m) => m.caso_id === c.id)
          const admin = propios.filter((m) => m.autor === 'admin')
          const visto = getLastSeen(c.id)
          return {
            ...c,
            noLeidos: admin.filter((m) => !visto || m.created_at > visto).length,
            ultimo: propios[propios.length - 1] ?? null,
            ultimoAdmin: admin[admin.length - 1] ?? null,
          }
        }),
      )
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar tus casos.')
    } finally {
      setLoading(false)
    }
  }, [correo])

  useEffect(() => { cargar() }, [cargar])

  return { casos, loading, error, recargar: cargar }
}

/** Abiertos primero (los que tienen respuesta nueva arriba), luego por fecha. */
export function ordenar(casos: CasoConResumen[]) {
  return [...casos].sort(
    (a, b) =>
      Number(esCaliente(b)) - Number(esCaliente(a)) ||
      Number(a.estado === 'resuelto') - Number(b.estado === 'resuelto') ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}
