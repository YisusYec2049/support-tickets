import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { playNotification } from '../lib/sound'
import type { CasoCartera, MensajeCaso } from '../types'
import { RT_SCHEMA } from './datos'

/** Sesión de Cartera (Supabase Auth). `nombre` sale de user_metadata.nombre. */
export function useSesionCartera() {
  const [estado, setEstado] = useState<{ cargando: boolean; nombre: string | null }>({ cargando: true, nombre: null })
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEstado({ cargando: false, nombre: session ? (session.user.user_metadata?.nombre ?? '') : null })
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setEstado({ cargando: false, nombre: session ? (session.user.user_metadata?.nombre ?? '') : null })
    })
    return () => subscription.unsubscribe()
  }, [])
  return estado
}

/* Último "atendido por" visto por cada admin y caso, en este navegador (misma llave de antes). */
const getUltimo = (admin: string, id: string) => localStorage.getItem(`atendido_ultimo_${admin}_${id}`)
const setUltimo = (admin: string, id: string, v: string) => localStorage.setItem(`atendido_ultimo_${admin}_${id}`, v)

type UltimoAutor = Record<string, 'usuario' | 'admin'>
export const respondioUsuarioCar = (c: CasoCartera, u: UltimoAutor) => c.estado === 'proceso' && u[c.id] === 'usuario'

/**
 * Casos de Cartera + autor del último mensaje, al día con Realtime.
 * Avisa (sonido + `asignados`) cuando a `admin` le reasignan un caso, en vivo o desde la última visita.
 */
export function useAdminCartera(admin: string | null) {
  const [casos, setCasos] = useState<CasoCartera[]>([])
  const [ultimo, setUltimoAutor] = useState<UltimoAutor>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [asignados, setAsignados] = useState<CasoCartera[]>([])
  const casosRef = useRef<CasoCartera[]>([])
  useEffect(() => { casosRef.current = casos }, [casos])

  const cargar = useCallback(async () => {
    if (admin === null) return
    setLoading(true)
    setError(null)
    try {
      const [{ data: c, error: cErr }, { data: m, error: mErr }] = await Promise.all([
        supabase.from('casos_cartera').select('*').order('created_at', { ascending: false }),
        supabase.from('mensajes_cartera').select('caso_id, autor, created_at').order('created_at', { ascending: false }),
      ])
      if (cErr) throw cErr
      if (mErr) throw mErr
      const lista = (c ?? []) as CasoCartera[]
      setCasos(lista)
      const u: UltimoAutor = {}
      for (const x of (m ?? []) as Pick<MensajeCaso, 'caso_id' | 'autor'>[]) if (!u[x.caso_id]) u[x.caso_id] = x.autor
      setUltimoAutor(u)
      // Reasignaciones que ocurrieron mientras no estaba (la primera visita solo guarda la base).
      if (admin) {
        const nuevos: CasoCartera[] = []
        for (const x of lista) {
          const antes = getUltimo(admin, x.id)
          const ahora = x.atendido_por ?? ''
          if (antes !== null && antes !== ahora && ahora === admin) nuevos.push(x)
          setUltimo(admin, x.id, ahora)
        }
        if (nuevos.length) setAsignados(nuevos)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los casos.')
    } finally {
      setLoading(false)
    }
  }, [admin])

  useEffect(() => {
    if (admin === null) return
    cargar()
    const channel = supabase
      .channel('admin-cartera')
      .on('postgres_changes', { event: 'INSERT', schema: RT_SCHEMA, table: 'casos_cartera' }, (payload) => {
        const nuevo = payload.new as CasoCartera
        playNotification()
        setCasos((prev) => (prev.some((x) => x.id === nuevo.id) ? prev : [nuevo, ...prev]))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: RT_SCHEMA, table: 'casos_cartera' }, (payload) => {
        const act = payload.new as CasoCartera
        const antes = casosRef.current.find((x) => x.id === act.id)
        setCasos((prev) => prev.map((x) => (x.id === act.id ? act : x)))
        if (admin) {
          setUltimo(admin, act.id, act.atendido_por ?? '')
          if (act.atendido_por === admin && antes && antes.atendido_por !== act.atendido_por) {
            playNotification()
            setAsignados((prev) => [act, ...prev.filter((x) => x.id !== act.id)])
          }
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: RT_SCHEMA, table: 'mensajes_cartera' }, (payload) => {
        const msg = payload.new as MensajeCaso
        setUltimoAutor((prev) => ({ ...prev, [msg.caso_id]: msg.autor }))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [admin, cargar])

  const actualizar = useCallback((c: CasoCartera) => {
    setCasos((prev) => prev.map((x) => (x.id === c.id ? c : x)))
    if (admin) setUltimo(admin, c.id, c.atendido_por ?? '')
  }, [admin])
  const marcarAutor = useCallback((id: string, autor: 'usuario' | 'admin') => setUltimoAutor((prev) => ({ ...prev, [id]: autor })), [])
  const descartarAviso = useCallback(() => setAsignados([]), [])

  return { casos, ultimo, loading, error, asignados, descartarAviso, actualizar, marcarAutor }
}
