import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserEmail } from '../lib/userSession'
import { useCasosUsuario, ordenar, esCaliente } from '../mesa/useCasosUsuario'
import { Back, Badge, Ic, NewTag, rise } from '../mesa/ui'
import { fDate, fDateTime } from '../mesa/formato'
import { ESTADO_LABEL } from '../mesa/constantes'
import { FIN, type Modulo } from '../mesa/modulos'

type Filtro = 'todos' | 'abiertos' | 'resueltos'

/** Mis casos: la lista a la izquierda y un resumen del caso elegido a la derecha. */
export default function MisCasosLista({ mod = FIN }: { mod?: Modulo }) {
  const navigate = useNavigate()
  const correo = getUserEmail() ?? ''
  const { casos, loading, error } = useCasosUsuario(correo, mod)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [q, setQ] = useState('')
  const [selId, setSelId] = useState<string | null>(null)

  useEffect(() => {
    if (!correo) navigate('/', { replace: true })
  }, [correo, navigate])

  const todos = ordenar(casos)
  const pasa = (f: Filtro, estado: string) => f === 'todos' || (f === 'abiertos' ? estado !== 'resuelto' : estado === 'resuelto')
  const cnt = (f: Filtro) => todos.filter((c) => pasa(f, c.estado)).length
  const texto = q.trim().toLowerCase()
  const vis = todos
    .filter((c) => pasa(filtro, c.estado))
    .filter((c) => !texto || [c.caso_numero, c.tipo_soporte, c.descripcion, c.numero_id, c.nombre_inscripcion, c.unidad_negocio]
      .some((v) => String(v ?? '').toLowerCase().includes(texto)))
  const sel = vis.find((c) => c.id === selId) ?? vis[0] ?? null
  const ult = sel?.ultimo ?? null

  return (
    <section className="page">
      <div {...rise(0, 'cu-head')}>
        <Back to={mod.base}>Inicio</Back>
        <div className="head">
          <div className="head-txt">
            <h1>Mis casos</h1>
            <p className="lede">{mod.key === 'car' ? 'Todos tus casos de Cartera' : 'Todos los casos que has radicado'} con {correo}</p>
          </div>
          <button className="btn btn-pri" onClick={() => navigate(mod.nuevo)}><Ic n="plus" sw={2} />Radicar caso</button>
        </div>
      </div>

      <div {...rise(1, 'group', { gap: 24 })}>
        <div className="toolbar">
          <div className="seg" role="group" aria-label="Filtrar mis casos">
            {([['todos', 'Todos'], ['abiertos', 'Abiertos'], ['resueltos', 'Resueltos']] as [Filtro, string][]).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={filtro === v} onClick={() => setFiltro(v)}>
                {l} <span className="n">{cnt(v)}</span>
              </button>
            ))}
          </div>
          <label className="search">
            <Ic n="search" />
            <span className="sr">Buscar</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={mod.key === 'car' ? 'Buscar por N° de caso, tipo, unidad o texto' : 'Buscar por N° de caso, tipo, inscripción o texto'} />
          </label>
        </div>

        {error && <div className="alert">{error}</div>}

        {loading ? (
          <div className="loading">Cargando tus casos…</div>
        ) : !sel ? (
          <div className="empty">
            {casos.length ? 'Ningún caso coincide con la búsqueda.' : (mod.key === 'car' ? 'Aún no tienes casos de Cartera.' : 'Aún no tienes casos. Usa “Radicar caso” para enviar tu primera solicitud.')}
          </div>
        ) : (
          <div className="mc-d">
            <div className="ca-q">
              {vis.map((x) => (
                <button key={x.id} className={`ca-q-row ${x.id === sel.id ? 'sel' : ''}`} aria-pressed={x.id === sel.id} onClick={() => setSelId(x.id)}>
                  <span className="t">{x.tipo_soporte}</span>
                  <span className="mono v4-n">{x.caso_numero}</span>
                  <span className="s">
                    <span>{x.unidad_negocio ? `${x.unidad_negocio} · ` : ''}<span className="num">{fDate(x.created_at)}</span></span>
                    {esCaliente(x)
                      ? <span className="newtag" style={{ fontSize: 12 }}><i />Nueva respuesta</span>
                      : <span>{ESTADO_LABEL[x.estado]}</span>}
                  </span>
                </button>
              ))}
            </div>
            <div className="mc-prev">
              <div className="cu-id">
                <span className="mono" style={{ fontSize: 14, color: 'var(--b600)' }}>{sel.caso_numero}</span>
                {esCaliente(sel) ? <NewTag>Nueva respuesta</NewTag> : <Badge estado={sel.estado} />}
                {sel.unidad_negocio && <span className="unit-tag">{sel.unidad_negocio}</span>}
              </div>
              <h2>{sel.tipo_soporte}</h2>
              <p>{sel.descripcion}</p>
              {ult ? (
                <div className="group" style={{ gap: 10 }}>
                  <p className="glabel">Último mensaje · {ult.autor === 'admin' ? mod.corto : 'Tú'}</p>
                  <div className="bub" style={{ background: 'var(--card)', border: '1px solid var(--b100)' }}>{ult.mensaje}</div>
                  <span className="v4-dt num">{fDateTime(ult.created_at)}</span>
                </div>
              ) : (
                <div className="empty-thread">{mod.corto} aún no ha respondido.</div>
              )}
              <div>
                <button className="btn btn-pri" onClick={() => navigate(`${mod.base}/${sel.id}`)}>Abrir el caso <Ic n="arrowUR" sw={1.8} /></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
