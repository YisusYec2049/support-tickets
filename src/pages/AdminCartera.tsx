import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CasoCartera } from '../types'
import { useAdminCartera, useSesionCartera, respondioUsuarioCar } from '../mesa/useAdminCartera'
import { Badge, Ic, NewTag, Quien, SlideSeg, rise } from '../mesa/ui'
import { fDate, rel } from '../mesa/formato'

const POR_PAGINA = 15
type Filtro = 'pendiente' | 'proceso' | 'resuelto' | 'todos'
type Unidad = 'todos' | 'Diplomados' | 'Especializaciones'
const FILTROS: [Filtro, string][] = [['pendiente', 'Pendientes'], ['proceso', 'En proceso'], ['resuelto', 'Resueltos'], ['todos', 'Todos']]
const UNIDADES: [Unidad, string][] = [['todos', 'Todas'], ['Diplomados', 'Diplomados'], ['Especializaciones', 'Especializaciones']]
/** Pestaña elegida en esta sesión; se borra al iniciar sesión para que al entrar se elija sola. */
export const FILTRO_CARTERA_KEY = 'mda-car-filtro'

/** Panel admin de Cartera (opción A aprobada): igual que Financiero + interruptor de unidad y "Atendido por". */
export default function AdminCartera() {
  const navigate = useNavigate()
  const sesion = useSesionCartera()
  const admin = sesion.cargando ? null : sesion.nombre
  const { casos, ultimo, loading, error, asignados, descartarAviso } = useAdminCartera(admin)
  const [filtro, setFiltro] = useState<Filtro | null>(() => {
    const f = sessionStorage.getItem(FILTRO_CARTERA_KEY) as Filtro | null
    return f && FILTROS.some(([v]) => v === f) ? f : null
  })
  const [unidad, setUnidad] = useState<Unidad>('todos')
  const [q, setQ] = useState('')
  const [pagina, setPagina] = useState(1)

  useEffect(() => {
    if (!sesion.cargando && sesion.nombre === null) navigate('/admin', { replace: true, state: { mod: 'car' } })
  }, [sesion, navigate])

  // Al entrar: Pendientes si hay alguno; si no, En proceso.
  useEffect(() => {
    if (loading || filtro) return
    const f: Filtro = casos.some((c) => c.estado === 'pendiente') ? 'pendiente' : 'proceso'
    setFiltro(f)
    sessionStorage.setItem(FILTRO_CARTERA_KEY, f)
  }, [loading, filtro, casos])

  function elegir(f: Filtro) {
    setFiltro(f)
    setPagina(1)
    sessionStorage.setItem(FILTRO_CARTERA_KEY, f)
  }

  const base = casos.filter((c) => unidad === 'todos' || c.unidad_negocio === unidad)
  const cnt = (f: Filtro) => base.filter((c) => f === 'todos' || c.estado === f).length
  const texto = q.trim().toLowerCase()
  const lista = base
    .filter((c) => filtro === 'todos' || c.estado === filtro)
    .filter((c) => !texto || [c.caso_numero, c.nombre, c.correo, c.tipo_soporte, c.atendido_por].some((v) => (v ?? '').toLowerCase().includes(texto)))
    .sort((a, b) => {
      const d = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return filtro === 'pendiente' ? d : -d
    })
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const pag = Math.min(pagina, paginas)
  const vis = lista.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA)
  const recien = new Set(asignados.map((c) => c.id))
  const abrir = (c: CasoCartera) => navigate(`/admin/cartera/${c.id}`)
  const nombreCorto = (admin ?? '').split(' ')[0]

  return (
    <section className="page">
      <div {...rise(0, 'head')}>
        <div className="head-txt"><h1>Casos de Cartera</h1></div>
        <button className="btn btn-sec" onClick={() => navigate('/admin/cartera/consolidados')}><Ic n="sheet" />Consolidados</button>
      </div>

      <div {...rise(1, 'group')}>
        {asignados.length > 0 && (
          <div className="car-banner" role="status">
            <span className="ib"><Ic n="arrowUR" sw={2} /></span>
            <span>
              <b>{nombreCorto ? `${nombreCorto}, te` : 'Te'} asignaron {asignados.length === 1 ? `el caso ${asignados[0].caso_numero}` : `${asignados.length} casos`}</b>
              {asignados.length === 1 && ` · ${asignados[0].tipo_soporte} de ${asignados[0].nombre}`}
            </span>
            <span style={{ display: 'flex', gap: 8 }}>
              {asignados.length === 1 && <button className="btn btn-sec" onClick={() => abrir(asignados[0])}>Ver caso</button>}
              <button className="btn btn-sec" onClick={descartarAviso} aria-label="Cerrar aviso"><Ic n="x" sw={2} /></button>
            </span>
          </div>
        )}

        <div className="toolbar">
          <div className="car-tools">
            <SlideSeg label="Filtrar por estado" valor={filtro} onChange={elegir}
              opciones={FILTROS.map(([v, l]) => ({ v, l, n: cnt(v) }))} />
            <SlideSeg label="Unidad de negocio" valor={unidad} onChange={(u) => { setUnidad(u); setPagina(1) }}
              opciones={UNIDADES.map(([v, l]) => ({ v, l }))} />
          </div>
          <label className="search">
            <Ic n="search" />
            <span className="sr">Buscar</span>
            <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPagina(1) }}
              placeholder="Buscar por N° de caso, nombre, correo o tipo" />
          </label>
        </div>

        {error && <div className="alert">{error}</div>}

        {loading || !filtro ? (
          <div className="loading">Cargando casos…</div>
        ) : (
          // Se vuelve a montar al cambiar de pestaña, unidad o página: las filas entran en cascada.
          <div key={`${filtro}-${unidad}-${pag}`} className="tw tw-b">
            {vis.length ? (
              <div className="tablewrap">
                <table>
                  <thead><tr><th>N° caso</th><th>Solicitante</th><th>Tipo de soporte</th><th>Atendido por</th><th>Estado</th><th>Radicado</th></tr></thead>
                  <tbody>
                    {vis.map((c, i) => (
                      <tr key={c.id} tabIndex={0} className={recien.has(c.id) ? 'recien' : ''} style={{ '--i': i } as React.CSSProperties}
                        onClick={() => abrir(c)} onKeyDown={(e) => { if (e.key === 'Enter') abrir(c) }}>
                        <td data-c="num"><span className="cn mono">{c.caso_numero}</span><div className="unit">{c.unidad_negocio}</div></td>
                        <td data-c="who"><div className="who-n">{c.nombre}</div><div className="who-c">{c.correo}</div></td>
                        <td data-c="tipo">{c.tipo_soporte}</td>
                        <td data-c="extra"><Quien nombre={c.atendido_por} yo={admin} /></td>
                        <td data-c="estado">{respondioUsuarioCar(c, ultimo) ? <NewTag>Respuesta del usuario</NewTag> : <Badge estado={c.estado} />}</td>
                        <td data-c="fecha"><div className="num">{fDate(c.created_at)}</div><div className="ago num">{rel(c.created_at)}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">{texto ? `Ningún caso coincide con “${q}”.` : 'No hay casos con estos filtros.'}</div>
            )}
          </div>
        )}

        {paginas > 1 && (
          <div className="pager">
            <span className="num">Página {pag} de {paginas}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sec" disabled={pag === 1} onClick={() => setPagina(pag - 1)}><Ic n="left" sw={1.8} />Anterior</button>
              <button className="btn btn-sec" disabled={pag === paginas} onClick={() => setPagina(pag + 1)}>Siguiente<Ic n="right" sw={1.8} /></button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
