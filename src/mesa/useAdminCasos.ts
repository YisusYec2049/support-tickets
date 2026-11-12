import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { playNotification } from '../lib/sound'
import type { CasoSoporte, MensajeCaso } from '../types'
import { RT_SCHEMA } from './datos'

/** Autor del último mensaje de cada caso, para saber cuándo respondió el usuario. */
type UltimoAutor = Record<string, 'usuario' | 'admin'>

/** El usuario escribió después de la última respuesta de Soporte. */
export const respondioUsuario = (c: CasoSoporte, ultimo: UltimoAutor) =>
  c.estado === 'proceso' && ultimo[c.id] === 'usuario'

/** Todos los casos de Financiero + autor del último mensaje, al día con Realtime. */
export function useAdminCasos(activo: boolean) {
  const [casos, setCasos] = useState<CasoSoporte[]>([])
  const [ultimo, setUltimo] = useState<UltimoAutor>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ data: c, error: cErr }, { data: m, error: mErr }] = await Promise.all([
        supabase.from('casos_soporte').select('*').order('created_at', { ascending: false }),
        // Del más nuevo al más viejo: si algún día pasan del tope de filas de la API,
        // lo que se corta son los mensajes viejos, no el último de cada caso.
        supabase.from('mensajes_casos').select('caso_id, autor, created_at').order('created_at', { ascending: false }),
      ])
      if (cErr) throw cErr
      if (mErr) throw mErr
      setCasos((c ?? []) as CasoSoporte[])
      const u: UltimoAutor = {}
      for (const x of (m ?? []) as Pick<MensajeCaso, 'caso_id' | 'autor'>[]) if (!u[x.caso_id]) u[x.caso_id] = x.autor
      setUltimo(u)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los casos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!activo) return
    cargar()
    const channel = supabase
      .channel('admin-financiero')
      .on('postgres_changes', { event: 'INSERT', schema: RT_SCHEMA, table: 'casos_soporte' }, (payload) => {
        const nuevo = payload.new as CasoSoporte
        playNotification()
        setCasos((prev) => (prev.some((x) => x.id === nuevo.id) ? prev : [nuevo, ...prev]))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: RT_SCHEMA, table: 'casos_soporte' }, (payload) => {
        const upd = payload.new as CasoSoporte
        setCasos((prev) => prev.map((x) => (x.id === upd.id ? upd : x)))
      })
      .on('postgres_changes', { event: 'INSERT', schema: RT_SCHEMA, table: 'mensajes_casos' }, (payload) => {
        const msg = payload.new as MensajeCaso
        setUltimo((prev) => ({ ...prev, [msg.caso_id]: msg.autor }))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activo, cargar])

  /** Para reflejar al instante lo que hace el admin, sin esperar a Realtime. */
  const actualizar = useCallback((c: CasoSoporte) => setCasos((prev) => prev.map((x) => (x.id === c.id ? c : x))), [])
  const marcarAutor = useCallback((casoId: string, autor: 'usuario' | 'admin') => setUltimo((prev) => ({ ...prev, [casoId]: autor })), [])

  return { casos, ultimo, loading, error, actualizar, marcarAutor }
}
