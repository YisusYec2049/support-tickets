import { useState, useRef, useEffect } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { playNotification } from '../lib/sound'
import type { CasoSoporte, MensajeCaso } from '../types'
import EstadoBadge from '../components/EstadoBadge'
import MensajeThread from '../components/MensajeThread'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium' })
}

const SIN_ID = ['Conciliaciones Bancarias', 'Reportes', 'Link de Pago']

const ID_LABEL: Record<string, string> = {
  'Inscripciones': 'N° Inscripción',
  'Comprobantes de Ingreso': 'ID del Comprobante de Ingreso',
  'Acuerdo de pago': 'ID del Acuerdo de pago',
  'Ordenes de Trabajo': 'ID de la Orden de Trabajo',
  'Comprobante de Egreso': 'ID del Comprobante de Egreso',
  'Otros': 'ID',
}

export default function MisCasos() {
  const [correo, setCorreo] = useState('')
  const [loading, setLoading] = useState(false)
  const [casos, setCasos] = useState<CasoSoporte[]>([])
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedCaso, setSelectedCaso] = useState<CasoSoporte | null>(null)
  const [mensajes, setMensajes] = useState<MensajeCaso[]>([])
  const [loadingMensajes, setLoadingMensajes] = useState(false)
  const [reply, setReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [replyFile, setReplyFile] = useState<File | null>(null)
  const replyFileRef = useRef<HTMLInputElement>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)

  // Limpiar suscripción al desmontar el componente
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  function cancelarSuscripcion() {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }

  function suscribirACaso(caso: CasoSoporte) {
    cancelarSuscripcion()

    const channel = supabase
      .channel(`caso-${caso.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'casos_soporte',
          filter: `id=eq.${caso.id}`,
        },
        (payload) => {
          const updated = payload.new as CasoSoporte
          setSelectedCaso(updated)
          setCasos((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes_casos',
          filter: `caso_id=eq.${caso.id}`,
        },
        (payload) => {
          const nuevo = payload.new as MensajeCaso
          if (nuevo.autor === 'admin') playNotification()
          setMensajes((prev) => [...prev, nuevo])
        },
      )
      .subscribe()

    channelRef.current = channel
  }

  async function recargar() {
    if (refreshing) return
    setRefreshing(true)
    try {
      if (selectedCaso) {
        const { data } = await supabase
          .from('mensajes_casos')
          .select('*')
          .eq('caso_id', selectedCaso.id)
          .order('created_at', { ascending: true })
        setMensajes(data ?? [])
        const { data: casoActualizado } = await supabase
          .from('casos_soporte')
          .select('*')
          .eq('id', selectedCaso.id)
          .single()
        if (casoActualizado) setSelectedCaso(casoActualizado)
      } else if (searched && correo) {
        const { data } = await supabase
          .from('casos_soporte')
          .select('*')
          .eq('correo', correo.toLowerCase().trim())
          .order('created_at', { ascending: false })
        setCasos(data ?? [])
      }
    } finally {
      setRefreshing(false)
    }
  }

  async function buscar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setSearched(false)
    cancelarSuscripcion()
    setSelectedCaso(null)
    try {
      const { data, error: err } = await supabase
        .from('casos_soporte')
        .select('*')
        .eq('correo', correo.toLowerCase().trim())
        .order('created_at', { ascending: false })
      if (err) throw err
      setCasos(data ?? [])
      setSearched(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al buscar casos.')
    } finally {
      setLoading(false)
    }
  }

  async function abrirCaso(caso: CasoSoporte) {
    setSelectedCaso(caso)
    setMensajes([])
    setReply('')
    setReplyError(null)
    setLoadingMensajes(true)
    try {
      const { data, error: err } = await supabase
        .from('mensajes_casos')
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

      const { error: err } = await supabase.from('mensajes_casos').insert({
        caso_id: selectedCaso.id,
        autor: 'usuario',
        mensaje: reply.trim(),
        adjunto_url,
      })
      if (err) throw err
      setReply('')
      setReplyFile(null)
      if (replyFileRef.current) replyFileRef.current.value = ''
      // El mensaje nuevo llegará por Realtime automáticamente
    } catch (err: unknown) {
      setReplyError(err instanceof Error ? err.message : 'Error al enviar mensaje.')
    } finally {
      setSendingReply(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-800">Mis Casos</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Ingresa tu correo para consultar el estado de tus solicitudes.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={buscar} className="flex gap-3 mb-8">
        <input
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
          placeholder="tucorreo@ejemplo.com"
          className="flex-1 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 disabled:bg-brand-300 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

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
            <button
              onClick={volverALista}
              className="text-blue-200 hover:text-white text-sm"
            >
              ← Volver
            </button>
          </div>

          <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500">Tipo de Soporte:</span>{' '}
              <span className="font-medium">{selectedCaso.tipo_soporte}</span>
            </div>
            {selectedCaso.tipo_soporte === 'Inscripciones' && (
              <div>
                <span className="text-slate-500">Tipo de Inscripción:</span>{' '}
                <span className="font-medium">{selectedCaso.tipo_usuario}</span>
              </div>
            )}
            {!SIN_ID.includes(selectedCaso.tipo_soporte) && selectedCaso.numero_id && (
              <div>
                <span className="text-slate-500">
                  {ID_LABEL[selectedCaso.tipo_soporte] ?? 'ID'}:
                </span>{' '}
                <span className="font-medium">{selectedCaso.numero_id}</span>
              </div>
            )}
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
                <a href={selectedCaso.adjunto_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={selectedCaso.adjunto_url}
                    alt="Adjunto"
                    className="max-h-48 rounded-lg border border-slate-200 object-contain hover:opacity-90 transition-opacity"
                  />
                </a>
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
                resolvedAt={selectedCaso.estado === 'resuelto' ? selectedCaso.updated_at : undefined}
              />
            )}
          </div>

          {selectedCaso.estado !== 'resuelto' && (
            <form onSubmit={enviarRespuesta} className="px-6 pb-6 flex flex-col gap-3">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                placeholder="Escribe tu mensaje..."
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
              {replyError && (
                <p className="text-red-600 text-xs">{replyError}</p>
              )}
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

      {/* FAB — solo visible si hay algo que recargar */}
      {(searched || selectedCaso) && (
        <button
          onClick={recargar}
          disabled={refreshing}
          title="Actualizar"
          className="fixed bottom-6 right-6 z-50 bg-brand-700 hover:bg-brand-800 disabled:bg-brand-400 text-white w-13 h-13 p-3.5 rounded-full shadow-lg transition-colors"
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

      {/* Cases list */}
      {!selectedCaso && searched && (
        <>
          {casos.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-4xl mb-3">📭</p>
              <p className="font-medium text-slate-600">No se encontraron casos para este correo.</p>
              <p className="text-sm mt-1">Verifica el correo o crea un nuevo caso.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 mb-4">
                {casos.length} caso{casos.length !== 1 ? 's' : ''} encontrado{casos.length !== 1 ? 's' : ''}
              </p>
              {casos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => abrirCaso(c)}
                  className="w-full text-left bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-brand-400 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-brand-700 group-hover:text-brand-800">
                      {c.caso_numero}
                    </span>
                    <div className="flex flex-col items-end gap-1">
                      <EstadoBadge estado={c.estado} />
                      <span className="text-xs text-slate-400">{c.tipo_soporte}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">{c.descripcion}</p>
                  <p className="text-xs text-slate-400 mt-2">{formatDate(c.created_at)}</p>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
