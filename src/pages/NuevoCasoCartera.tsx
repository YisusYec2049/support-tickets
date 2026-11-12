import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getUserEmail } from '../lib/userSession'
import { usePasteImage } from '../lib/pasteImage'
import { subirAdjunto } from '../mesa/datos'
import { Back, Ic, rise, useToast } from '../mesa/ui'
import { CAR, TIPOS_CARTERA, UNIDADES, siguienteNumero, type Caso } from '../mesa/modulos'
import { Confirmacion } from './NuevoCaso'

interface Form {
  nombre: string
  correo: string
  tipo_usuario: string
  numero_id: string
  nombre_inscripcion: string
  unidad_negocio: string
  tipo_soporte: string
  descripcion: string
}

const vacio = (): Form => ({
  nombre: '', correo: getUserEmail() ?? '', tipo_usuario: '', numero_id: '', nombre_inscripcion: '',
  unidad_negocio: '', tipo_soporte: '', descripcion: '',
})

/** Radicar caso de Cartera: el formulario aprobado, con los campos de Cartera en su orden de siempre. */
export default function NuevoCasoCartera() {
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState<Form>(vacio)
  const [file, setFile] = useState<File | null>(null)
  const [tried, setTried] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creado, setCreado] = useState<Caso | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  usePasteImage(!creado, setFile)

  useEffect(() => {
    if (!getUserEmail()) navigate('/', { replace: true })
  }, [navigate])

  // En Cartera todos los campos son obligatorios, incluida la inscripción.
  const falta = (k: keyof Form) => tried && !form[k].trim()
  const valido = (Object.keys(form) as (keyof Form)[]).every((k) => form[k].trim())
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  function quitarArchivo() {
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setTried(true)
    if (!valido) return
    setError(null)
    setLoading(true)
    try {
      const adjunto_url = file ? await subirAdjunto(file) : null
      let caso_numero = await siguienteNumero(supabase, CAR)
      let nuevo: Caso | null = null
      for (let intento = 0; intento < 3; intento++) {
        const { data, error: insErr } = await supabase
          .from('casos_cartera')
          .insert({
            caso_numero,
            nombre: form.nombre.trim(),
            correo: form.correo.toLowerCase().trim(),
            tipo_usuario: form.tipo_usuario,
            numero_id: form.numero_id.trim(),
            nombre_inscripcion: form.nombre_inscripcion.trim(),
            unidad_negocio: form.unidad_negocio,
            tipo_soporte: form.tipo_soporte,
            descripcion: form.descripcion.trim(),
            estado: 'pendiente',
            adjunto_url,
          })
          .select()
          .single()
        if (!insErr) { nuevo = data as Caso; break }
        if (insErr.code === '23505') { caso_numero = await siguienteNumero(supabase, CAR); continue }
        throw insErr
      }
      if (!nuevo) throw new Error('No se pudo asignar un número de caso. Intenta de nuevo.')
      setCreado(nuevo)
      setForm(vacio())
      quitarArchivo()
      setTried(false)
      window.scrollTo({ top: 0 })
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Error al crear el caso. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (creado) {
    return (
      <Confirmacion
        mod={CAR}
        caso={creado}
        onCopiar={() => {
          navigator.clipboard?.writeText(creado.caso_numero).then(
            () => toast.show(`${creado.caso_numero} copiado`),
            () => toast.show('No se pudo copiar el número'),
          )
        }}
        onOtro={() => { setCreado(null); window.scrollTo({ top: 0 }) }}
        toast={toast.node}
      />
    )
  }

  const pills = (k: keyof Form, label: string, opts: string[]) => (
    <div className="field">
      <span className="flabel" id={`lbl-${k}`}>{label}</span>
      <div className={`chips pillrow ${falta(k) ? 'bad' : ''}`} role="radiogroup" aria-labelledby={`lbl-${k}`}>
        {opts.map((o) => (
          <label key={o} className="chip">
            <input type="radio" name={k} value={o} checked={form[k] === o} onChange={() => setForm((f) => ({ ...f, [k]: o }))} />
            <span>{o}</span>
          </label>
        ))}
      </div>
      {falta(k) && <span className="err">Elige una opción.</span>}
    </div>
  )

  const campo = (k: keyof Form, label: string, ph: string, type = 'text', auto?: string) => (
    <div className={`field ${falta(k) ? 'bad' : ''}`}>
      <label htmlFor={`c-${k}`}>{label}</label>
      <input id={`c-${k}`} name={k} type={type} value={form[k]} onChange={set(k)} placeholder={ph} autoComplete={auto} />
      {falta(k) && <span className="err">Falta este dato.</span>}
    </div>
  )

  return (
    <section className="page" style={{ gap: 28 }}>
      <div {...rise(0)}><Back to={CAR.base}>Inicio</Back></div>
      <h1 {...rise(0)}>Radicar caso</h1>
      <form className="form wide" onSubmit={enviar} noValidate>
        <div {...rise(1)}>
          <div className="fgroup">
            <p className="glabel">Quién solicita</p>
            <div className="frow">
              {campo('nombre', 'Nombre del solicitante', 'Ej. María Fernanda Torres', 'text', 'name')}
              {campo('correo', 'Correo electrónico', 'usuario@ejemplo.com', 'email', 'email')}
            </div>
          </div>
        </div>

        <div {...rise(2)}>
          <div className="fgroup">
            <p className="glabel">Inscripción</p>
            <div className="nv-irow">
              {pills('tipo_usuario', 'Tipo de inscripción', ['Individual', 'Empresarial'])}
              {campo('numero_id', 'N° de inscripción', 'Ej. 2024-001234')}
              {campo('nombre_inscripcion', 'Nombre de la inscripción', 'Ej. Diplomado en Gestión Financiera')}
            </div>
            {pills('unidad_negocio', 'Unidad de negocio', UNIDADES)}
          </div>
        </div>

        <div {...rise(3)}>
          <div className="fgroup">
            <p className="glabel">Qué necesitas</p>
            {pills('tipo_soporte', 'Tipo de soporte', TIPOS_CARTERA)}
            <div className="nv-drow">
              <div className={`field ${falta('descripcion') ? 'bad' : ''}`}>
                <label htmlFor="c-descripcion">Descripción</label>
                <textarea id="c-descripcion" value={form.descripcion} onChange={set('descripcion')}
                  placeholder="Cuéntanos qué pasó con tus cuotas o pagos, con fechas y valores si los tienes." />
                {falta('descripcion') && <span className="err">Describe el caso para poder ayudarte.</span>}
              </div>
              <div className="field">
                <span className="flabel">Adjunto <span className="opt">(opcional)</span></span>
                {file ? (
                  <div className="drop tall on">
                    <span className="file-pill">
                      <span>{file.name}</span>
                      <button type="button" onClick={quitarArchivo} aria-label="Quitar archivo"><Ic n="x" sw={2} /></button>
                    </span>
                  </div>
                ) : (
                  <button type="button" className="drop tall" onClick={() => fileRef.current?.click()}>
                    <Ic n="upload" />
                    <b>Adjuntar archivo</b>
                    <span>o pega una captura con Ctrl + V</span>
                    <small>PNG, JPG, PDF, Word o Excel</small>
                  </button>
                )}
                <input ref={fileRef} type="file" hidden accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
          </div>
        </div>

        {tried && !valido && <div className="alert">Revisa los campos marcados antes de enviar.</div>}
        {error && <div className="alert">{error}</div>}
        <div {...rise(4)}>
          <div className="form-foot">
            <button className="btn btn-pri" type="submit" disabled={loading}>{loading ? 'Enviando…' : 'Enviar solicitud'}</button>
          </div>
        </div>
      </form>
    </section>
  )
}
