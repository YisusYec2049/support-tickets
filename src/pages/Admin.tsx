import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAdminAuthenticated } from '../lib/adminAuth'
import type { CasoSoporte } from '../types'
import { useAdminCasos, respondioUsuario } from '../mesa/useAdminCasos'
import { Badge, Ic, NewTag, SlideSeg, rise } from '../mesa/ui'
import { fDate, rel } from '../mesa/formato'

const POR_PAGINA = 15
type Filtro = 'pendiente' | 'proceso' | 'resuelto' | 'todos'
const FILTROS: [Filtro, string][] = [['pendiente', 'Pendientes'], ['proceso', 'En proceso'], ['resuelto', 'Resueltos'], ['todos', 'Todos']]
/** Pestaña elegida en esta sesión; se borra al iniciar sesión para que al entrar se elija sola. */
export const FILTRO_KEY = 'mda-admin-filtro'

/** Panel admin: tabla con filtro por estado y buscador. */
export default function Admin() {
  const navigate = useNavigate()
  const autenticado = isAdminAuthenticated()
  const { casos, ultimo, loading, error } = useAdminCasos(autenticado)
  const [filtro, setFiltro] = useState<Filtro | null>(() => {
    const f = sessionStorage.getItem(FILTRO_KEY) as Filtro | null
    return f && FILTROS.some(([v]) => v === f) ? f : null
  })
  const [q, setQ] = useState('')
  const [pagina, setPagina] = useState(1)

  useEffect(() => {
    if (!autenticado) navigate('/admin', { replace: true })
  }, [autenticado, navigate])

  // Al entrar: Pendientes si hay alguno; si no, En proceso. Al volver de un caso se respeta la pestaña.
  useEffect(() => {
    if (loading || filtro) return
    const f: Filtro = casos.some((c) => c.estado === 'pendiente') ? 'pendiente' : 'proceso'
    setFiltro(f)
    sessionStorage.setItem(FILTRO_KEY, f)
  }, [loading, filtro, casos])

  function elegir(f: Filtro) {
    setFiltro(f)
    setPagina(1)
    sessionStorage.setItem(FILTRO_KEY, f)
  }

  const cnt = (f: Filtro) => casos.filter((c) => f === 'todos' || c.estado === f).length
  const texto = q.trim().toLowerCase()
  const lista = casos
    .filter((c) => filtro === 'todos' || c.estado === filtro)
    .filter((c) => !texto || [c.caso_numero, c.nombre, c.correo, c.tipo_soporte].some((v) => (v ?? '').toLowerCase().includes(texto)))
    .sort((a, b) => {
      const d = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return filtro === 'pendiente' ? d : -d
    })
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const pag = Math.min(pagina, paginas)
  const vis = lista.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA)

  const estado = (c: CasoSoporte) => respondioUsuario(c, ultimo) ? <NewTag>Respuesta del usuario</NewTag> : <Badge estado={c.estado} />

  return (
    <section className="page">
      <div {...rise(0, 'head')}>
        <div className="head-txt"><h1>Casos por atender</h1></div>
        <button className="btn btn-sec" onClick={() => navigate('/admin/consolidados')}><Ic n="sheet" />Consolidados</button>
      </div>

      <div {...rise(1, 'group')}>
        <div className="toolbar">
          <SlideSeg label="Filtrar por estado" valor={filtro} onChange={elegir}
            opciones={FILTROS.map(([v, l]) => ({ v, l, n: cnt(v) }))} />
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
          // Se vuelve a montar al cambiar de pestaña o de página: las filas entran en cascada.
          <div key={`${filtro}-${pag}`} className="tw tw-b">
          {vis.length ? (
          <div className="tablewrap">
            <table>
              <thead><tr><th>N° caso</th><th>Solicitante</th><th>Tipo de soporte</th><th>Estado</th><th>Radicado</th></tr></thead>
              <tbody>
                {vis.map((c, i) => (
                  <tr key={c.id} tabIndex={0} style={{ '--i': i } as React.CSSProperties} onClick={() => navigate(`/admin/financiero/${c.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/admin/financiero/${c.id}`) }}>
                    <td data-c="num"><span className="cn mono">{c.caso_numero}</span></td>
                    <td data-c="who"><div className="who-n">{c.nombre}</div><div className="who-c">{c.correo}</div></td>
                    <td data-c="tipo">{c.tipo_soporte}</td>
                    <td data-c="estado">{estado(c)}</td>
                    <td data-c="fecha"><div className="num">{fDate(c.created_at)}</div><div className="ago num">{rel(c.created_at)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">{texto ? `Ningún caso coincide con “${q}”.` : 'No hay casos en este estado.'}</div>
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
