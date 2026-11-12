import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { isAdminAuthenticated } from '../lib/adminAuth'
import type { CasoSoporte } from '../types'
import { Back, Badge, Ic, rise } from '../mesa/ui'
import { dur, fDate, tiempoResolucion } from '../mesa/formato'
import { ESTADO_LABEL, TIPOS_SOPORTE } from '../mesa/constantes'

function filas(casos: CasoSoporte[]) {
  return casos.map((c) => ({
    'N° Caso': c.caso_numero,
    Nombre: c.nombre,
    Correo: c.correo,
    'Tipo Inscripción': c.tipo_usuario,
    'N° Inscripción': c.numero_id,
    'Tipo de Soporte': c.tipo_soporte,
    Descripción: c.descripcion,
    Estado: c.estado,
    Fecha: fDate(c.created_at),
    'Tiempo Resolución': tiempoResolucion(c),
  }))
}

function nombreArchivo(desde: string, hasta: string, estado: string, tipo: string, ext: string) {
  return `consolidado_${desde}_${hasta}${estado !== 'todos' ? `_${estado}` : ''}${tipo !== 'todos' ? `_${tipo.replace(/ /g, '_')}` : ''}.${ext}`
}

function exportCSV(casos: CasoSoporte[], archivo: string) {
  const rows = filas(casos)
  const headers = Object.keys(rows[0] ?? { 'N° Caso': '' })
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(String(r[h as keyof typeof r] ?? ''))).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url
  a.download = archivo
  a.click()
  URL.revokeObjectURL(url)
}

function exportExcel(casos: CasoSoporte[], archivo: string) {
  const ws = XLSX.utils.json_to_sheet(filas(casos))
  ws['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 30 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 40 }, { wch: 12 }, { wch: 14 }, { wch: 16 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Consolidado')
  XLSX.writeFile(wb, archivo)
}

/** Fecha local en formato yyyy-mm-dd (toISOString la correría a UTC). */
const isoLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

export default function AdminConsolidados() {
  const navigate = useNavigate()
  const autenticado = isAdminAuthenticated()
  const hoy = new Date()
  const [desde, setDesde] = useState(isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)))
  const [hasta, setHasta] = useState(isoLocal(hoy))
  const [estado, setEstado] = useState('todos')
  const [tipo, setTipo] = useState('todos')
  const [casos, setCasos] = useState<CasoSoporte[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState({ desde, hasta, estado, tipo })

  const generar = useCallback(async (f: { desde: string; hasta: string; estado: string; tipo: string }) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('casos_soporte')
        .select('*')
        .gte('created_at', `${f.desde}T00:00:00`)
        .lte('created_at', `${f.hasta}T23:59:59`)
        .order('created_at', { ascending: false })
      if (f.estado !== 'todos') query = query.eq('estado', f.estado)
      if (f.tipo !== 'todos') query = query.eq('tipo_soporte', f.tipo)
      const { data, error: err } = await query
      if (err) throw err
      setCasos((data ?? []) as CasoSoporte[])
      setPeriodo(f)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo generar el informe.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!autenticado) { navigate('/admin', { replace: true }); return }
    generar({ desde, hasta, estado, tipo })
    // Solo al entrar: después se genera con el botón.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const total = casos.length
  const resueltos = casos.filter((c) => c.estado === 'resuelto')
  const efectividad = total ? Math.round((resueltos.length / total) * 1000) / 10 : 0
  const promedio = resueltos.length
    ? dur(resueltos.reduce((s, c) => s + (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()), 0) / resueltos.length)
    : '—'
  const contar = (key: (c: CasoSoporte) => string) =>
    Object.entries(casos.reduce<Record<string, number>>((acc, c) => { const k = key(c); acc[k] = (acc[k] ?? 0) + 1; return acc }, {}))
      .sort((a, b) => b[1] - a[1])
  const topTipo = contar((c) => c.tipo_soporte)[0]
  const porUsuario = contar((c) => c.correo)[0]
  const topUsuario = porUsuario ? { nombre: casos.find((c) => c.correo === porUsuario[0])?.nombre ?? porUsuario[0], n: porUsuario[1] } : null
  const porInscripcion = contar((c) => c.tipo_usuario || 'Sin especificar')
  const archivo = (ext: string) => nombreArchivo(periodo.desde, periodo.hasta, periodo.estado, periodo.tipo, ext)

  return (
    <section className="page">
      <div {...rise(0, 'cu-head')}>
        <Back to="/admin/financiero">Casos por atender</Back>
        <div className="head-txt">
          <h1>Consolidados</h1>
          <p className="lede">Elige el periodo y descarga el informe.</p>
        </div>
      </div>

      <form {...rise(1, 'filters')} onSubmit={(e) => { e.preventDefault(); generar({ desde, hasta, estado, tipo }) }}>
        <div className="field"><label htmlFor="f-desde">Desde</label><input id="f-desde" type="date" required value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
        <div className="field"><label htmlFor="f-hasta">Hasta</label><input id="f-hasta" type="date" required value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
        <div className="field">
          <label htmlFor="f-cestado">Estado</label>
          <select id="f-cestado" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="todos">Todos</option>
            {Object.entries(ESTADO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-ctipo">Tipo de soporte</label>
          <select id="f-ctipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="todos">Todos</option>
            {TIPOS_SOPORTE.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button className="btn btn-pri" type="submit" disabled={loading}>{loading ? 'Generando…' : 'Generar'}</button>
      </form>

      <div {...rise(2, 'group')}>
        {error && <div className="alert">{error}</div>}
        <div className="toolbar">
          <div className="summary">
            <div><span className="v">{total}</span><span className="k">casos en el periodo</span></div>
            <div><span className="v">{resueltos.length}</span><span className="k">resueltos · {efectividad}% de efectividad</span></div>
            <div><span className="v">{promedio}</span><span className="k">tiempo medio de resolución</span></div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-pri" disabled={!total} onClick={() => exportExcel(casos, archivo('xlsx'))}><Ic n="sheet" />Descargar Excel</button>
            <button className="btn btn-sec" disabled={!total} onClick={() => exportCSV(casos, archivo('csv'))}>CSV</button>
          </div>
        </div>

        {total > 0 && (
          <div className="summary" style={{ gap: '12px 36px' }}>
            <div><span className="k">Tipo de soporte más frecuente</span><span style={{ fontWeight: 600 }}>{topTipo ? `${topTipo[0]} · ${topTipo[1]}` : '—'}</span></div>
            <div><span className="k">Usuario con más casos</span><span style={{ fontWeight: 600 }}>{topUsuario ? `${topUsuario.nombre} · ${topUsuario.n}` : '—'}</span></div>
            <div><span className="k">Por tipo de inscripción</span><span style={{ fontWeight: 600 }}>{porInscripcion.map(([k, n]) => `${k} ${n}`).join(' · ')}</span></div>
          </div>
        )}

        {loading ? (
          <div className="loading">Generando informe…</div>
        ) : total ? (
          <div className="tablewrap">
            <table>
              <thead><tr><th>N° caso</th><th>Solicitante</th><th>Tipo de soporte</th><th>Estado</th><th>Radicado</th><th>Resolución</th></tr></thead>
              <tbody>
                {casos.map((c) => (
                  <tr key={c.id} tabIndex={0} onClick={() => navigate(`/admin/financiero/${c.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/admin/financiero/${c.id}`) }}>
                    <td data-c="num"><span className="cn mono">{c.caso_numero}</span></td>
                    <td data-c="who"><div className="who-n">{c.nombre}</div><div className="who-c">{c.correo}</div></td>
                    <td data-c="tipo">{c.tipo_soporte}</td>
                    <td data-c="estado"><Badge estado={c.estado} /></td>
                    <td data-c="fecha" className="num">{fDate(c.created_at)}</td>
                    <td data-c="extra" className="num">{tiempoResolucion(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No hay casos con esos filtros. Amplía el periodo o quita un filtro.</div>
        )}
      </div>
    </section>
  )
}
