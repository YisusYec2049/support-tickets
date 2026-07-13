import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getUserEmail } from '../lib/userSession'
import { IconClose, IconDocument, IconCheckCircle, IconUpload } from '../components/icons'
import Select from '../components/Select'

const TIPOS_SOPORTE = [
  'Fechas Cuotas',
  'Valores Cuotas',
  'Pago mal aplicado',
  'Pago cruzado con otro cliente',
  'Otro',
]

interface FormData {
  nombre: string
  correo: string
  tipo_usuario: string
  numero_id: string
  nombre_inscripcion: string
  unidad_negocio: string
  tipo_soporte: string
  descripcion: string
}

const emptyForm = (): FormData => ({
  nombre: '',
  correo: getUserEmail() ?? '',
  tipo_usuario: '',
  numero_id: '',
  nombre_inscripcion: '',
  unidad_negocio: '',
  tipo_soporte: '',
  descripcion: '',
})

async function generarCasoNumero(): Promise<string> {
  const { data, error } = await supabase
    .from('casos_cartera')
    .select('caso_numero')
    .order('caso_numero', { ascending: false })
    .limit(1)
  if (error) throw error
  if (!data || data.length === 0) return 'CAR-00001'
  const num = parseInt(data[0].caso_numero.replace('CAR-', ''), 10)
  return `CAR-${String(num + 1).padStart(5, '0')}`
}

export default function NuevoCasoCartera() {
  const [form, setForm] = useState<FormData>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [casoCreado, setCasoCreado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [attempted, setAttempted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAttempted(true)
    if (!form.tipo_usuario || !form.unidad_negocio || !form.tipo_soporte) {
      setError('Completa todos los campos obligatorios.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      let adjunto_url: string | null = null
      if (file) {
        const ext = file.name.split('.').pop()
        const fileName = `${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, file)
        if (uploadError) throw new Error(`Error al subir el adjunto: ${uploadError.message}`)
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(fileName)
        adjunto_url = urlData.publicUrl
      }

      let caso_numero = await generarCasoNumero()
      let insertError = null
      for (let intento = 0; intento < 3; intento++) {
        const { error } = await supabase.from('casos_cartera').insert({
          caso_numero,
          nombre: form.nombre,
          correo: form.correo.toLowerCase().trim(),
          tipo_usuario: form.tipo_usuario,
          numero_id: form.numero_id,
          nombre_inscripcion: form.nombre_inscripcion,
          unidad_negocio: form.unidad_negocio,
          tipo_soporte: form.tipo_soporte,
          descripcion: form.descripcion,
          estado: 'pendiente',
          adjunto_url,
        })
        insertError = error
        if (!insertError) break
        if (insertError.code === '23505') {
          caso_numero = await generarCasoNumero()
          continue
        }
        break
      }
      if (insertError) throw insertError
      setCasoCreado(caso_numero)
      setForm(emptyForm())
      setFile(null)
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? 'Error al crear el caso. Intenta de nuevo.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (casoCreado) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-10 shadow-sm">
          <IconCheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">Caso Creado Exitosamente</h2>
          <p className="text-slate-600 mb-4">
            Tu solicitud ha sido registrada. Guarda el número de caso para hacerle seguimiento.
          </p>
          <div className="bg-white border-2 border-green-300 rounded-xl px-6 py-4 inline-block mb-6">
            <span className="text-xs text-slate-500 block">Número de caso</span>
            <span className="text-2xl font-bold text-brand-700 tracking-wide">{casoCreado}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setCasoCreado(null)}
              className="px-5 py-2.5 bg-brand-700 text-white rounded-full font-medium shadow-sm hover:bg-brand-800 hover:brightness-105 active:scale-[0.97] transition-all duration-200 ease-spring"
            >
              Crear otro caso
            </button>
            <a
              href="/cartera/mis-casos"
              className="px-5 py-2.5 border border-brand-700 text-brand-700 rounded-full font-medium hover:bg-brand-50 active:scale-[0.97] transition-all duration-200 ease-spring"
            >
              Ver mis casos
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Radicar Nuevo Caso — Cartera</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Completa el formulario y nuestro equipo de cartera te responderá a la brevedad.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-black/5 p-8 space-y-6"
      >
        {/* Nombre del Solicitante */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Nombre del Solicitante <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            required
            placeholder="Ej. María Fernanda Torres"
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        {/* Correo electrónico */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Correo electrónico <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="correo"
            value={form.correo}
            onChange={handleChange}
            required
            placeholder="usuario@ejemplo.com"
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        {/* Tipo de inscripción */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Tipo de Inscripción <span className="text-red-500">*</span>
          </label>
          <Select
            value={form.tipo_usuario}
            onChange={(v) => setForm((f) => ({ ...f, tipo_usuario: v }))}
            options={[
              { value: 'Empresarial', label: 'Empresarial' },
              { value: 'Individual', label: 'Individual' },
            ]}
            invalid={attempted && !form.tipo_usuario}
          />
        </div>

        {/* No de Inscripción */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            N° de Inscripción <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="numero_id"
            value={form.numero_id}
            onChange={handleChange}
            required
            placeholder="Ej. 2024-001234"
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        {/* Nombre de la inscripción */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Nombre de la Inscripción <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="nombre_inscripcion"
            value={form.nombre_inscripcion}
            onChange={handleChange}
            required
            placeholder="Ej. Diplomado en Gestión Financiera"
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        {/* Unidad de negocio */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Unidad de Negocio <span className="text-red-500">*</span>
          </label>
          <Select
            value={form.unidad_negocio}
            onChange={(v) => setForm((f) => ({ ...f, unidad_negocio: v }))}
            options={[
              { value: 'Diplomados', label: 'Diplomados' },
              { value: 'Especializaciones', label: 'Especializaciones' },
            ]}
            invalid={attempted && !form.unidad_negocio}
          />
        </div>

        {/* Tipo de soporte */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Tipo de Soporte <span className="text-red-500">*</span>
          </label>
          <Select
            value={form.tipo_soporte}
            onChange={(v) => setForm((f) => ({ ...f, tipo_soporte: v }))}
            options={TIPOS_SOPORTE.map((t) => ({ value: t, label: t }))}
            invalid={attempted && !form.tipo_soporte}
          />
        </div>

        {/* Descripción del Caso */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Descripción del Caso <span className="text-red-500">*</span>
          </label>
          <textarea
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            required
            rows={5}
            placeholder="Describe detalladamente tu solicitud o inconveniente..."
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-y"
          />
        </div>

        {/* Adjunto */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Adjunto <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <label
            htmlFor="adjunto-nuevo-caso-cartera"
            className="flex items-center gap-2 w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-600 hover:border-brand-400 hover:bg-brand-50/50 transition-colors cursor-pointer"
          >
            <IconUpload className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{file ? file.name : 'Seleccionar archivo...'}</span>
          </label>
          <input
            id="adjunto-nuevo-caso-cartera"
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          {file && (
            <div className="relative inline-block mt-3">
              {file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt="Vista previa"
                  className="max-h-48 rounded-lg border border-black/5 object-contain"
                />
              ) : (
                <div className="flex items-center gap-2 bg-slate-50 border border-black/5 rounded-lg px-4 py-3 text-sm text-slate-700">
                  <IconDocument className="w-5 h-5 text-slate-400" />
                  <span className="font-medium">{file.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow transition-colors"
                title="Quitar archivo"
              >
                <IconClose className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-700 hover:bg-brand-800 hover:brightness-105 disabled:bg-brand-300 text-white font-semibold py-3 rounded-full shadow-sm transition-all duration-200 ease-spring active:scale-[0.98] text-sm"
        >
          {loading ? 'Enviando...' : 'Enviar Solicitud'}
        </button>
      </form>
    </div>
  )
}
