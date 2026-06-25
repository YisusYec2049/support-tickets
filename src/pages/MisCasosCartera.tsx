import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { playNotification } from '../lib/sound'
import FileAttachment from '../components/FileAttachment'
import { getUserEmail, clearUserEmail } from '../lib/userSession'
import type { CasoCartera, MensajeCaso } from '../types'
import EstadoBadge from '../components/EstadoBadge'
import MensajeThread from '../components/MensajeThread'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium' })
}

function getLastSeen(casoId: string): string | null {
  return localStorage.getItem(`seen_${casoId}`)
}

function markAsSeen(casoId: string) {
  localStorage.setItem(`seen_${casoId}`, new Date().toISOString())
}

export default function MisCasosCartera() {
  const navigate = useNavigate()
  const correo = getUserEmail() ?? ''

  const [loading, setLoading] = useState(false)
  const [casos, setCasos] = useState<CasoCartera[]>([])
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState<Record<string, number>>({})

  const [selectedCaso, setSelectedCaso] = useState<CasoCartera | null>(null)
  const [mensajes, setMensajes] = useState<MensajeCaso[]>([])
  const [loadingMensajes, setLoadingMensajes] = useState(false)
  const [reply, setReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)
  const [replyFile, setReplyFile] = useState<File | null>(null)
  const replyFileRef = useRef<HTMLInputElement>(null)
  const replyFormRef = useRef<HTMLFormElement>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!correo) {
      navigate('/', { replace: true })
      return
    }
    buscarCasos(correo)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  async function cargarNoLeidos(casoIds: string[]) {
    if (casoIds.length === 0) return
    const { data } = await supabase
      .from('mensajes_cartera')
      .select('caso_id, created_at')
      .in('caso_id', casoIds)
      .eq('autor', 'admin')

    const counts: Record<string, number> = {}
    for (const msg of data ?? []) {
      const lastSeen = getLastSeen(msg.caso_id)
      if (!lastSeen || msg.created_at > lastSeen) {
        counts[msg.caso_id] = (counts[msg.caso_id] ?? 0) + 1
      }
    }
    setUnreadCount(counts)
  }

  async function buscarCasos(email: string) {
    setError(null)
    setLoading(true)
    setSearched(false)
    cancelarSuscripcion()
    setSelectedCaso(null)
    try {
      const { data, error: err } = await supabase
        .from('casos_cartera')
        .select('*')
        .eq('correo', email)
        .order('created_at', { ascending: false })
      if (err) throw err
      const lista = data ?? []
      setCasos(lista)
      setSearched(true)
      await cargarNoLeidos(lista.map((c) => c.id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al buscar casos.')
    } finally {
      setLoading(false)
    }
  }

  function cerrarSesion() {
    cancelarSuscripcion()
    clearUserEmail()
    navigate('/')
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
      .channel(`cartera-caso-${caso.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'casos_cartera', filter: `id=eq.${caso.id}` },
        (payload) => {
          const updated = payload.new as CasoCartera
          setSelectedCaso(updated)
          setCasos((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes_cartera', filter: `caso_id=eq.${caso.id}` },
        (payload) => {
          const nuevo = payload.new as MensajeCaso
          if (nuevo.autor === 'admin') playNotification()
          setMensajes((prev) => [...prev, nuevo])
        },
      )
      .subscribe()
    channelRef.current = channel
  }

  async function abrirCaso(caso: CasoCartera) {
    markAsSeen(caso.id)
    setUnreadCount((prev) => ({ ...prev, [caso.id]: 0 }))
    setSelectedCaso(caso)
    setMensajes([])
    setReply('')
    setReplyError(null)
    setLoadingMensajes(true)
    try {
      const { data, error: err } = await supabase
        .from('mensajes_cartera')
        .select('*')
        .eq('caso_id', caso.id)
        .order('created_at', { ascending: true })
      if (err) throw err
      setMensajes(data ?? [])
      suscribirACaso(caso)
    } finally {
      setLoadingMensajes(false)
    }
  }

  function volverALista() {
    cancelarSuscripcion()
    setSelectedCaso(null)
  }

  async function enviarRespuesta(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCaso || !reply.trim()) return
    setReplyError(null)
    setSendingReply(true)
    try {
      let adjunto_url: string | null = null
      if (replyFile) {
        const ext = replyFile.name.split('.').pop()
        const fileName = `${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, replyFile)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(fileName)
        adjunto_url = urlData.publicUrl
      }

      const { error: err } = await supabase.from('mensajes_cartera').insert({
        caso_id: selectedCaso.id,
        autor: 'usuario',
        mensaje: reply.trim(),
        adjunto_url,
      })
      if (err) throw err
      setReply('')
      setReplyFile(null)
      if (replyFileRef.current) replyFileRef.current.value = ''
    } catch (err: unknown) {
      setReplyError(err instanceof Error ? err.message : 'Error al enviar mensaje.')
    } finally {
      setSendingReply(false)
    }
  }

  const casosOrdenados = [...casos].sort((a, b) => {
    const ua = unreadCount[a.id] ?? 0
    const ub = unreadCount[b.id] ?? 0
    if (ua > 0 && ub === 0) return -1
    if (ua === 0 && ub > 0) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Mis Casos — Cartera</h1>
          <p className="text-slate-500 mt-1 text-sm">{correo}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/cartera/nuevo-caso')}
            className="text-sm text-white bg-brand-700 hover:bg-brand-800 px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            Crear Nuevo Caso
          </button>
          <button
            onClick={cerrarSesion}
            className="text-sm text-slate-500 hover:text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Cambiar correo
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Case detail */}
      {selectedCaso && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6 overflow-hidden">
          <div className="bg-brand-800 px-6 py-4 flex items-center justify-between">
            <div>
              <span className="text-white font-bold text-lg">{selectedCaso.caso_numero}</span>
              <span className="ml-3">
                <EstadoBadge estado={selectedCaso.estado} />
              </span>
            </div>
            <button onClick={volverALista} className="text-blue-200 hover:text-white text-sm">
              ← Volver
            </button>
          </div>

          <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
            {selectedCaso.adjunto_url && (
              <div className="sm:col-span-2">
                <span className="text-slate-500 block mb-2">Adjunto:</span>
                <FileAttachment url={selectedCaso.adjunto_url} />
              </div>
            )}
          </div>

          <div className="px-6 py-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Historial de mensajes</h3>
            {loadingMensajes ? (
              <p className="text-slate-400 text-sm text-center py-6">Cargando mensajes...</p>
            ) : (
              <MensajeThread
                mensajes={mensajes}
                labelSoporte="Soporte Cartera"
                resolvedAt={selectedCaso.estado === 'resuelto' ? selectedCaso.updated_at : undefined}
              />
            )}
          </div>

          {selectedCaso.estado !== 'resuelto' && (
            <form ref={replyFormRef} onSubmit={enviarRespuesta} className="px-6 pb-6 flex flex-col gap-3">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    replyFormRef.current?.requestSubmit()
                  }
                }}
                rows={3}
                placeholder="Escribe tu mensaje... (Ctrl+Enter para enviar)"
                required
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
              />
              <div>
                <input
                  ref={replyFileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReplyFile(e.target.files?.[0] ?? null)}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                />
                {replyFile && (
                  <div className="relative inline-block mt-3">
                    <img
                      src={URL.createObjectURL(replyFile)}
                      alt="Vista previa"
                      className="max-h-48 rounded-lg border border-slate-200 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => { setReplyFile(null); if (replyFileRef.current) replyFileRef.current.value = '' }}
                      className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow transition-colors"
                      title="Quitar imagen"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              {replyError && <p className="text-red-600 text-xs">{replyError}</p>}
              <button
                type="submit"
                disabled={sendingReply}
                className="self-end px-5 py-2 bg-brand-700 hover:bg-brand-800 disabled:bg-brand-300 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {sendingReply ? 'Enviando...' : 'Enviar mensaje'}
              </button>
            </form>
          )}

          {selectedCaso.estado === 'resuelto' && (
            <div className="px-6 pb-6">
              <p className="text-sm text-slate-500 text-center">
                Si necesitas más ayuda, crea un nuevo caso.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Cases list */}
      {!selectedCaso && (
        <>
          {loading ? (
            <p className="text-slate-400 text-sm text-center py-16">Cargando casos...</p>
          ) : searched && casos.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-4xl mb-3">📭</p>
              <p className="font-medium text-slate-600">No tienes casos registrados aún.</p>
              <p className="text-sm mt-1">Usa el botón "Crear Nuevo Caso" para radicar tu primera solicitud.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {searched && (
                <p className="text-sm text-slate-500 mb-4">
                  {casos.length} caso{casos.length !== 1 ? 's' : ''} encontrado{casos.length !== 1 ? 's' : ''}
                </p>
              )}
              {casosOrdenados.map((c) => {
                const unread = unreadCount[c.id] ?? 0
                return (
                  <button
                    key={c.id}
                    onClick={() => abrirCaso(c)}
                    className={`relative w-full text-left rounded-xl border transition-all group overflow-hidden ${
                      unread > 0
                        ? 'border-blue-300'
                        : 'bg-white border-slate-200 hover:border-brand-400 hover:shadow-sm'
                    }`}
                  >
                    {unread > 0 && (
                      <div className="absolute inset-0 bg-blue-100 animate-pulse pointer-events-none" />
                    )}
                    {unread > 0 && (
                      <span className="absolute top-2 right-2 z-10 bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1.5">
                        {unread}
                      </span>
                    )}
                    <div className="relative z-10 px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-bold ${unread > 0 ? 'text-blue-700' : 'text-brand-700 group-hover:text-brand-800'}`}>
                          {c.caso_numero}
                        </span>
                        <div className="flex flex-col items-end gap-1 pr-6">
                          <EstadoBadge estado={c.estado} />
                          <span className="text-xs text-slate-400">{c.tipo_soporte}</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{c.descripcion}</p>
                      <p className="text-xs text-slate-400 mt-2">{formatDate(c.created_at)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
