import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { playNotification } from '../lib/sound'
import FileAttachment from '../components/FileAttachment'
import { nombreToEmail } from '../lib/adminAuthCartera'
import PasswordInput from '../components/PasswordInput'
import type { CasoCartera, MensajeCaso } from '../types'
import EstadoBadge from '../components/EstadoBadge'
import MensajeThread from '../components/MensajeThread'
import { IconClose, IconChevronLeft, IconChevronRight, IconUpload, IconShieldCheck } from '../components/icons'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

const ADMINS_CARTERA = ['Magda Sichaca', 'Ricardo Zea', 'Yeimy Rocio Alba', 'Yeimy Prada']

function getUltimoAtendidoPor(nombre: string, casoId: string): string | null {
  return localStorage.getItem(`atendido_ultimo_${nombre}_${casoId}`)
}

function setUltimoAtendidoPor(nombre: string, casoId: string, valor: string) {
  localStorage.setItem(`atendido_ultimo_${nombre}_${casoId}`, valor)
}

interface Stats {
  total: number
  pendiente: number
  proceso: number
  cerrado: number
}

export default function AdminCartera() {
  const navigate = useNavigate()
  const [authenticated, setAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [adminNombre, setAdminNombre] = useState('')

  const [casos, setCasos] = useState<CasoCartera[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats>({ total: 0, pendiente: 0, proceso: 0, cerrado: 0 })

  const [selectedCaso, setSelectedCaso] = useState<CasoCartera | null>(null)
  const [mensajes, setMensajes] = useState<MensajeCaso[]>([])
  const [loadingMensajes, setLoadingMensajes] = useState(false)
  const [adminMsg, setAdminMsg] = useState('')
  const [nuevoEstado, setNuevoEstado] = useState<'proceso' | 'resuelto'>('proceso')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [adminFile, setAdminFile] = useState<File | null>(null)
  const adminFileRef = useRef<HTMLInputElement>(null)
  const adminFormRef = useRef<HTMLFormElement>(null)

  const [shareMounted, setShareMounted] = useState(false)
  const [shareVisible, setShareVisible] = useState(false)
  const [adminDestino, setAdminDestino] = useState('')
  const [stepVisible, setStepVisible] = useState(true)
  const [reasignando, setReasignando] = useState(false)
  const [reasignError, setReasignError] = useState<string | null>(null)

  function openShare() {
    setAdminDestino('')
    setReasignError(null)
    setStepVisible(true)
    setShareMounted(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setShareVisible(true)))
  }

  function elegirAdmin(a: string) {
    setStepVisible(false)
    setTimeout(() => {
      setAdminDestino(a)
      setStepVisible(true)
    }, 180)
  }

  function closeShare() {
    setShareVisible(false)
    setTimeout(() => { setShareMounted(false); setAdminDestino(''); setReasignError(null) }, 300)
  }

  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [filtroUnidad, setFiltroUnidad] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [animDir, setAnimDir] = useState<'right' | 'left'>('right')

  const [assignBanner, setAssignBanner] = useState<string | null>(null)
  const [reasignSuccess, setReasignSuccess] = useState<string | null>(null)
  const [recienAsignados, setRecienAsignados] = useState<Set<string>>(new Set())
  const casosRef = useRef<CasoCartera[]>([])
  const adminNombreRef = useRef('')

  const channelRef = useRef<RealtimeChannel | null>(null)
  const listChannelRef = useRef<RealtimeChannel | null>(null)
  const ITEMS_PER_PAGE = 15

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (listChannelRef.current) supabase.removeChannel(listChannelRef.current)
    }
  }, [])

  useEffect(() => {
    if (!shareMounted) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeShare() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareMounted])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAdminNombre(session.user.user_metadata?.nombre ?? '')
        setAuthenticated(true)
      }
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthenticated(false)
        setAdminNombre('')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const cargarCasos = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('casos_cartera')
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
      checkReasignacionesAtrasadas(all)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    casosRef.current = casos
  }, [casos])

  useEffect(() => {
    adminNombreRef.current = adminNombre
  }, [adminNombre])

  function checkReasignacionesAtrasadas(lista: CasoCartera[]) {
    const nombre = adminNombreRef.current
    if (!nombre) return

    const nuevos: string[] = []
    const idsResaltar: string[] = []
    for (const c of lista) {
      const anterior = getUltimoAtendidoPor(nombre, c.id)
      const actual = c.atendido_por ?? ''
      if (anterior !== null && anterior !== actual && actual === nombre) {
        nuevos.push(c.caso_numero)
        idsResaltar.push(c.id)
      }
      setUltimoAtendidoPor(nombre, c.id, actual)
    }

    if (nuevos.length === 1) {
      setAssignBanner(`el caso ${nuevos[0]}`)
      setTimeout(() => setAssignBanner(null), 6000)
    } else if (nuevos.length > 1) {
      setAssignBanner(`${nuevos.length} casos nuevos`)
      setTimeout(() => setAssignBanner(null), 6000)
    }

    if (idsResaltar.length > 0) {
      setRecienAsignados((prev) => {
        const next = new Set(prev)
        idsResaltar.forEach((id) => next.add(id))
        return next
      })
      setTimeout(() => {
        setRecienAsignados((prev) => {
          const next = new Set(prev)
          idsResaltar.forEach((id) => next.delete(id))
          return next
        })
      }, 8000)
    }
  }

  function suscribirALista() {
    if (listChannelRef.current) supabase.removeChannel(listChannelRef.current)
    const channel = supabase
      .channel('cartera-admin-lista-casos')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'casos_cartera' },
        (payload) => {
          const nuevo = payload.new as CasoCartera
          playNotification()
          setCasos((prev) => [nuevo, ...prev])
          setStats((s) => ({ ...s, total: s.total + 1, pendiente: s.pendiente + 1 }))
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'casos_cartera' },
        (payload) => {
          const actualizado = payload.new as CasoCartera
          const anterior = casosRef.current.find((c) => c.id === actualizado.id)
          setCasos((prev) => prev.map((c) => (c.id === actualizado.id ? actualizado : c)))

          const meLoAsignaron =
            !!adminNombre &&
            actualizado.atendido_por === adminNombre &&
            !!anterior &&
            anterior.atendido_por !== actualizado.atendido_por

          if (adminNombre) {
            setUltimoAtendidoPor(adminNombre, actualizado.id, actualizado.atendido_por ?? '')
          }

          if (meLoAsignaron) {
            playNotification()
            setAssignBanner(`el caso ${actualizado.caso_numero}`)
            setTimeout(() => setAssignBanner(null), 6000)
            setRecienAsignados((prev) => new Set(prev).add(actualizado.id))
            setTimeout(() => {
              setRecienAsignados((prev) => {
                const next = new Set(prev)
                next.delete(actualizado.id)
                return next
              })
            }, 8000)
          }
        },
      )
      .subscribe()
    listChannelRef.current = channel
  }

  useEffect(() => {
    if (authenticated) {
      cargarCasos()
      suscribirALista()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, cargarCasos])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    setAuthError(false)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: nombreToEmail(nombre),
      password: password.trim(),
    })
    setLoginLoading(false)
    if (error || !data.session) {
      setAuthError(true)
    } else {
      setAdminNombre(data.user?.user_metadata?.nombre ?? nombre)
      setAuthenticated(true)
    }
  }

  function cancelarSuscripcion() {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }

  function suscribirACaso(caso: CasoCartera) {
    cancelarSuscripcion()
    const channel = supabase
      .channel(`cartera-admin-caso-${caso.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes_cartera', filter: `caso_id=eq.${caso.id}` },
        (payload) => {
          const nuevo = payload.new as MensajeCaso
          if (nuevo.autor === 'usuario') playNotification()
          setMensajes((prev) => {
            if (prev.find((m) => m.id === nuevo.id)) return prev
            return [...prev, nuevo]
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'casos_cartera', filter: `id=eq.${caso.id}` },
        (payload) => {
          const updated = payload.new as CasoCartera
          setSelectedCaso(updated)
          setCasos((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        },
      )
      .subscribe()
    channelRef.current = channel
  }

  async function abrirCaso(caso: CasoCartera) {
    setSelectedCaso(caso)
    setMensajes([])
    setAdminMsg('')
    setNuevoEstado('proceso')
    setSendError(null)
    setLoadingMensajes(true)

    try {
      if (caso.estado === 'pendiente') {
        const { data: updated, error: updateErr } = await supabase
          .from('casos_cartera')
          .update({ estado: 'proceso', updated_at: new Date().toISOString(), atendido_por: adminNombre || null })
          .eq('id', caso.id)
          .select()
          .single()
        if (updateErr) throw updateErr
        setSelectedCaso(updated)
        setCasos((prev) => prev.map((c) => (c.id === caso.id ? updated : c)))
        setStats((s) => ({ ...s, pendiente: s.pendiente - 1, proceso: s.proceso + 1 }))
      }

      const { data, error: msgErr } = await supabase
        .from('mensajes_cartera')
        .select('*')
        .eq('caso_id', caso.id)
        .order('created_at', { ascending: true })
      if (msgErr) throw msgErr
      setMensajes(data ?? [])
      suscribirACaso(caso)
    } finally {
      setLoadingMensajes(false)
    }
  }

  async function reasignarCaso() {
    if (!selectedCaso || !adminDestino) return
    setReasignando(true)
    setReasignError(null)
    try {
      const { data: updated, error } = await supabase
        .from('casos_cartera')
        .update({ atendido_por: adminDestino })
        .eq('id', selectedCaso.id)
        .select()
        .single()
      if (error) throw error
      setSelectedCaso(updated)
      setCasos((prev) => prev.map((c) => (c.id === selectedCaso.id ? updated : c)))
      setReasignSuccess(`Caso reasignado con éxito a ${adminDestino}`)
      setTimeout(() => setReasignSuccess(null), 4000)
      closeShare()
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? JSON.stringify(err)
      setReasignError(`Error al reasignar el caso: ${msg}`)
    } finally {
      setReasignando(false)
    }
  }

  async function enviarMensajeAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCaso || !adminMsg.trim()) return
    setSendError(null)
    setSending(true)
    try {
      let adjunto_url: string | null = null
      if (adminFile) {
        const ext = adminFile.name.split('.').pop()
        const fileName = `${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, adminFile)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(fileName)
        adjunto_url = urlData.publicUrl
      }

      const { error: msgErr } = await supabase.from('mensajes_cartera').insert({
        caso_id: selectedCaso.id,
        autor: 'admin',
        mensaje: adminMsg.trim(),
        adjunto_url,
      })
      if (msgErr) throw msgErr

      setAdminMsg('')
      setAdminFile(null)
      if (adminFileRef.current) adminFileRef.current.value = ''
      const { data: msgs } = await supabase
        .from('mensajes_cartera')
        .select('*')
        .eq('caso_id', selectedCaso.id)
        .order('created_at', { ascending: true })
      setMensajes(msgs ?? [])

      const { data: updated, error: updateErr } = await supabase
        .from('casos_cartera')
        .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('id', selectedCaso.id)
        .select()
        .single()

      if (!updateErr && updated) {
        setSelectedCaso(updated)
        setCasos((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        setStats((s) => {
          const eraResuelto = selectedCaso.estado === 'resuelto'
          const eraProceso = selectedCaso.estado === 'proceso'
          const eraPendiente = selectedCaso.estado === 'pendiente'
          const ahora = nuevoEstado
          return {
            ...s,
            pendiente: s.pendiente - (eraPendiente ? 1 : 0),
            proceso: s.proceso - (eraProceso ? 1 : 0) + (ahora === 'proceso' ? 1 : 0),
            cerrado: s.cerrado - (eraResuelto ? 1 : 0) + (ahora === 'resuelto' ? 1 : 0),
          }
        })
      } else if (updateErr) {
        setSendError(`Mensaje enviado, pero el estado no se pudo actualizar: ${updateErr.message}`)
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? JSON.stringify(err)
      setSendError(`Error al enviar mensaje: ${msg}`)
    } finally {
      setSending(false)
    }
  }

  // ─── Login ───────────────────────────────────────────────────────────────────
  if (authLoading) {
    return <div className="flex justify-center py-20 text-slate-400 text-sm">Verificando sesión...</div>
  }

  if (!authenticated) {
    return (
      <div className="max-w-sm mx-auto py-20 animate-pop-in">
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_1px_rgba(0,0,0,0.03),0_16px_40px_-16px_rgba(0,0,0,0.18)] p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 shadow-inner shadow-white/20 ring-1 ring-black/5 flex items-center justify-center mb-4">
              <IconShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              Acceso Administrativo
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Área restringida — Cartera
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              autoFocus
              placeholder="Nombre"
              className="w-full border border-black/10 bg-slate-50/60 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/50 focus:border-brand-400 transition-colors"
            />
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {authError && (
              <p className="text-red-600 text-xs">Credenciales incorrectas. Intenta de nuevo.</p>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-brand-700 hover:bg-brand-800 hover:brightness-105 text-white font-semibold py-2.5 rounded-full shadow-sm transition-all duration-200 ease-spring active:scale-[0.97] text-sm disabled:opacity-50"
            >
              {loginLoading ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────────
  const casosFiltrados = casos
    .filter((c) => filtroEstado === 'todos' || c.estado === (filtroEstado as CasoCartera['estado']))
    .filter((c) => filtroUnidad === 'todos' || c.unidad_negocio === filtroUnidad)
    .filter((c) => {
      if (!busqueda.trim()) return true
      const q = busqueda.toLowerCase()
      return (
        c.caso_numero.toLowerCase().includes(q) ||
        c.nombre.toLowerCase().includes(q) ||
        c.correo.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => Number(recienAsignados.has(b.id)) - Number(recienAsignados.has(a.id)))
  const totalPaginas = Math.ceil(casosFiltrados.length / ITEMS_PER_PAGE)
  const casosPaginados = casosFiltrados.slice((pagina - 1) * ITEMS_PER_PAGE, pagina * ITEMS_PER_PAGE)

  return (
    <div>
      {reasignSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white rounded-xl px-5 py-3 text-sm font-medium shadow-lg animate-slide-in-right">
          {reasignSuccess}
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel de Administración — Cartera</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestión de casos — Cartera{adminNombre ? ` · ${adminNombre}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/admin/cartera/consolidados')}
            className="text-sm text-white bg-brand-700 hover:bg-brand-800 hover:brightness-105 px-3.5 py-1.5 rounded-full shadow-sm active:scale-[0.97] transition-all duration-200 ease-spring font-medium"
          >
            Consolidados
          </button>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate('/admin') }}
            className="text-sm text-slate-500 hover:text-slate-700 border border-black/10 px-3.5 py-1.5 rounded-full active:scale-[0.97] transition-all duration-200 ease-spring"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {assignBanner && (
        <div className="mb-6 bg-blue-600 text-white rounded-xl px-5 py-3 text-sm font-medium shadow-sm flex items-center justify-between animate-page-in">
          <span>{adminNombre}, te han asignado <span className="font-bold">{assignBanner}</span></span>
          <button
            onClick={() => setAssignBanner(null)}
            className="text-blue-100 hover:text-white ml-4 leading-none"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: stats.total, color: 'bg-gradient-to-br from-blue-600 to-brand-800 text-white' },
          { label: 'Pendientes', value: stats.pendiente, color: 'bg-gradient-to-br from-amber-400 to-yellow-600 text-white' },
          { label: 'En Proceso', value: stats.proceso, color: 'bg-gradient-to-br from-sky-400 to-blue-600 text-white' },
          { label: 'Cerrados', value: stats.cerrado, color: 'bg-gradient-to-br from-emerald-400 to-green-600 text-white' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl p-5 shadow-sm ${s.color}`}>
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm font-medium opacity-90 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Case detail panel */}
      {selectedCaso && (
        <div className="bg-white border border-black/5 rounded-2xl shadow-sm mb-6 overflow-hidden">
          <div className="bg-brand-800 px-6 py-4 flex items-center justify-between">
            <div>
              <span className="text-white font-bold text-lg">{selectedCaso.caso_numero}</span>
              <span className="ml-3">
                <EstadoBadge estado={selectedCaso.estado} />
              </span>
            </div>
            <button
              onClick={() => { cancelarSuscripcion(); setSelectedCaso(null) }}
              className="text-blue-200 hover:text-white text-sm flex items-center gap-1"
            >
              <IconChevronLeft className="w-3.5 h-3.5" /> Volver a la lista
            </button>
          </div>

          <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500">Nombre:</span>{' '}
              <span className="font-medium">{selectedCaso.nombre}</span>
            </div>
            <div>
              <span className="text-slate-500">Correo:</span>{' '}
              <span className="font-medium">{selectedCaso.correo}</span>
            </div>
            <div>
              <span className="text-slate-500">Tipo de Inscripción:</span>{' '}
              <span className="font-medium">{selectedCaso.tipo_usuario || 'Sin especificar'}</span>
            </div>
            {selectedCaso.numero_id && (
              <div>
                <span className="text-slate-500">N° de Inscripción:</span>{' '}
                <span className="font-medium">{selectedCaso.numero_id}</span>
              </div>
            )}
            {selectedCaso.nombre_inscripcion && (
              <div className="sm:col-span-2">
                <span className="text-slate-500">Nombre de la Inscripción:</span>{' '}
                <span className="font-medium">{selectedCaso.nombre_inscripcion}</span>
              </div>
            )}
            <div>
              <span className="text-slate-500">Tipo de Soporte:</span>{' '}
              <span className="font-medium">{selectedCaso.tipo_soporte}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-500">Descripción:</span>{' '}
              <span className="font-medium">{selectedCaso.descripcion}</span>
            </div>
            <div>
              <span className="text-slate-500">Fecha:</span>{' '}
              <span className="font-medium">{formatDate(selectedCaso.created_at)}</span>
            </div>
            {selectedCaso.atendido_por && (
              <div>
                <span className="text-slate-500">Atendido por:</span>{' '}
                <span className="font-medium">{selectedCaso.atendido_por}</span>
              </div>
            )}
            {selectedCaso.adjunto_url && (
              <div className="sm:col-span-2">
                <span className="text-slate-500 block mb-2">Adjunto:</span>
                <FileAttachment url={selectedCaso.adjunto_url} imageClassName="max-h-64 rounded-lg border border-black/5 object-contain hover:opacity-90 transition-opacity" />
              </div>
            )}
          </div>

          {shareMounted && (
            <div
              className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ease-spring ${shareVisible ? 'bg-black/50' : 'bg-black/0'}`}
              onClick={closeShare}
            >
              <div
                className={`bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transition-all duration-300 ease-spring ${shareVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={`transition-all duration-150 ease-spring ${stepVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
                  {!adminDestino ? (
                    <>
                      <h3 className="text-base font-semibold text-slate-800 mb-4">
                        Selecciona un administrador
                      </h3>
                      <div className="flex flex-col gap-2">
                        {ADMINS_CARTERA.map((a) => (
                          <button
                            key={a}
                            onClick={() => elegirAdmin(a)}
                            className="w-full text-left px-4 py-2.5 rounded-lg border border-black/5 hover:bg-slate-50 hover:border-brand-300 text-sm font-medium text-slate-700 transition-colors duration-150"
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={closeShare}
                        className="w-full mt-4 text-slate-500 hover:text-slate-700 text-sm transition-colors"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-slate-700 mb-6">
                        ¿Está seguro que le quiere reasignar este caso a{' '}
                        <span className="font-semibold">{adminDestino}</span>?
                      </p>
                      {reasignError && <p className="text-red-600 text-xs mb-4">{reasignError}</p>}
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={reasignarCaso}
                          disabled={reasignando}
                          className="bg-green-600 hover:bg-green-700 hover:brightness-105 disabled:bg-green-300 text-white text-sm font-semibold px-5 py-2 rounded-full shadow-sm active:scale-[0.97] transition-all duration-200 ease-spring"
                        >
                          {reasignando ? 'Reasignando...' : 'Reasignar'}
                        </button>
                        <button
                          onClick={closeShare}
                          className="bg-red-600 hover:bg-red-700 hover:brightness-105 text-white text-sm font-semibold px-5 py-2 rounded-full shadow-sm active:scale-[0.97] transition-all duration-200 ease-spring"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="px-6 py-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Historial de mensajes</h3>
            {loadingMensajes ? (
              <p className="text-slate-400 text-sm text-center py-6">Cargando...</p>
            ) : (
              <MensajeThread
                mensajes={mensajes}
                perspectiva="admin"
                labelSoporte="Soporte Cartera"
                resolvedAt={selectedCaso.estado === 'resuelto' ? selectedCaso.updated_at : undefined}
              />
            )}
          </div>

          {selectedCaso.estado !== 'resuelto' && (
            <form ref={adminFormRef} onSubmit={enviarMensajeAdmin} className="px-6 pb-6 flex flex-col gap-4">
              <textarea
                value={adminMsg}
                onChange={(e) => setAdminMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    adminFormRef.current?.requestSubmit()
                  }
                }}
                rows={3}
                required
                placeholder="Escribe la respuesta... (Ctrl+Enter para enviar)"
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
              />

              <div>
                <label
                  htmlFor="adjunto-reply-admin-cartera"
                  className="flex items-center gap-2 w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-600 hover:border-brand-400 hover:bg-brand-50/50 transition-colors cursor-pointer"
                >
                  <IconUpload className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{adminFile ? adminFile.name : 'Adjuntar imagen...'}</span>
                </label>
                <input
                  id="adjunto-reply-admin-cartera"
                  ref={adminFileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAdminFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                {adminFile && (
                  <div className="relative inline-block mt-3">
                    <img
                      src={URL.createObjectURL(adminFile)}
                      alt="Vista previa"
                      className="max-h-48 rounded-lg border border-black/5 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => { setAdminFile(null); if (adminFileRef.current) adminFileRef.current.value = '' }}
                      className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow transition-colors"
                      title="Quitar imagen"
                    >
                      <IconClose className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Actualizar estado:
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="nuevoEstado"
                    value="proceso"
                    checked={nuevoEstado === 'proceso'}
                    onChange={() => setNuevoEstado('proceso')}
                    className="accent-blue-600"
                  />
                  <span className="text-sm font-medium text-blue-700">En Proceso</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="nuevoEstado"
                    value="resuelto"
                    checked={nuevoEstado === 'resuelto'}
                    onChange={() => setNuevoEstado('resuelto')}
                    className="accent-green-600"
                  />
                  <span className="text-sm font-medium text-green-700">Resuelto</span>
                </label>
              </div>

              {sendError && <p className="text-red-600 text-xs">{sendError}</p>}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={openShare}
                  className="bg-blue-600 hover:bg-blue-700 hover:brightness-105 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-sm active:scale-[0.97] transition-all duration-200 ease-spring"
                >
                  Reasignar Caso
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className={`px-5 py-2 text-white text-sm font-semibold rounded-full shadow-sm active:scale-[0.97] transition-all duration-200 ease-spring disabled:opacity-50 ${
                    nuevoEstado === 'resuelto'
                      ? 'bg-green-600 hover:bg-green-700 hover:brightness-105'
                      : 'bg-blue-600 hover:bg-blue-700 hover:brightness-105'
                  }`}
                >
                  {sending
                    ? 'Enviando...'
                    : nuevoEstado === 'resuelto'
                    ? 'Responder y Resolver Caso'
                    : 'Responder'}
                </button>
              </div>
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
              <button
                onClick={() => { setBusqueda(''); setPagina(1) }}
                className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-black/10 rounded-full active:scale-[0.97] transition-all duration-200 ease-spring"
              >
                <IconClose className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700">
              {casosFiltrados.length} caso{casosFiltrados.length !== 1 ? 's' : ''}
            </h2>
            <div className="flex gap-2">
              {[
                { value: 'todos', label: 'Todas' },
                { value: 'Diplomados', label: 'Diplomados' },
                { value: 'Especializaciones', label: 'Especializaciones' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => { setFiltroUnidad(f.value); setAnimDir('right'); setPagina(1) }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border active:scale-95 transition-all ${
                    filtroUnidad === f.value
                      ? 'bg-brand-700 text-white border-brand-700'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end mb-4">
            <div className="flex gap-2">
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
            <div className="bg-white border border-black/5 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-black/5">
                  <tr>
                    {['N° Caso', 'Nombre', 'Correo', 'Unidad', 'Tipo de Soporte', 'Atendido por', 'Estado', 'Fecha'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody
                  key={pagina}
                  className={`divide-y divide-slate-100 ${animDir === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
                >
                  {casosPaginados.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => abrirCaso(c)}
                      className={`cursor-pointer transition-colors duration-500 ${
                        recienAsignados.has(c.id) ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-brand-50'
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-brand-700">{c.caso_numero}</td>
                      <td className="px-4 py-3 text-slate-800">{c.nombre}</td>
                      <td className="px-4 py-3 text-slate-600">{c.correo}</td>
                      <td className="px-4 py-3 text-slate-600">{c.unidad_negocio}</td>
                      <td className="px-4 py-3 text-slate-600">{c.tipo_soporte}</td>
                      <td className="px-4 py-3 text-slate-600">{c.atendido_por ?? '—'}</td>
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
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    Página {pagina} de {totalPaginas}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setAnimDir('left'); setPagina((p) => Math.max(1, p - 1)) }}
                      disabled={pagina === 1}
                      className="px-3 py-1.5 text-xs font-semibold border border-black/10 rounded-full disabled:opacity-40 hover:bg-slate-50 active:scale-[0.97] transition-all duration-200 ease-spring flex items-center gap-1"
                    >
                      <IconChevronLeft className="w-3.5 h-3.5" /> Anterior
                    </button>
                    <button
                      onClick={() => { setAnimDir('right'); setPagina((p) => Math.min(totalPaginas, p + 1)) }}
                      disabled={pagina === totalPaginas}
                      className="px-3 py-1.5 text-xs font-semibold border border-black/10 rounded-full disabled:opacity-40 hover:bg-slate-50 active:scale-[0.97] transition-all duration-200 ease-spring flex items-center gap-1"
                    >
                      Siguiente <IconChevronRight className="w-3.5 h-3.5" />
                    </button>
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
