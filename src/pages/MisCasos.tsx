import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserEmail } from '../lib/userSession'
import { useCasosUsuario, ordenar, esCaliente, type CasoConResumen } from '../mesa/useCasosUsuario'
import { Badge, Ic, NewTag, rise } from '../mesa/ui'
import { fDate } from '../mesa/formato'

/** Inicio del usuario: Radicar caso arriba, sus casos abiertos en fichas y los resueltos al lado. */
export default function MisCasos() {
  const navigate = useNavigate()
  const correo = getUserEmail() ?? ''
  const { casos, loading, error } = useCasosUsuario(correo)

  useEffect(() => {
    if (!correo) navigate('/', { replace: true })
  }, [correo, navigate])

  const lista = ordenar(casos)
  const abiertos = lista.filter((c) => c.estado !== 'resuelto')
  const resueltos = lista
    .filter((c) => c.estado === 'resuelto')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  const hayCaliente = abiertos.some(esCaliente)

  const ficha = (c: CasoConResumen) => {
    const hot = esCaliente(c)
    const resp = hot ? c.ultimoAdmin : null
    return (
      <button key={c.id} className={`v4-card ${hot ? 'hot' : ''}`} onClick={() => navigate(`/mis-casos/${c.id}`)}>
        <span className="v4-top">
          <span className="mono v4-n">{c.caso_numero}</span>
          {resp && <span className="v4-dt num">{fDate(resp.created_at)}</span>}
        </span>
        <span className="v4-t">{c.tipo_soporte}</span>
        {resp
          ? <span className="v4-reply"><b>Soporte:</b> {resp.mensaje}</span>
          : <span className="v4-d">{c.descripcion}</span>}
        <span className="v4-foot">
          {hot ? <NewTag>Nueva respuesta</NewTag> : <Badge estado={c.estado} />}
          <span className="v4-dt num">{fDate(c.created_at)}</span>
        </span>
      </button>
    )
  }

  return (
    <section className="page">
      <h1 {...rise(0)}>¿En qué te ayudamos?</h1>
      <div {...rise(1, `stage-v4 page ${hayCaliente ? 'hot-b' : ''}`, { gap: 32 })}>
        <a className="v4-band" href="/nuevo-caso" onClick={(e) => { e.preventDefault(); navigate('/nuevo-caso') }}>
          <span className="v4-bi"><Ic n="pen" className="v4-ico" /></span>
          <span className="v4-btxt">
            <span className="v4-bh">Radicar caso</span>
            <span className="v4-bp">Reportar un problema o pedir un trámite. Te respondemos por esta misma mesa.</span>
          </span>
          <span className="btn btn-pri">Empezar <Ic n="arrowUR" sw={1.8} /></span>
        </a>

        {error && <div className="alert">{error}</div>}

        {loading ? (
          <div className="loading">Cargando tus casos…</div>
        ) : (
          <div className="v4-c">
            <div className="group">
              <p className="glabel">Abiertos <span className="count">{abiertos.length}</span></p>
              {abiertos.length
                ? <div className="v4-grid two">{abiertos.map(ficha)}</div>
                : <div className="empty">No tienes casos abiertos.</div>}
            </div>
            <div className="v4-hist">
              <div className="glabel-row">
                <p className="glabel">Resueltos <span className="count">{resueltos.length}</span></p>
                {casos.length > 0 && <button className="linkbtn" onClick={() => navigate('/mis-casos/todos')}>Ver todos</button>}
              </div>
              <div className="v4-hrows">
                {resueltos.slice(0, 3).map((c) => (
                  <button key={c.id} className="v4-hrow" onClick={() => navigate(`/mis-casos/${c.id}`)}>
                    <span className="mono v4-n">{c.caso_numero}</span>
                    <span className="v4-ht">{c.tipo_soporte}</span>
                    <span className="v4-dt num">{fDate(c.updated_at)}</span>
                  </button>
                ))}
                {resueltos.length === 0 && <span className="v4-dt" style={{ padding: 6 }}>Aún no tienes casos resueltos.</span>}
              </div>
            </div>
          </div>
        )}

        <div className="group">
          <p className="glabel">Equipo de soporte</p>
          <button className="v4-admin" onClick={() => navigate('/admin')}>
            <Ic n="chat" className="v4-aico" />
            <span className="v4-atxt">
              <span className="v4-ah">Administración</span>
              <span className="v4-ap">Atender y responder los casos radicados</span>
            </span>
            <Ic n="arrowUR" className="v4-aar" sw={1.8} />
          </button>
        </div>
      </div>
    </section>
  )
}
