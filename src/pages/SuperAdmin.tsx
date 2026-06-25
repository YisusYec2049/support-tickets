import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { playNotification } from '../lib/sound'
import FileAttachment from '../components/FileAttachment'
import { isSuperAdminAuthenticated, setSuperAdminAuthenticated, clearSuperAdminAuth } from '../lib/superAdminAuth'
import type { CasoUnificado, MensajeCaso } from '../types'
import EstadoBadge from '../components/EstadoBadge'
import MensajeThread from '../components/MensajeThread'
import PasswordInput from '../components/PasswordInput'

const ADMIN_PASSWORD = import.meta.env.VITE_SUPERADMIN_PASSWORD as string

const SIN_ID = ['Conciliaciones Bancarias', 'Reportes', 'Link de Pago']

const ID_LABEL: Record<string, string> = {
  'Inscripciones': 'N° Inscripción',
  'Comprobantes de Ingreso': 'ID del Comprobante de Ingreso',
  'Acuerdo de pago': 'ID del Acuerdo de pago',
  'Ordenes de Trabajo': 'ID de la Orden de Trabajo',
  'Comprobante de Egreso': 'ID del Comprobante de Egreso',
  'Otros': 'ID',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

function ModuloBadge({ modulo }: { modulo: 'financiera' | 'cartera' }) {
  return modulo === 'financiera' ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-800 border border-brand-200 whitespace-nowrap">
      Financiera
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 whitespace-nowrap">
      Cartera
    </span>
  )
}

interface Stats { total: number; pendiente: number; proceso: number; cerrado: number }

function tablasCaso(modulo: 'financiera' | 'cartera') {
  return {
    casos: modulo === 'financiera' ? 'casos_soporte' : 'casos_cartera',
    mensajes: modulo === 'financiera' ? 'mensajes_casos' : 'mensajes_cartera',
  }
}

export default function SuperAdmin() {
  const navigate = useNavigate()
  const [authenticated, setAuthenticated] = useState(isSuperAdminAuthenticated)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState(false)

  const [casos, setCasos] = useState<CasoUnificado[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats>({ total: 0, pendiente: 0, proceso: 0, cerrado: 0 })

  const [selectedCaso, setSelectedCaso] = useState<CasoUnificado | null>(null)
  const [mensajes, setMensajes] = useState<MensajeCaso[]>([])
  const [loadingMensajes, setLoadingMensajes] = useState(false)
  const [adminMsg, setAdminMsg] = useState('')
  const [nuevoEstado, setNuevoEstado] = useState<'proceso' | 'resuelto'>('proceso')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [adminFile, setAdminFile] = useState<File | null>(null)
  const adminFileRef = useRef<HTMLInputElement>(null)
  const adminFormRef = useRef<HTMLFormElement>(null)

  const [filtroModulo, setFiltroModulo] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [animDir, setAnimDir] = useState<'right' | 'left'>('right')

  const channelRef = useRef<RealtimeChannel | null>(null)
  const listFinancieraRef = useRef<RealtimeChannel | null>(null)
  const listCarteraRef = useRef<RealtimeChannel | null>(null)
  const ITEMS_PER_PAGE = 15

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (listFinancieraRef.current) supabase.removeChannel(listFinancieraRef.current)
      if (listCarteraRef.current) supabase.removeChannel(listCarteraRef.current)
    }
  }, [])

  const cargarCasos = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: fin }, { data: car }] = await Promise.all([
        supabase.from('casos_soporte').select('*').order('created_at', { ascending: false }),
        supabase.from('casos_cartera').select('*').order('created_at', { ascending: false }),
      ])
      const todos: CasoUnificado[] = [
        ...(fin ?? []).map((c) => ({ ...c, modulo: 'financiera' as const })),
        ...(car ?? []).map((c) => ({ ...c, modulo: 'cartera' as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setCasos(todos)
      setStats({
        total: todos.length,
        pendiente: todos.filter((c) => c.estado === 'pendiente').length,
        proceso: todos.filter((c) => c.estado === 'proceso').length,
        cerrado: todos.filter((c) => c.estado === 'resuelto').length,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  function suscribirALista() {
    if (listFinancieraRef.current) supabase.removeChannel(listFinancieraRef.current)
    if (listCarteraRef.current) supabase.removeChannel(listCarteraRef.current)

    listFinancieraRef.current = supabase
      .channel('super-lista-financiera')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'casos_soporte' }, (payload) => {
        const nuevo = { ...(payload.new as CasoUnificado), modulo: 'financiera' as const }
        playNotification()
        setCasos((prev) => [nuevo, ...prev])
        setStats((s) => ({ ...s, total: s.total + 1, pendiente: s.pendiente + 1 }))
      })
      .subscribe()

    listCarteraRef.current = supabase
      .channel('super-lista-cartera')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'casos_cartera' }, (payload) => {
        const nuevo = { ...(payload.new as CasoUnificado), modulo: 'cartera' as const }
        playNotification()
        setCasos((prev) => [nuevo, ...prev])
        setStats((s) => ({ ...s, total: s.total + 1, pendiente: s.pendiente + 1 }))
      })
      .subscribe()
  }

  useEffect(() => {
    if (authenticated) {
      cargarCasos()
      suscribirALista()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, cargarCasos])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (password.trim() === ADMIN_PASSWORD.trim()) {
      setSuperAdminAuthenticated()
      setAuthenticated(true)
      setAuthError(false)
    } else {
      setAuthError(true)
    }
  }

  function cancelarSuscripcion() {
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
  }

  function suscribirACaso(caso: CasoUnificado) {
    cancelarSuscripcion()
    const { casos: ct, mensajes: mt } = tablasCaso(caso.modulo)
    channelRef.current = supabase
      .channel(`super-caso-${caso.modulo}-${caso.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: mt, filter: `caso_id=eq.${caso.id}` }, (payload) => {
        const nuevo = payload.new as MensajeCaso
        if (nuevo.autor === 'usuario') playNotification()
        setMensajes((prev) => prev.find((m) => m.id === nuevo.id) ? prev : [...prev, nuevo])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: ct, filter: `id=eq.${caso.id}` }, (payload) => {
        const upd = { ...(payload.new as CasoUnificado), modulo: caso.modulo }
        setSelectedCaso(upd)
        setCasos((prev) => prev.map((c) => c.id === upd.id && c.modulo === upd.modulo ? upd : c))
      })
      .subscribe()
  }

  async function abrirCaso(caso: CasoUnificado) {
    setSelectedCaso(caso)
    setMensajes([])
    setAdminMsg('')
    setNuevoEstado('proceso')
    setSendError(null)
    setLoadingMensajes(true)
    const { casos: ct, mensajes: mt } = tablasCaso(caso.modulo)

    try {
      if (caso.estado === 'pendiente') {
        const { data: upd, error: err } = await supabase.from(ct).update({ estado: 'proceso', updated_at: new Date().toISOString() }).eq('id', caso.id).select().single()
        if (err) throw err
        const updU = { ...upd, modulo: caso.modulo }
        setSelectedCaso(updU)
        setCasos((prev) => prev.map((c) => c.id === caso.id && c.modulo === caso.modulo ? updU : c))
        setStats((s) => ({ ...s, pendiente: s.pendiente - 1, proceso: s.proceso + 1 }))
      }
      const { data, error: msgErr } = await supabase.from(mt).select('*').eq('caso_id', caso.id).order('created_at', { ascending: true })
      if (msgErr) throw msgErr
      setMensajes(data ?? [])
      suscribirACaso(caso)
    } finally {
      setLoadingMensajes(false)
    }
  }

  async function enviarMensajeAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCaso || !adminMsg.trim()) return
    setSendError(null)
    setSending(true)
    const { casos: ct, mensajes: mt } = tablasCaso(selectedCaso.modulo)

    try {
      let adjunto_url: string | null = null
      if (adminFile) {
        const ext = adminFile.name.split('.').pop()
        const fileName = `${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('attachments').upload(fileName, adminFile)
        if (upErr) throw upErr
        adjunto_url = supabase.storage.from('attachments').getPublicUrl(fileName).data.publicUrl
      }

      const { error: msgErr } = await supabase.from(mt).insert({ caso_id: selectedCaso.id, autor: 'admin', mensaje: adminMsg.trim(), adjunto_url })
      if (msgErr) throw msgErr

      setAdminMsg('')
      setAdminFile(null)
      if (adminFileRef.current) adminFileRef.current.value = ''

      const { data: msgs } = await supabase.from(mt).select('*').eq('caso_id', selectedCaso.id).order('created_at', { ascending: true })
      setMensajes(msgs ?? [])

      const { data: upd, error: updErr } = await supabase.from(ct).update({ estado: nuevoEstado, updated_at: new Date().toISOString() }).eq('id', selectedCaso.id).select().single()
      if (!updErr && upd) {
        const updU = { ...upd, modulo: selectedCaso.modulo }
        setSelectedCaso(updU)
        setCasos((prev) => prev.map((c) => c.id === upd.id && c.modulo === selectedCaso.modulo ? updU : c))
        setStats((s) => {
          const era = selectedCaso.estado
          const ahora = nuevoEstado
          return {
            ...s,
            pendiente: s.pendiente - (era === 'pendiente' ? 1 : 0),
            proceso: s.proceso - (era === 'proceso' ? 1 : 0) + (ahora === 'proceso' ? 1 : 0),
            cerrado: s.cerrado - (era === 'resuelto' ? 1 : 0) + (ahora === 'resuelto' ? 1 : 0),
          }
        })
      } else if (updErr) {
        setSendError(`Mensaje enviado, pero el estado no se pudo actualizar: ${updErr.message}`)
      }
    } catch (err: unknown) {
      setSendError(`Error: ${(err as { message?: string })?.message ?? JSON.stringify(err)}`)
    } finally {
      setSending(false)
    }
  }

  // ─── Login ────────────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="max-w-sm mx-auto py-20">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <h2 className="text-xl font-bold text-brand-800 mb-1 text-center">Super Administrador</h2>
          <p className="text-slate-500 text-sm text-center mb-6">Acceso global — todos los módulos</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
            {authError && <p className="text-red-600 text-xs">Contraseña incorrecta. Intenta de nuevo.</p>}
            <button type="submit" className="w-full bg-brand-700 hover:bg-brand-800 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
              Ingresar
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────
  const casosFiltrados = casos
    .filter((c) => filtroModulo === 'todos' || c.modulo === filtroModulo)
    .filter((c) => filtroEstado === 'todos' || c.estado === (filtroEstado as CasoUnificado['estado']))
    .filter((c) => {
      if (!busqueda.trim()) return true
      const q = busqueda.toLowerCase()
      return c.caso_numero.toLowerCase().includes(q) || c.nombre.toLowerCase().includes(q) || c.correo.toLowerCase().includes(q)
    })
  const totalPaginas = Math.ceil(casosFiltrados.length / ITEMS_PER_PAGE)
  const casosPaginados = casosFiltrados.slice((pagina - 1) * ITEMS_PER_PAGE, pagina * ITEMS_PER_PAGE)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Super Administrador</h1>
          <p className="text-slate-500 text-sm mt-1">Vista global — Financiera y Cartera</p>
        </div>
        <button
          onClick={() => { clearSuperAdminAuth(); navigate('/admin') }}
          className="text-sm text-slate-500 hover:text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors"
        >
          Cerrar sesión
        </button>
      </div>

      {/* Stats */}
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

      {/* Case detail */}
      {selectedCaso && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6 overflow-hidden">
          <div className="bg-brand-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-white font-bold text-lg">{selectedCaso.caso_numero}</span>
              <EstadoBadge estado={selectedCaso.estado} />
              <ModuloBadge modulo={selectedCaso.modulo} />
            </div>
            <button onClick={() => { cancelarSuscripcion(); setSelectedCaso(null) }} className="text-blue-200 hover:text-white text-sm">
              ← Volver a la lista
            </button>
          </div>

          <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-500">Nombre:</span> <span className="font-medium">{selectedCaso.nombre}</span></div>
            <div><span className="text-slate-500">Tipo de Soporte:</span> <span className="font-medium">{selectedCaso.tipo_soporte}</span></div>
            {selectedCaso.tipo_soporte === 'Inscripciones' && selectedCaso.tipo_usuario && (
              <div><span className="text-slate-500">Tipo de Inscripción:</span> <span className="font-medium">{selectedCaso.tipo_usuario}</span></div>
            )}
            {selectedCaso.numero_id && !SIN_ID.includes(selectedCaso.tipo_soporte) && (
              <div><span className="text-slate-500">{ID_LABEL[selectedCaso.tipo_soporte] ?? 'ID'}:</span> <span className="font-medium">{selectedCaso.numero_id}</span></div>
            )}
            <div><span className="text-slate-500">Correo:</span> <span className="font-medium">{selectedCaso.correo}</span></div>
            <div className="sm:col-span-2"><span className="text-slate-500">Descripción:</span> <span className="font-medium">{selectedCaso.descripcion}</span></div>
            <div><span className="text-slate-500">Fecha:</span> <span className="font-medium">{formatDate(selectedCaso.created_at)}</span></div>
            {selectedCaso.adjunto_url && (
              <div className="sm:col-span-2">
                <span className="text-slate-500 block mb-2">Adjunto:</span>
                <FileAttachment url={selectedCaso.adjunto_url} imageClassName="max-h-64 rounded-lg border border-slate-200 object-contain hover:opacity-90 transition-opacity" />
              </div>
            )}
          </div>

          <div className="px-6 py-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Historial de mensajes</h3>
            {loadingMensajes ? (
              <p className="text-slate-400 text-sm text-center py-6">Cargando...</p>
            ) : (
              <MensajeThread
                mensajes={mensajes}
                perspectiva="admin"
                labelSoporte={selectedCaso.modulo === 'financiera' ? 'Soporte Financiero' : 'Soporte Cartera'}
                resolvedAt={selectedCaso.estado === 'resuelto' ? selectedCaso.updated_at : undefined}
              />
            )}
          </div>

          {selectedCaso.estado !== 'resuelto' && (
            <form ref={adminFormRef} onSubmit={enviarMensajeAdmin} className="px-6 pb-6 flex flex-col gap-4">
              <textarea
                value={adminMsg}
                onChange={(e) => setAdminMsg(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); adminFormRef.current?.requestSubmit() } }}
                rows={3}
                required
                placeholder="Escribe la respuesta... (Ctrl+Enter para enviar)"
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
              />
              <div>
                <input
                  ref={adminFileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAdminFile(e.target.files?.[0] ?? null)}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                />
                {adminFile && (
                  <div className="relative inline-block mt-3">
                    <img src={URL.createObjectURL(adminFile)} alt="Vista previa" className="max-h-48 rounded-lg border border-slate-200 object-contain" />
                    <button type="button" onClick={() => { setAdminFile(null); if (adminFileRef.current) adminFileRef.current.value = '' }} className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow transition-colors">✕</button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-6">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Actualizar estado:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="nuevoEstado" value="proceso" checked={nuevoEstado === 'proceso'} onChange={() => setNuevoEstado('proceso')} className="accent-blue-600" />
                  <span className="text-sm font-medium text-blue-700">En Proceso</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="nuevoEstado" value="resuelto" checked={nuevoEstado === 'resuelto'} onChange={() => setNuevoEstado('resuelto')} className="accent-green-600" />
                  <span className="text-sm font-medium text-green-700">Resuelto</span>
                </label>
              </div>
              {sendError && <p className="text-red-600 text-xs">{sendError}</p>}
              <button
                type="submit"
                disabled={sending}
                className={`self-end px-5 py-2 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${nuevoEstado === 'resuelto' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {sending ? 'Enviando...' : nuevoEstado === 'resuelto' ? 'Responder y Resolver Caso' : 'Responder'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Filters + table */}
      {!selectedCaso && (
        <>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPagina(1) }}
              placeholder="Buscar por nombre, correo o N° caso..."
              className="flex-1 border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            {busqueda && (
              <button onClick={() => { setBusqueda(''); setPagina(1) }} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-300 rounded-lg transition-colors">✕</button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold text-slate-700">{casosFiltrados.length} caso{casosFiltrados.length !== 1 ? 's' : ''}</h2>
            <div className="flex flex-wrap gap-2">
              {/* Filtro módulo */}
              {[
                { value: 'todos', label: 'Todos los módulos' },
                { value: 'financiera', label: 'Financiera' },
                { value: 'cartera', label: 'Cartera' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => { setFiltroModulo(f.value); setAnimDir('right'); setPagina(1) }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border active:scale-95 transition-all ${
                    filtroModulo === f.value ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <span className="text-slate-300">|</span>
              {/* Filtro estado */}
              {[
                { value: 'todos', label: 'Todos' },
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'proceso', label: 'En Proceso' },
                { value: 'resuelto', label: 'Resuelto' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => { setFiltroEstado(f.value); setAnimDir('right'); setPagina(1) }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border active:scale-95 transition-all ${
                    filtroEstado === f.value ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400'
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
                    {['N° Caso', 'Módulo', 'Nombre', 'Correo', 'Tipo de Soporte', 'Estado', 'Fecha'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody
                  key={`${pagina}-${filtroModulo}-${filtroEstado}`}
                  className={`divide-y divide-slate-100 ${animDir === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
                >
                  {casosPaginados.map((c) => (
                    <tr key={`${c.modulo}-${c.id}`} onClick={() => abrirCaso(c)} className="hover:bg-brand-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-semibold text-brand-700 whitespace-nowrap">{c.caso_numero}</td>
                      <td className="px-4 py-3"><ModuloBadge modulo={c.modulo} /></td>
                      <td className="px-4 py-3 text-slate-800">{c.nombre}</td>
                      <td className="px-4 py-3 text-slate-600">{c.correo}</td>
                      <td className="px-4 py-3 text-slate-600">{c.tipo_soporte}</td>
                      <td className="px-4 py-3"><EstadoBadge estado={c.estado} /></td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(c.created_at).toLocaleDateString('es-CO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Página {pagina} de {totalPaginas}</span>
                  <div className="flex gap-2">
                    <button onClick={() => { setAnimDir('left'); setPagina((p) => Math.max(1, p - 1)) }} disabled={pagina === 1} className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 active:scale-95 transition-all">← Anterior</button>
                    <button onClick={() => { setAnimDir('right'); setPagina((p) => Math.min(totalPaginas, p + 1)) }} disabled={pagina === totalPaginas} className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 active:scale-95 transition-all">Siguiente →</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>
  )
}
