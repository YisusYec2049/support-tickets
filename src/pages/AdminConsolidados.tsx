import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { isAdminAuthenticated, setAdminAuthenticated, clearAdminAuth } from '../lib/adminAuth'
import { useNavigate } from 'react-router-dom'
import EstadoBadge from '../components/EstadoBadge'
import type { CasoSoporte } from '../types'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD as string

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium' })
}

function exportCSV(casos: CasoSoporte[], desde: string, hasta: string) {
  const headers = ['N° Caso', 'Nombre', 'Correo', 'Tipo Inscripción', 'N° Inscripción', 'Descripción', 'Estado', 'Fecha']
  const rows = casos.map((c) => [
    c.caso_numero,
    c.nombre,
    c.correo,
    c.tipo_usuario,
    c.numero_id,
    `"${c.descripcion.replace(/"/g, '""')}"`,
    c.estado,
    formatDate(c.created_at),
  ])
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `consolidado_${desde}_${hasta}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminConsolidados() {
  const navigate = useNavigate()
  const [authenticated, setAuthenticated] = useState(isAdminAuthenticated)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10)

  const [desde, setDesde] = useState(firstOfMonth)
  const [hasta, setHasta] = useState(today)
  const [casos, setCasos] = useState<CasoSoporte[]>([])
  const [loading, setLoading] = useState(false)
  const [generado, setGenerado] = useState(false)

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setAdminAuthenticated()
      setAuthenticated(true)
      setAuthError(false)
    } else {
      setAuthError(true)
    }
  }

  async function generar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setGenerado(false)
    try {
      const { data, error } = await supabase
        .from('casos_soporte')
        .select('*')
        .gte('created_at', `${desde}T00:00:00`)
        .lte('created_at', `${hasta}T23:59:59`)
        .order('created_at', { ascending: false })
      if (error) throw error
      setCasos(data ?? [])
      setGenerado(true)
    } finally {
      setLoading(false)
    }
  }

  // Stats derivadas
  const total = casos.length
  const porEstado = {
    pendiente: casos.filter((c) => c.estado === 'pendiente').length,
    proceso: casos.filter((c) => c.estado === 'proceso').length,
    resuelto: casos.filter((c) => c.estado === 'resuelto').length,
  }
  const porTipo: Record<string, number> = casos.reduce(
    (acc, c) => ({ ...acc, [c.tipo_usuario]: (acc[c.tipo_usuario] ?? 0) + 1 }),
    {} as Record<string, number>,
  )

  // ─── Login ───────────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="max-w-sm mx-auto py-20">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <h2 className="text-xl font-bold text-brand-800 mb-1 text-center">Acceso Administrativo</h2>
          <p className="text-slate-500 text-sm text-center mb-6">Área restringida — Dirección Financiera</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              required
              autoFocus
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            {authError && <p className="text-red-600 text-xs">Contraseña incorrecta.</p>}
            <button
              type="submit"
              className="w-full bg-brand-700 hover:bg-brand-800 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Consolidados</h1>
          <p className="text-slate-500 text-sm mt-1">Reporte de tickets por rango de fechas</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="text-sm text-brand-700 border border-brand-300 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
          >
            ← Panel de casos
          </button>
          <button
            onClick={() => { clearAdminAuth(); setAuthenticated(false) }}
            className="text-sm text-slate-500 hover:text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Filtro de fechas */}
      <form
        onSubmit={generar}
        className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-8 flex flex-col sm:flex-row items-end gap-4"
      >
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            Desde
          </label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            Hasta
          </label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-brand-700 hover:bg-brand-800 disabled:bg-brand-300 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          {loading ? 'Generando...' : 'Generar reporte'}
        </button>
      </form>

      {/* Resultados */}
      {generado && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-brand-700 text-white rounded-xl p-5 shadow-sm sm:col-span-1">
              <div className="text-3xl font-bold">{total}</div>
              <div className="text-sm font-medium opacity-90 mt-1">Total</div>
            </div>
            <div className="bg-yellow-500 text-white rounded-xl p-5 shadow-sm">
              <div className="text-3xl font-bold">{porEstado.pendiente}</div>
              <div className="text-sm font-medium opacity-90 mt-1">Pendientes</div>
            </div>
            <div className="bg-blue-500 text-white rounded-xl p-5 shadow-sm">
              <div className="text-3xl font-bold">{porEstado.proceso}</div>
              <div className="text-sm font-medium opacity-90 mt-1">En Proceso</div>
            </div>
            <div className="bg-green-500 text-white rounded-xl p-5 shadow-sm">
              <div className="text-3xl font-bold">{porEstado.resuelto}</div>
              <div className="text-sm font-medium opacity-90 mt-1">Resueltos</div>
            </div>
          </div>

          {/* Por tipo de inscripción */}
          {Object.keys(porTipo).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Por tipo de inscripción</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(porTipo).map(([tipo, count]) => (
                  <div key={tipo} className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm">
                    <span className="font-semibold text-brand-700">{count}</span>
                    <span className="text-slate-600 ml-2">{tipo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabla + exportar */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">
                {total} caso{total !== 1 ? 's' : ''} en el período {formatDate(desde + 'T12:00:00')} — {formatDate(hasta + 'T12:00:00')}
              </span>
              {total > 0 && (
                <button
                  onClick={() => exportCSV(casos, desde, hasta)}
                  className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Exportar CSV
                </button>
              )}
            </div>

            {total === 0 ? (
              <p className="text-center text-slate-400 text-sm py-12">
                No se encontraron casos en este rango de fechas.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['N° Caso', 'Nombre', 'Correo', 'Tipo', 'N° Inscripción', 'Estado', 'Fecha'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {casos.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-brand-700">{c.caso_numero}</td>
                      <td className="px-4 py-3 text-slate-800">{c.nombre}</td>
                      <td className="px-4 py-3 text-slate-600">{c.correo}</td>
                      <td className="px-4 py-3 text-slate-600">{c.tipo_usuario}</td>
                      <td className="px-4 py-3 text-slate-600">{c.numero_id}</td>
                      <td className="px-4 py-3"><EstadoBadge estado={c.estado} /></td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
