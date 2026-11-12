import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { playNotification } from '../lib/sound'
import { isAdminAuthenticated } from '../lib/adminAuth'
import { usePasteImage } from '../lib/pasteImage'
import type { CasoSoporte, MensajeCaso } from '../types'
import { RT_SCHEMA, subirAdjunto } from '../mesa/datos'
import { useAdminCasos, respondioUsuario } from '../mesa/useAdminCasos'
import { AdjuntoSolicitud, Back, Badge, Composer, NewTag, Thread, rise } from '../mesa/ui'
import { fDate, fDateTime, rel, tiempoResolucion } from '../mesa/formato'
import { ESTADO_LABEL, ID_LABEL, SIN_ID, SIN_INSCRIPCION } from '../mesa/constantes'

/** Detalle del caso (admin): cola de casos activos a la izquierda, el caso a la derecha. */
export default function CasoAdmin() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const autenticado = isAdminAuthenticated()
  const { casos, ultimo, actualizar, marcarAutor } = useAdminCasos(autenticado)

  const [caso, setCaso] = useState<CasoSoporte | null>(null)
  const [mensajes, setMensajes] = useState<MensajeCaso[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [msg, setMsg] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [estado, setEstado] = useState<'proceso' | 'resuelto'>('proceso')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  usePasteImage(!!caso && caso.estado !== 'resuelto', setFile)

  useEffect(() => {
    if (!autenticado) { navigate('/admin', { replace: true }); return }
    let vivo = true
    ;(async () => {
      try {
        const { data: c, error: cErr } = await supabase.from('casos_soporte').select('*').eq('id', id).maybeSingle()
        if (cErr) throw cErr
        if (!c) { setError('Este caso no existe.'); return }
        let actual = c as CasoSoporte
        // Abrir un caso pendiente lo pasa a "En proceso" (igual que antes del rediseño).
        if (actual.estado === 'pendiente') {
          const { data: upd, error: uErr } = await supabase
            .from('casos_soporte')
            .update({ estado: 'proceso', updated_at: new Date().toISOString() })
            .eq('id', id).select().single()
          if (uErr) throw uErr
          actual = upd as CasoSoporte
          actualizar(actual)
        }
        const { data: m, error: mErr } = await supabase
          .from('mensajes_casos').select('*').eq('caso_id', id).order('created_at', { ascending: true })
        if (mErr) throw mErr
        if (!vivo) return
        setCaso(actual)
        setMensajes((m ?? []) as MensajeCaso[])
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'No se pudo abrir el caso.')
      } finally {
        if (vivo) setLoading(false)
      }
    })()

    const channel = supabase
      .channel(`admin-caso-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: RT_SCHEMA, table: 'mensajes_casos', filter: `caso_id=eq.${id}` },
        (payload) => {
          const nuevo = payload.new as MensajeCaso
          if (nuevo.autor === 'usuario') playNotification()
          setMensajes((prev) => (prev.some((x) => x.id === nuevo.id) ? prev : [...prev, nuevo]))
        })
      .on('postgres_changes', { event: 'UPDATE', schema: RT_SCHEMA, table: 'casos_soporte', filter: `id=eq.${id}` },
        (payload) => setCaso(payload.new as CasoSoporte))
      .subscribe()
    return () => { vivo = false; supabase.removeChannel(channel) }
  }, [id, autenticado, navigate, actualizar])

  async function responder() {
    const c = caso
    if (!c || !msg.trim()) return
    setSendError(null)
    setSending(true)
    try {
      const adjunto_url = file ? await subirAdjunto(file) : null
      const { data: nuevo, error: mErr } = await supabase
        .from('mensajes_casos')
        .insert({ caso_id: c.id, autor: 'admin', mensaje: msg.trim(), adjunto_url })
        .select().single()
      if (mErr) throw mErr
      if (nuevo) setMensajes((prev) => (prev.some((x) => x.id === nuevo.id) ? prev : [...prev, nuevo as MensajeCaso]))
      marcarAutor(c.id, 'admin')
      setMsg('')
      setFile(null)

      const { data: upd, error: uErr } = await supabase
        .from('casos_soporte')
        .update({ estado, updated_at: new Date().toISOString() })
        .eq('id', c.id).select().single()
      if (uErr) setSendError(`Mensaje enviado, pero el estado no se pudo actualizar: ${uErr.message}`)
      else if (upd) { setCaso(upd as CasoSoporte); actualizar(upd as CasoSoporte) }
      setEstado('proceso')
    } catch (e: unknown) {
      setSendError(`Error al enviar mensaje: ${(e as { message?: string })?.message ?? String(e)}`)
    } finally {
      setSending(false)
    }
  }

  // Cola: primero los que respondieron, luego pendientes y en proceso (el más antiguo arriba).
  const peso = (c: CasoSoporte) => (respondioUsuario(c, ultimo) ? 0 : c.estado === 'pendiente' ? 1 : 2)
  const activos = casos
    .filter((c) => c.estado !== 'resuelto' || c.id === id)
    .sort((a, b) => peso(a) - peso(b) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  if (loading) return <div className="loading">Abriendo el caso…</div>
  if (error || !caso) {
    return (
      <section className="page">
        <Back to="/admin/financiero">Panel de administración</Back>
        <div className="empty">{error ?? 'Este caso no existe.'}</div>
      </section>
    )
  }

  // Desde dónde marcar "Respuesta del usuario": mensajes del usuario después del último de Soporte.
  let desde: number | null = null
  if (caso.estado === 'proceso' && mensajes.length && mensajes[mensajes.length - 1].autor === 'usuario') {
    let i = mensajes.length
    while (i > 0 && mensajes[i - 1].autor === 'usuario') i--
    desde = i
  }
  const respondio = desde !== null

  const datos: [string, string][] = [['Correo', caso.correo]]
  if (!SIN_INSCRIPCION.includes(caso.tipo_soporte)) datos.push(['Tipo de inscripción', caso.tipo_usuario || 'Sin especificar'])
  if (!SIN_ID.includes(caso.tipo_soporte) && caso.numero_id) datos.push([ID_LABEL[caso.tipo_soporte] ?? 'ID', caso.numero_id])
  if (caso.nombre_inscripcion) datos.push(['Nombre de inscripción', caso.nombre_inscripcion])
  datos.push(['Radicado', fDateTime(caso.created_at)])
  if (caso.estado === 'resuelto') datos.push(['Tiempo de resolución', tiempoResolucion(caso)])

  return (
    <section className="page">
      <div {...rise(0, 'cu-head')}>
        <Back to="/admin/financiero">Panel de administración</Back>
        <div className="cu-id">
          <span className="mono">{caso.caso_numero}</span>
          {respondio && <NewTag>Respuesta del usuario</NewTag>}
          <Badge estado={caso.estado} />
        </div>
        <h1 className="cu-h1">{caso.tipo_soporte}</h1>
        <span style={{ fontSize: 15, color: 'var(--text2)' }}>
          <b style={{ color: 'var(--b900)', fontWeight: 600 }}>{caso.nombre}</b> · radicó {rel(caso.created_at)}
        </span>
      </div>

      <div {...rise(1, 'ca-d')}>
        <div className="group" style={{ gap: 12 }}>
          <p className="glabel">Casos activos <span className="count">{activos.filter((c) => c.estado !== 'resuelto').length}</span></p>
          <div className="ca-q">
            {activos.map((x) => (
              <button key={x.id} className={`ca-q-row ${x.id === caso.id ? 'sel' : ''}`} aria-current={x.id === caso.id}
                onClick={() => x.id !== caso.id && navigate(`/admin/financiero/${x.id}`)}>
                <span className="t">{x.nombre}</span>
                <span className="mono v4-n">{x.caso_numero}</span>
                <span className="s">
                  <span>{x.tipo_soporte}</span>
                  {respondioUsuario(x, ultimo)
                    ? <span className="newtag" style={{ fontSize: 12 }}><i />Respondió</span>
                    : <span>{ESTADO_LABEL[x.estado]}</span>}
                </span>
              </button>
            ))}
            {activos.length === 0 && <span className="v4-dt" style={{ padding: 6 }}>No hay casos activos.</span>}
          </div>
        </div>

        <div className="ca-d-main">
          <div className="ca-strip">
            <p style={{ whiteSpace: 'pre-wrap' }}>{caso.descripcion}</p>
            {caso.adjunto_url && <AdjuntoSolicitud url={caso.adjunto_url} />}
            <dl className="cu-facts">
              {datos.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="num">{v}</dd></div>)}
            </dl>
          </div>

          <div className="group" style={{ gap: 20 }}>
            <p className="glabel">Conversación</p>
            <Thread
              mensajes={mensajes}
              yo="admin"
              otro={caso.nombre.split(' ')[0] || 'Usuario'}
              nuevoDesde={desde}
              nuevoLabel="Respuesta del usuario"
              cerradoAt={caso.estado === 'resuelto' ? caso.updated_at : undefined}
              vacio="Aún no hay mensajes. Tu respuesta será la primera."
            />
            {caso.estado === 'resuelto' ? (
              <div className="resolved-note"><p>Caso resuelto en {tiempoResolucion(caso)} · {fDate(caso.updated_at)}.</p></div>
            ) : (
              <Composer
                value={msg}
                onChange={setMsg}
                onSubmit={responder}
                sending={sending}
                file={file}
                setFile={setFile}
                error={sendError}
                placeholder="Escribe la respuesta…"
                label={estado === 'resuelto' ? 'Responder y resolver' : 'Responder'}
                estado={estado}
                setEstado={setEstado}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
