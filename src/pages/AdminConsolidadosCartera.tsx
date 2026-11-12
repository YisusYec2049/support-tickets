import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import type { CasoCartera } from '../types'
import { useSesionCartera } from '../mesa/useAdminCartera'
import { Back, Badge, Ic, Quien, rise } from '../mesa/ui'
import { dur, fDate, tiempoResolucion } from '../mesa/formato'
import { ESTADO_LABEL } from '../mesa/constantes'
import { TIPOS_CARTERA } from '../mesa/modulos'

// Mismas columnas que exportaba Cartera antes del rediseño.
function filas(casos: CasoCartera[]) {
  return casos.map((c) => ({
    'N° Caso': c.caso_numero,
    Nombre: c.nombre,
    Correo: c.correo,
    'Tipo de Soporte': c.tipo_soporte,
    Descripción: c.descripcion,
    Estado: c.estado,
    Fecha: fDate(c.created_at),
    'Tiempo Resolución': tiempoResolucion(c),
  }))
}

const nombreArchivo = (desde: string, hasta: string, estado: string, tipo: string, ext: string) =>
  `consolidado_${desde}_${hasta}${estado !== 'todos' ? `_${estado}` : ''}${tipo !== 'todos' ? `_${tipo.replace(/ /g, '_')}` : ''}.${ext}`

function exportCSV(casos: CasoCartera[], archivo: string) {
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

function exportExcel(casos: CasoCartera[], archivo: string) {
  const ws = XLSX.utils.json_to_sheet(filas(casos))
  ws['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 30 }, { wch: 26 }, { wch: 40 }, { wch: 12 }, { wch: 14 }, { wch: 16 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Consolidado')
  XLSX.writeFile(wb, archivo)
}

const isoLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

/** Consolidados de Cartera (opción A aprobada): igual que Financiero + columnas unidad y "Atendido por". */
export default function AdminConsolidadosCartera() {
  const navigate = useNavigate()
  const sesion = useSesionCartera()
  const hoy = new Date()
  const [desde, setDesde] = useState(isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)))
  const [hasta, setHasta] = useState(isoLocal(hoy))
  const [estado, setEstado] = useState('todos')
  const [tipo, setTipo] = useState('todos')
  const [casos, setCasos] = useState<CasoCartera[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState({ desde, hasta, estado, tipo })

  const generar = useCallback(async (f: { desde: string; hasta: string; estado: string; tipo: string }) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('casos_cartera')
        .select('*')
        .gte('created_at', `${f.desde}T00:00:00`)
        .lte('created_at', `${f.hasta}T23:59:59`)
        .order('created_at', { ascending: false })
      if (f.estado !== 'todos') query = query.eq('estado', f.estado)
      if (f.tipo !== 'todos') query = query.eq('tipo_soporte', f.tipo)
      const { data, error: err } = await query
      if (err) throw err
      setCasos((data ?? []) as CasoCartera[])
      setPeriodo(f)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo generar el informe.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sesion.cargando) return
    if (sesion.nombre === null) { navigate('/admin', { replace: true, state: { mod: 'car' } }); return }
    generar({ desde, hasta, estado, tipo })
    // Solo al entrar: después se genera con el botón.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion.cargando, sesion.nombre])

  const total = casos.length
  const resueltos = casos.filter((c) => c.estado === 'resuelto')
  const efectividad = total ? Math.round((resueltos.length / total) * 1000) / 10 : 0
  const promedio = resueltos.length
    ? dur(resueltos.reduce((s, c) => s + (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()), 0) / resueltos.length)
    : '—'
  const archivo = (ext: string) => nombreArchivo(periodo.desde, periodo.hasta, periodo.estado, periodo.tipo, ext)

  if (sesion.cargando) return <div className="loading">Verificando sesión…</div>

  return (
    <section className="page">
      <div {...rise(0, 'cu-head')}>
        <Back to="/admin/cartera">Casos de Cartera</Back>
        <div className="head-txt">
          <h1>Consolidados de Cartera</h1>
          <p className="lede">Elige el periodo y descarga el informe.</p>
        </div>
      </div>

      <form {...rise(1, 'filters')} onSubmit={(e) => { e.preventDefault(); generar({ desde, hasta, estado, tipo }) }}>
        <div className="field"><label htmlFor="f-kdesde">Desde</label><input id="f-kdesde" type="date" required value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
        <div className="field"><label htmlFor="f-khasta">Hasta</label><input id="f-khasta" type="date" required value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
        <div className="field">
          <label htmlFor="f-kest">Estado</label>
          <select id="f-kest" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="todos">Todos</option>
            {Object.entries(ESTADO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-ktipo">Tipo de soporte</label>
          <select id="f-ktipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="todos">Todos</option>
            {TIPOS_CARTERA.map((t) => <option key={t} value={t}>{t}</option>)}
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

        {loading ? (
          <div className="loading">Generando informe…</div>
        ) : total ? (
          <div className="tablewrap">
            <table>
              <thead><tr><th>N° caso</th><th>Solicitante</th><th>Tipo de soporte</th><th>Atendido por</th><th>Estado</th><th>Radicado</th><th>Resolución</th></tr></thead>
              <tbody>
                {casos.map((c) => (
                  <tr key={c.id} tabIndex={0} onClick={() => navigate(`/admin/cartera/${c.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/admin/cartera/${c.id}`) }}>
                    <td data-c="num"><span className="cn mono">{c.caso_numero}</span><div className="unit">{c.unidad_negocio}</div></td>
                    <td data-c="who"><div className="who-n">{c.nombre}</div><div className="who-c">{c.correo}</div></td>
                    <td data-c="tipo">{c.tipo_soporte}</td>
                    <td data-c="extra"><Quien nombre={c.atendido_por} yo={sesion.nombre} /></td>
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
