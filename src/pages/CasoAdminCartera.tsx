import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { playNotification } from '../lib/sound'
import { usePasteImage } from '../lib/pasteImage'
import type { CasoCartera, MensajeCaso } from '../types'
import { RT_SCHEMA, subirAdjunto } from '../mesa/datos'
import { useAdminCartera, useSesionCartera, respondioUsuarioCar } from '../mesa/useAdminCartera'
import { AdjuntoSolicitud, Back, Badge, Composer, Ic, NewTag, Thread, rise, useToast } from '../mesa/ui'
import { fDate, fDateTime, rel, tiempoResolucion } from '../mesa/formato'
import { ESTADO_LABEL } from '../mesa/constantes'
import { ADMINS_CARTERA, iniciales } from '../mesa/modulos'

/** Detalle del caso de Cartera (admin, opción A): cola a la izquierda, caso a la derecha, reasignación en ventana. */
export default function CasoAdminCartera() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const sesion = useSesionCartera()
  const admin = sesion.cargando ? null : sesion.nombre
  const { casos, ultimo, actualizar, marcarAutor } = useAdminCartera(admin)

  const [caso, setCaso] = useState<CasoCartera | null>(null)
  const [mensajes, setMensajes] = useState<MensajeCaso[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [estado, setEstado] = useState<'proceso' | 'resuelto'>('proceso')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // Ventana de reasignación: elegir persona → confirmar.
  const [reasig, setReasig] = useState<{ paso: 'elegir' | 'confirmar'; a?: string } | null>(null)
  const [reasignando, setReasignando] = useState(false)
  const [reasigError, setReasigError] = useState<string | null>(null)

  usePasteImage(!!caso && caso.estado !== 'resuelto' && !reasig, setFile)

  useEffect(() => {
    if (!sesion.cargando && sesion.nombre === null) navigate('/admin', { replace: true, state: { mod: 'car' } })
  }, [sesion, navigate])

  useEffect(() => {
    if (!reasig) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setReasig(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [reasig])

  useEffect(() => {
    if (admin === null) return
    let vivo = true
    ;(async () => {
      try {
        const { data: c, error: cErr } = await supabase.from('casos_cartera').select('*').eq('id', id).maybeSingle()
        if (cErr) throw cErr
        if (!c) { setError('Este caso no existe.'); return }
        let actual = c as CasoCartera
        // Abrir un caso pendiente lo pasa a "En proceso" y queda a cargo de quien lo abrió (como antes).
        if (actual.estado === 'pendiente') {
          const { data: upd, error: uErr } = await supabase
            .from('casos_cartera')
            .update({ estado: 'proceso', updated_at: new Date().toISOString(), atendido_por: admin || null })
            .eq('id', id).select().single()
          if (uErr) throw uErr
          actual = upd as CasoCartera
          actualizar(actual)
        }
        const { data: m, error: mErr } = await supabase
          .from('mensajes_cartera').select('*').eq('caso_id', id).order('created_at', { ascending: true })
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
      .channel(`admin-cartera-caso-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: RT_SCHEMA, table: 'mensajes_cartera', filter: `caso_id=eq.${id}` },
        (payload) => {
          const nuevo = payload.new as MensajeCaso
          if (nuevo.autor === 'usuario') playNotification()
          setMensajes((prev) => (prev.some((x) => x.id === nuevo.id) ? prev : [...prev, nuevo]))
        })
      .on('postgres_changes', { event: 'UPDATE', schema: RT_SCHEMA, table: 'casos_cartera', filter: `id=eq.${id}` },
        (payload) => setCaso(payload.new as CasoCartera))
      .subscribe()
    return () => { vivo = false; supabase.removeChannel(channel) }
  }, [id, admin, actualizar])

  async function responder() {
    if (!caso || !msg.trim()) return
    setSendError(null)
    setSending(true)
    try {
      const adjunto_url = file ? await subirAdjunto(file) : null
      const { data: nuevo, error: mErr } = await supabase
        .from('mensajes_cartera')
        .insert({ caso_id: caso.id, autor: 'admin', mensaje: msg.trim(), adjunto_url })
        .select().single()
      if (mErr) throw mErr
      if (nuevo) setMensajes((prev) => (prev.some((x) => x.id === nuevo.id) ? prev : [...prev, nuevo as MensajeCaso]))
      marcarAutor(caso.id, 'admin')
      setMsg('')
      setFile(null)
      const { data: upd, error: uErr } = await supabase
        .from('casos_cartera')
        .update({ estado, updated_at: new Date().toISOString() })
        .eq('id', caso.id).select().single()
      if (uErr) setSendError(`Mensaje enviado, pero el estado no se pudo actualizar: ${uErr.message}`)
      else if (upd) { setCaso(upd as CasoCartera); actualizar(upd as CasoCartera) }
      setEstado('proceso')
    } catch (e: unknown) {
      setSendError(`Error al enviar mensaje: ${(e as { message?: string })?.message ?? String(e)}`)
    } finally {
      setSending(false)
    }
  }

  async function reasignar() {
    if (!caso || !reasig?.a) return
    setReasignando(true)
    setReasigError(null)
    try {
      const { data: upd, error: rErr } = await supabase
        .from('casos_cartera').update({ atendido_por: reasig.a }).eq('id', caso.id).select().single()
      if (rErr) throw rErr
      setCaso(upd as CasoCartera)
      actualizar(upd as CasoCartera)
      toast.show(`Caso reasignado a ${reasig.a}`)
      setReasig(null)
    } catch (e: unknown) {
      setReasigError(`Error al reasignar el caso: ${(e as { message?: string })?.message ?? String(e)}`)
    } finally {
      setReasignando(false)
    }
  }

  // Cola: primero los que respondieron, luego pendientes y en proceso (el más antiguo arriba).
  const peso = (c: CasoCartera) => (respondioUsuarioCar(c, ultimo) ? 0 : c.estado === 'pendiente' ? 1 : 2)
  const activos = casos
    .filter((c) => c.estado !== 'resuelto' || c.id === id)
    .sort((a, b) => peso(a) - peso(b) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  if (loading) return <div className="loading">Abriendo el caso…</div>
  if (error || !caso) {
    return (
      <section className="page">
        <Back to="/admin/cartera">Casos de Cartera</Back>
        <div className="empty">{error ?? 'Este caso no existe.'}</div>
      </section>
    )
  }

  let desde: number | null = null
  if (caso.estado === 'proceso' && mensajes.length && mensajes[mensajes.length - 1].autor === 'usuario') {
    let i = mensajes.length
    while (i > 0 && mensajes[i - 1].autor === 'usuario') i--
    desde = i
  }
  const mio = !!admin && caso.atendido_por === admin
  const datos: [string, string][] = [
    ['Correo', caso.correo],
    ['Unidad', caso.unidad_negocio || '—'],
    ['Tipo de inscripción', caso.tipo_usuario || 'Sin especificar'],
  ]
  if (caso.numero_id) datos.push(['N° de inscripción', caso.numero_id])
  if (caso.nombre_inscripcion) datos.push(['Nombre de inscripción', caso.nombre_inscripcion])
  datos.push(['Radicado', fDateTime(caso.created_at)])
  if (caso.estado === 'resuelto') datos.push(['Tiempo de resolución', tiempoResolucion(caso)])
  const otros = ADMINS_CARTERA.filter((a) => a !== caso.atendido_por)

  return (
    <section className="page">
      <div {...rise(0, 'cu-head')}>
        <Back to="/admin/cartera">Casos de Cartera</Back>
        <div className="cu-id">
          <span className="mono">{caso.caso_numero}</span>
          {desde !== null && <NewTag>Respuesta del usuario</NewTag>}
          <Badge estado={caso.estado} />
          {caso.unidad_negocio && <span className="unit-tag">{caso.unidad_negocio}</span>}
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
                onClick={() => x.id !== caso.id && navigate(`/admin/cartera/${x.id}`)}>
                <span className="t">{x.nombre}</span>
                <span className="mono v4-n">{x.caso_numero}</span>
                <span className="s">
                  <span>{x.tipo_soporte}</span>
                  {respondioUsuarioCar(x, ultimo)
                    ? <span className="newtag" style={{ fontSize: 12 }}><i />Respondió</span>
                    : <span>{x.atendido_por ? (x.atendido_por === admin ? 'Tú' : iniciales(x.atendido_por)) : x.estado === 'pendiente' ? 'Sin asignar' : ESTADO_LABEL[x.estado]}</span>}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="ca-d-main">
          <div className="ca-strip">
            <p style={{ whiteSpace: 'pre-wrap' }}>{caso.descripcion}</p>
            {caso.adjunto_url && <AdjuntoSolicitud url={caso.adjunto_url} />}
            <dl className="cu-facts">{datos.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="num">{v}</dd></div>)}</dl>
          </div>

          <div className="cc-resp">
            <span className="who-tag">
              <span className={`who-av ${mio ? 'me' : ''}`}>{caso.atendido_por ? iniciales(caso.atendido_por) : '—'}</span>
              <span><small>Atendido por</small><b>{caso.atendido_por ? (mio ? `Tú (${caso.atendido_por})` : caso.atendido_por) : 'Sin asignar'}</b></span>
            </span>
            {caso.estado !== 'resuelto' && (
              <button className="btn btn-sec" onClick={() => { setReasigError(null); setReasig({ paso: 'elegir' }) }}>
                <Ic n="arrowUR" sw={1.8} />Reasignar caso
              </button>
            )}
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
                value={msg} onChange={setMsg} onSubmit={responder} sending={sending}
                file={file} setFile={setFile} error={sendError}
                placeholder="Escribe la respuesta…"
                label={estado === 'resuelto' ? 'Responder y resolver' : 'Responder'}
                estado={estado} setEstado={setEstado}
              />
            )}
          </div>
        </div>
      </div>

      {reasig && (
        <div className="modal-bg" onClick={() => setReasig(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Reasignar caso" onClick={(e) => e.stopPropagation()}>
            {reasig.paso === 'elegir' ? (
              <>
                <h2>Reasignar {caso.caso_numero}</h2>
                <p>Elige a quién le pasas el caso. Le llegará un aviso en su panel.</p>
                <div className="cc-list">
                  {otros.map((a) => (
                    <button key={a} onClick={() => setReasig({ paso: 'confirmar', a })}>
                      <span className="who-av">{iniciales(a)}</span>{a}
                    </button>
                  ))}
                </div>
                <div><button className="btn btn-sec" onClick={() => setReasig(null)}>Cancelar</button></div>
              </>
            ) : (
              <>
                <h2>¿Reasignar a {reasig.a}?</h2>
                <p>El caso {caso.caso_numero} pasará a {reasig.a}{mio ? ' y dejará de estar a tu cargo' : ''}.</p>
                {reasigError && <p className="ac-err">{reasigError}</p>}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn btn-pri" disabled={reasignando} onClick={reasignar}>{reasignando ? 'Reasignando…' : 'Sí, reasignar'}</button>
                  <button className="btn btn-sec" onClick={() => setReasig({ paso: 'elegir' })}>Elegir otra persona</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {toast.node}
    </section>
  )
}
