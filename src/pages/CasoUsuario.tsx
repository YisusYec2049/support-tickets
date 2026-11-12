import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { playNotification } from '../lib/sound'
import { getUserEmail } from '../lib/userSession'
import { usePasteImage } from '../lib/pasteImage'
import type { CasoSoporte, MensajeCaso } from '../types'
import { RT_SCHEMA, getLastSeen, markAsSeen, subirAdjunto } from '../mesa/datos'
import { AdjuntoSolicitud, Back, Badge, Composer, Ic, Thread, rise } from '../mesa/ui'
import { fDateTime } from '../mesa/formato'
import { ID_LABEL, SIN_ID, SIN_INSCRIPCION } from '../mesa/constantes'

/** Detalle del caso (usuario): conversación a la izquierda, "Tu solicitud" a la derecha. */
export default function CasoUsuario() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const correo = getUserEmail() ?? ''

  const [caso, setCaso] = useState<CasoSoporte | null>(null)
  const [mensajes, setMensajes] = useState<MensajeCaso[]>([])
  const [nuevoDesde, setNuevoDesde] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [reply, setReply] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  usePasteImage(!!caso && caso.estado !== 'resuelto', setFile)

  useEffect(() => {
    if (!correo) { navigate('/', { replace: true }); return }
    let vivo = true
    ;(async () => {
      try {
        const { data: c, error: cErr } = await supabase
          .from('casos_soporte').select('*').eq('id', id).eq('correo', correo).maybeSingle()
        if (cErr) throw cErr
        if (!c) { setError('No encontramos este caso entre los tuyos.'); return }
        const { data: m, error: mErr } = await supabase
          .from('mensajes_casos').select('*').eq('caso_id', id).order('created_at', { ascending: true })
        if (mErr) throw mErr
        if (!vivo) return
        const lista = (m ?? []) as MensajeCaso[]
        // Lo que Soporte escribió después de la última visita se marca como "Respuesta nueva".
        const visto = getLastSeen(id)
        const i = lista.findIndex((x) => x.autor === 'admin' && (!visto || x.created_at > visto))
        setNuevoDesde(i >= 0 ? i : null)
        setCaso(c as CasoSoporte)
        setMensajes(lista)
        markAsSeen(id)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'No se pudo abrir el caso.')
      } finally {
        if (vivo) setLoading(false)
      }
    })()

    const channel = supabase
      .channel(`caso-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: RT_SCHEMA, table: 'casos_soporte', filter: `id=eq.${id}` },
        (payload) => setCaso(payload.new as CasoSoporte))
      .on('postgres_changes', { event: 'INSERT', schema: RT_SCHEMA, table: 'mensajes_casos', filter: `caso_id=eq.${id}` },
        (payload) => {
          const nuevo = payload.new as MensajeCaso
          if (nuevo.autor === 'admin') { playNotification(); markAsSeen(id) }
          setMensajes((prev) => (prev.some((x) => x.id === nuevo.id) ? prev : [...prev, nuevo]))
        })
      .subscribe()

    return () => { vivo = false; supabase.removeChannel(channel) }
  }, [id, correo, navigate])

  async function enviar() {
    if (!caso || !reply.trim()) return
    setSendError(null)
    setSending(true)
    try {
      const adjunto_url = file ? await subirAdjunto(file) : null
      const { data, error: err } = await supabase
        .from('mensajes_casos')
        .insert({ caso_id: caso.id, autor: 'usuario', mensaje: reply.trim(), adjunto_url })
        .select()
        .single()
      if (err) throw err
      if (data) setMensajes((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as MensajeCaso]))
      setReply('')
      setFile(null)
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : 'No se pudo enviar el mensaje.')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="loading">Abriendo el caso…</div>
  if (error || !caso) {
    return (
      <section className="page">
        <Back to="/mis-casos">Inicio</Back>
        <div className="empty">{error ?? 'No encontramos este caso.'}</div>
      </section>
    )
  }

  const datos: [string, string][] = []
  if (!SIN_INSCRIPCION.includes(caso.tipo_soporte)) datos.push(['Tipo de inscripción', caso.tipo_usuario || 'Sin especificar'])
  if (!SIN_ID.includes(caso.tipo_soporte) && caso.numero_id) datos.push([ID_LABEL[caso.tipo_soporte] ?? 'ID', caso.numero_id])
  if (caso.nombre_inscripcion) datos.push(['Nombre de inscripción', caso.nombre_inscripcion])
  datos.push(['Radicado', fDateTime(caso.created_at)])

  return (
    <section className="page">
      <div {...rise(0, 'cu-head')}>
        <Back to="/mis-casos">Inicio</Back>
        <div className="cu-id"><span className="mono">{caso.caso_numero}</span><Badge estado={caso.estado} /></div>
        <h1 className="cu-h1">{caso.tipo_soporte}</h1>
      </div>

      <div {...rise(1, 'cu-a')}>
        <div className="group" style={{ gap: 20, minWidth: 0 }}>
          <p className="glabel">Conversación</p>
          <Thread
            mensajes={mensajes}
            yo="usuario"
            otro="Soporte Financiero"
            nuevoDesde={nuevoDesde}
            cerradoAt={caso.estado === 'resuelto' ? caso.updated_at : undefined}
            vacio="Soporte aún no ha respondido. Te avisamos aquí cuando lo haga."
          />
          {caso.estado === 'resuelto' ? (
            <div className="resolved-note">
              <p>Este caso ya está resuelto. Si necesitas más ayuda, radica uno nuevo.</p>
              <button className="btn btn-sec" onClick={() => navigate('/nuevo-caso')}><Ic n="plus" sw={2} />Radicar caso</button>
            </div>
          ) : (
            <Composer
              value={reply}
              onChange={setReply}
              onSubmit={enviar}
              sending={sending}
              file={file}
              setFile={setFile}
              error={sendError}
              placeholder="Escribe tu mensaje…"
              label="Enviar mensaje"
            />
          )}
        </div>

        <aside className="cu-sol">
          <h2>Tu solicitud</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{caso.descripcion}</p>
          {caso.adjunto_url && <AdjuntoSolicitud url={caso.adjunto_url} />}
          <hr style={{ border: 0, borderTop: '1px solid var(--b100)', margin: 0 }} />
          <dl className="dl">
            {datos.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="num">{v}</dd></div>)}
          </dl>
        </aside>
      </div>
    </section>
  )
}
