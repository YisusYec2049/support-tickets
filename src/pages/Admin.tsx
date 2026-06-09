import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { CasoSoporte, MensajeCaso } from '../types'
import EstadoBadge from '../components/EstadoBadge'
import MensajeThread from '../components/MensajeThread'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD as string

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

interface Stats {
  total: number
  pendiente: number
  proceso: number
  cerrado: number
}

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState(false)

  const [casos, setCasos] = useState<CasoSoporte[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats>({ total: 0, pendiente: 0, proceso: 0, cerrado: 0 })

  const [selectedCaso, setSelectedCaso] = useState<CasoSoporte | null>(null)
  const [mensajes, setMensajes] = useState<MensajeCaso[]>([])
  const [loadingMensajes, setLoadingMensajes] = useState(false)
  const [adminMsg, setAdminMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [refreshing, setRefreshing] = useState(false)

  const cargarCasos = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('casos_soporte')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      const all = data ?? []
      setCasos(all)
      setStats({
        total: all.length,
        pendiente: all.filter((c) => c.estado === 'pendiente').length,
        proceso: all.filter((c) => c.estado === 'proceso').length,
        cerrado: all.filter((c) => c.estado === 'resuelto').length,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authenticated) cargarCasos()
  }, [authenticated, cargarCasos])

  async function recargar() {
    if (refreshing) return
    setRefreshing(true)
    try {
      if (selectedCaso) {
        const { data: msgs } = await supabase
          .from('mensajes_casos')
          .select('*')
          .eq('caso_id', selectedCaso.id)
          .order('created_at', { ascending: true })
        setMensajes(msgs ?? [])
        const { data: casoActualizado } = await supabase
          .from('casos_soporte')
          .select('*')
          .eq('id', selectedCaso.id)
          .single()
        if (casoActualizado) setSelectedCaso(casoActualizado)
      } else {
        await cargarCasos()
      }
    } finally {
      setRefreshing(false)
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true)
      setAuthError(false)
    } else {
      setAuthError(true)
    }
  }

  async function abrirCaso(caso: CasoSoporte) {
    setSelectedCaso(caso)
    setMensajes([])
    setAdminMsg('')
    setSendError(null)
    setLoadingMensajes(true)

    try {
      // Auto-change to 'proceso' if still 'pendiente'
      if (caso.estado === 'pendiente') {
        const { data: updated, error: updateErr } = await supabase
          .from('casos_soporte')
          .update({ estado: 'proceso', updated_at: new Date().toISOString() })
          .eq('id', caso.id)
          .select()
          .single()
        if (updateErr) throw updateErr
        setSelectedCaso(updated)
        setCasos((prev) =>
          prev.map((c) => (c.id === caso.id ? updated : c)),
        )
        setStats((s) => ({ ...s, pendiente: s.pendiente - 1, proceso: s.proceso + 1 }))
      }

      const { data, error: msgErr } = await supabase
        .from('mensajes_casos')
        .select('*')
        .eq('caso_id', caso.id)
        .order('created_at', { ascending: true })
      if (msgErr) throw msgErr
      setMensajes(data ?? [])
    } finally {
      setLoadingMensajes(false)
    }
  }

  async function enviarMensajeAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCaso || !adminMsg.trim()) return
    setSendError(null)
    setSending(true)
    try {
      // 1. Insert message — si esto falla sí es un error real
      const { error: msgErr } = await supabase.from('mensajes_casos').insert({
        caso_id: selectedCaso.id,
        autor: 'admin',
        mensaje: adminMsg.trim(),
      })
      if (msgErr) throw msgErr

      // 2. Limpiar campo y recargar mensajes inmediatamente
      setAdminMsg('')
      const { data: msgs } = await supabase
        .from('mensajes_casos')
        .select('*')
        .eq('caso_id', selectedCaso.id)
        .order('created_at', { ascending: true })
      setMensajes(msgs ?? [])

      // 3. Intentar cerrar el caso (best-effort, no bloquea si falla)
      const { data: updated, error: updateErr } = await supabase
        .from('casos_soporte')
        .update({ estado: 'resuelto', updated_at: new Date().toISOString() })
        .eq('id', selectedCaso.id)
        .select()
        .single()

      if (!updateErr && updated) {
        setSelectedCaso(updated)
        setCasos((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        setStats((s) => ({ ...s, proceso: s.proceso - 1, cerrado: s.cerrado + 1 }))  // 'cerrado' es el contador local, el valor en DB es 'resuelto'
      } else if (updateErr) {
        // El mensaje se envió, pero el estado no se pudo actualizar
        console.warn('No se pudo actualizar el estado:', updateErr.message)
        setSendError(`Mensaje enviado, pero el estado no se pudo cerrar: ${updateErr.message}`)
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? JSON.stringify(err)
      setSendError(`Error al enviar mensaje: ${msg}`)
    } finally {
      setSending(false)
    }
  }

  // ─── Login screen ───────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="max-w-sm mx-auto py-20">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <h2 className="text-xl font-bold text-brand-800 mb-1 text-center">
            Acceso Administrativo
          </h2>
          <p className="text-slate-500 text-sm text-center mb-6">
            Área restringida — Dirección Financiera
          </p>
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
            {authError && (
              <p className="text-red-600 text-xs">Contraseña incorrecta. Intenta de nuevo.</p>
            )}
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

  // ─── Dashboard ──────────────────────────────────────────────────────────────
  const casosFiltrados =
    filtroEstado === 'todos' ? casos : casos.filter((c) => c.estado === filtroEstado as CasoSoporte['estado'])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Panel de Administración</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de casos — Dirección Financiera</p>
        </div>
        <button
          onClick={() => setAuthenticated(false)}
          className="text-sm text-slate-500 hover:text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors"
        >
          Cerrar sesión
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: stats.total, color: 'bg-brand-700 text-white' },
          { label: 'Pendientes', value: stats.pendiente, color: 'bg-yellow-500 text-white' },
          { label: 'En Proceso', value: stats.proceso, color: 'bg-blue-500 text-white' },
          { label: 'Cerrados', value: stats.cerrado, color: 'bg-green-500 text-white' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-5 shadow-sm ${s.color}`}>
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm font-medium opacity-90 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Case detail panel */}
      {selectedCaso && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6 overflow-hidden">
          <div className="bg-brand-800 px-6 py-4 flex items-center justify-between">
            <div>
              <span className="text-white font-bold text-lg">{selectedCaso.caso_numero}</span>
              <span className="ml-3">
                <EstadoBadge estado={selectedCaso.estado} />
              </span>
            </div>
            <button
              onClick={() => setSelectedCaso(null)}
              className="text-blue-200 hover:text-white text-sm"
            >
              ← Volver a la lista
            </button>
          </div>

          {/* Case info */}
          <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500">Nombre:</span>{' '}
              <span className="font-medium">{selectedCaso.nombre}</span>
            </div>
            <div>
              <span className="text-slate-500">Tipo:</span>{' '}
              <span className="font-medium">{selectedCaso.tipo_usuario}</span>
            </div>
            <div>
              <span className="text-slate-500">ID del caso:</span>{' '}
              <span className="font-medium">{selectedCaso.numero_id}</span>
            </div>
            <div>
              <span className="text-slate-500">Correo:</span>{' '}
              <span className="font-medium">{selectedCaso.correo}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-500">Descripción:</span>{' '}
              <span className="font-medium">{selectedCaso.descripcion}</span>
            </div>
            <div>
              <span className="text-slate-500">Fecha:</span>{' '}
              <span className="font-medium">{formatDate(selectedCaso.created_at)}</span>
            </div>
          </div>

          {/* Messages */}
          <div className="px-6 py-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Historial de mensajes</h3>
            {loadingMensajes ? (
              <p className="text-slate-400 text-sm text-center py-6">Cargando...</p>
            ) : (
              <MensajeThread mensajes={mensajes} />
            )}
          </div>

          {/* Reply form (only if not closed) */}
          {selectedCaso.estado !== 'resuelto' ? (
            <form onSubmit={enviarMensajeAdmin} className="px-6 pb-6 flex flex-col gap-3">
              <textarea
                value={adminMsg}
                onChange={(e) => setAdminMsg(e.target.value)}
                rows={3}
                required
                placeholder="Escribe la respuesta al estudiante (enviará y cerrará el caso)..."
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
              />
              {sendError && <p className="text-red-600 text-xs">{sendError}</p>}
              <button
                type="submit"
                disabled={sending}
                className="self-end px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {sending ? 'Enviando...' : 'Responder y Cerrar Caso'}
              </button>
            </form>
          ) : (
            <div className="px-6 pb-6">
              <p className="text-sm text-slate-500 italic text-center bg-slate-50 rounded-lg py-3">
                Caso cerrado.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filters + table */}
      {!selectedCaso && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700">Todos los casos</h2>
            <div className="flex gap-2">
              {[
                { value: 'todos', label: 'Todos' },
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'proceso', label: 'En Proceso' },
                { value: 'resuelto', label: 'Resuelto' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFiltroEstado(f.value)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    filtroEstado === f.value
                      ? 'bg-brand-700 text-white border-brand-700'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="text-slate-400 text-sm text-center py-10">Cargando casos...</p>
          ) : casosFiltrados.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">No hay casos con este filtro.</p>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['N° Caso', 'Nombre', 'Correo', 'Tipo', 'Estado', 'Fecha'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {casosFiltrados.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => abrirCaso(c)}
                      className="hover:bg-brand-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-brand-700">{c.caso_numero}</td>
                      <td className="px-4 py-3 text-slate-800">{c.nombre}</td>
                      <td className="px-4 py-3 text-slate-600">{c.correo}</td>
                      <td className="px-4 py-3 text-slate-600">{c.tipo_usuario}</td>
                      <td className="px-4 py-3">
                        <EstadoBadge estado={c.estado} />
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {new Date(c.created_at).toLocaleDateString('es-CO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* FAB — visible una vez autenticado */}
      {authenticated && (
        <button
          onClick={recargar}
          disabled={refreshing}
          title="Actualizar"
          className="fixed bottom-6 right-6 z-50 bg-brand-700 hover:bg-brand-800 disabled:bg-brand-400 text-white p-3.5 rounded-full shadow-lg transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
        </button>
      )}
    </div>
  )
}
