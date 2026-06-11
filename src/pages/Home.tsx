import { useState } from 'react'
import { supabase } from '../lib/supabase'

const TIPOS_USUARIO = [
  'Empresarial',
  'Individual',
]

const TIPOS_SOPORTE = [
  'Inscripciones',
  'Comprobantes de Ingreso',
  'Acuerdo de pago',
  'Ordenes de Trabajo',
  'Comprobante de Egreso',
  'Conciliaciones Bancarias',
  'Reportes',
  'Otros',
]

interface FormData {
  nombre: string
  tipo_usuario: string
  numero_id: string
  correo: string
  tipo_soporte: string
  descripcion: string
}

const EMPTY: FormData = {
  nombre: '',
  tipo_usuario: '',
  numero_id: '',
  correo: '',
  tipo_soporte: '',
  descripcion: '',
}

async function generarCasoNumero(): Promise<string> {
  const { count, error } = await supabase
    .from('casos_soporte')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  const next = (count ?? 0) + 1
  return `CASO-${String(next).padStart(5, '0')}`
}

export default function Home() {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [casoCreado, setCasoCreado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const caso_numero = await generarCasoNumero()
      const { error: insertError } = await supabase.from('casos_soporte').insert({
        caso_numero,
        nombre: form.nombre,
        tipo_usuario: form.tipo_usuario,
        numero_id: form.numero_id,
        correo: form.correo.toLowerCase().trim(),
        tipo_soporte: form.tipo_soporte,
        descripcion: form.descripcion,
        estado: 'pendiente',
      })
      if (insertError) throw insertError
      setCasoCreado(caso_numero)
      setForm(EMPTY)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear el caso. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (casoCreado) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-10 shadow-sm">
          <div className="text-5xl mb-4">✓</div>
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
              className="px-5 py-2.5 bg-brand-700 text-white rounded-lg font-medium hover:bg-brand-800 transition-colors"
            >
              Crear otro caso
            </button>
            <a
              href="/mis-casos"
              className="px-5 py-2.5 border border-brand-700 text-brand-700 rounded-lg font-medium hover:bg-brand-50 transition-colors"
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
        <h1 className="text-2xl font-bold text-brand-800">Radicar Nuevo Caso</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Completa el formulario y nuestro equipo financiero te responderá a la brevedad.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6"
      >
        {/* Nombre */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Nombre Completo de quien solicita Soporte <span className="text-red-500">*</span>
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

        {/* Correo */}
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

        {/* Tipo de soporte */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Tipo de Soporte <span className="text-red-500">*</span>
          </label>
          <select
            name="tipo_soporte"
            value={form.tipo_soporte}
            onChange={(e) => {
              const val = e.target.value
              setForm((f) => ({
                ...f,
                tipo_soporte: val,
                tipo_usuario: val !== 'Inscripciones' ? '' : f.tipo_usuario,
              }))
            }}
            required
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
          >
            <option value="">Seleccionar...</option>
            {TIPOS_SOPORTE.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de inscripción — solo visible si tipo_soporte es Inscripciones */}
        {form.tipo_soporte === 'Inscripciones' && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Tipo de Inscripción <span className="text-red-500">*</span>
            </label>
            <select
              name="tipo_usuario"
              value={form.tipo_usuario}
              onChange={handleChange}
              required
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
            >
              <option value="">Seleccionar...</option>
              {TIPOS_USUARIO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ID */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="numero_id"
            value={form.numero_id}
            onChange={handleChange}
            required
            placeholder="Ej. #356"
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Descripción del caso <span className="text-red-500">*</span>
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-700 hover:bg-brand-800 disabled:bg-brand-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
        >
          {loading ? 'Enviando...' : 'Enviar Solicitud'}
        </button>
      </form>
    </div>
  )
}
