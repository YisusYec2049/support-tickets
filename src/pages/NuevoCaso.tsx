import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getUserEmail } from '../lib/userSession'
import { usePasteImage } from '../lib/pasteImage'
import type { CasoSoporte } from '../types'
import { subirAdjunto } from '../mesa/datos'
import { Back, Badge, Ic, rise, useToast } from '../mesa/ui'
import { fDate } from '../mesa/formato'
import { ID_LABEL, SIN_ID, SIN_INSCRIPCION, TIPOS_SOPORTE } from '../mesa/constantes'

interface Form {
  nombre: string
  correo: string
  tipo_soporte: string
  tipo_usuario: string
  numero_id: string
  nombre_inscripcion: string
  descripcion: string
}

const vacio = (): Form => ({
  nombre: '', correo: getUserEmail() ?? '', tipo_soporte: '', tipo_usuario: '',
  numero_id: '', nombre_inscripcion: '', descripcion: '',
})

async function generarCasoNumero(): Promise<string> {
  const { data, error } = await supabase
    .from('casos_soporte')
    .select('caso_numero')
    .order('caso_numero', { ascending: false })
    .limit(1)
  if (error) throw error
  if (!data || data.length === 0) return 'CASO-00001'
  const num = parseInt(data[0].caso_numero.replace('CASO-', ''), 10)
  return `CASO-${String(num + 1).padStart(5, '0')}`
}

export default function NuevoCaso() {
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState<Form>(vacio)
  const [file, setFile] = useState<File | null>(null)
  const [tried, setTried] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creado, setCreado] = useState<CasoSoporte | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  usePasteImage(!creado, setFile)

  useEffect(() => {
    if (!getUserEmail()) navigate('/', { replace: true })
  }, [navigate])

  const conInscripcion = !!form.tipo_soporte && !SIN_INSCRIPCION.includes(form.tipo_soporte)
  const requeridos: (keyof Form)[] = ['nombre', 'correo', 'tipo_soporte', 'descripcion',
    ...(conInscripcion ? (['tipo_usuario', 'numero_id', 'nombre_inscripcion'] as (keyof Form)[]) : [])]
  const falta = (k: keyof Form) => tried && !form[k].trim()
  const valido = requeridos.every((k) => form[k].trim())
  const idLabel = form.tipo_soporte && !SIN_ID.includes(form.tipo_soporte) ? (ID_LABEL[form.tipo_soporte] ?? 'ID') : 'ID'

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  function elegirTipo(t: string) {
    setForm((f) => ({
      ...f,
      tipo_soporte: t,
      ...(SIN_INSCRIPCION.includes(t) ? { tipo_usuario: '', numero_id: '', nombre_inscripcion: '' } : {}),
    }))
  }

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
      let caso_numero = await generarCasoNumero()
      let nuevo: CasoSoporte | null = null
      for (let intento = 0; intento < 3; intento++) {
        const { data, error: insErr } = await supabase
          .from('casos_soporte')
          .insert({
            caso_numero,
            nombre: form.nombre.trim(),
            tipo_usuario: form.tipo_usuario,
            numero_id: form.numero_id.trim(),
            nombre_inscripcion: form.nombre_inscripcion.trim(),
            correo: form.correo.toLowerCase().trim(),
            tipo_soporte: form.tipo_soporte,
            descripcion: form.descripcion.trim(),
            estado: 'pendiente',
            adjunto_url,
          })
          .select()
          .single()
        if (!insErr) { nuevo = data as CasoSoporte; break }
        if (insErr.code === '23505') { caso_numero = await generarCasoNumero(); continue }
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

  return (
    <section className="page" style={{ gap: 28 }}>
      <div {...rise(0)}><Back to="/mis-casos">Inicio</Back></div>
      <h1 {...rise(0)}>Radicar caso</h1>
      <form className="form wide" onSubmit={enviar} noValidate>
        <div {...rise(1)}>
          <div className="fgroup">
            <p className="glabel">Quién solicita</p>
            <div className="frow">
              <Campo k="nombre" label="Nombre completo" ph="Ej. María Fernanda Torres" value={form.nombre} onChange={set('nombre')} bad={falta('nombre')} auto="name" />
              <Campo k="correo" label="Correo electrónico" ph="usuario@ejemplo.com" value={form.correo} onChange={set('correo')} bad={falta('correo')} type="email" auto="email" />
            </div>
          </div>
        </div>

        <div {...rise(2)}>
          <div className="fgroup">
            <p className="glabel">Qué necesitas</p>
            <div className="field">
              <span className="flabel" id="lbl-tipo">Tipo de soporte</span>
              <div className={`chips pillrow ${falta('tipo_soporte') ? 'bad' : ''}`} role="radiogroup" aria-labelledby="lbl-tipo">
                {TIPOS_SOPORTE.map((t) => (
                  <label key={t} className="chip">
                    <input type="radio" name="tipo_soporte" value={t} checked={form.tipo_soporte === t} onChange={() => elegirTipo(t)} />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
              {falta('tipo_soporte') && <span className="err">Elige el tipo de soporte.</span>}
            </div>

            {conInscripcion && (
              <div className="nv-irow appear">
                <div className="field">
                  <span className="flabel" id="lbl-ins">Tipo de inscripción</span>
                  <div className="seg" role="radiogroup" aria-labelledby="lbl-ins">
                    {['Individual', 'Empresarial'].map((x) => (
                      <button key={x} type="button" role="radio" aria-checked={form.tipo_usuario === x} aria-pressed={form.tipo_usuario === x}
                        onClick={() => setForm((f) => ({ ...f, tipo_usuario: x }))}>{x}</button>
                    ))}
                  </div>
                  {falta('tipo_usuario') && <span className="err">Elige una.</span>}
                </div>
                <Campo k="numero_id" label={idLabel} ph="Ej. #356" value={form.numero_id} onChange={set('numero_id')} bad={falta('numero_id')} />
                <Campo k="nombre_inscripcion" label="Nombre de inscripción" ph="Ej. Carlos Andrés Ramírez Molina" value={form.nombre_inscripcion} onChange={set('nombre_inscripcion')} bad={falta('nombre_inscripcion')} />
              </div>
            )}

            <div className="nv-drow">
              <div className={`field ${falta('descripcion') ? 'bad' : ''}`}>
                <label htmlFor="f-descripcion">Descripción</label>
                <textarea id="f-descripcion" value={form.descripcion} onChange={set('descripcion')} placeholder="Cuéntanos qué pasó, con fechas y valores si los tienes." />
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
        <div {...rise(3)}>
          <div className="form-foot">
            <button className="btn btn-pri" type="submit" disabled={loading}>{loading ? 'Enviando…' : 'Enviar solicitud'}</button>
          </div>
        </div>
      </form>
    </section>
  )
}

function Campo({ k, label, ph, value, onChange, bad, type = 'text', auto }: {
  k: string; label: string; ph: string; value: string; bad: boolean; type?: string; auto?: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className={`field ${bad ? 'bad' : ''}`}>
      <label htmlFor={`f-${k}`}>{label}</label>
      <input id={`f-${k}`} name={k} type={type} value={value} onChange={onChange} placeholder={ph} autoComplete={auto} />
      {bad && <span className="err">Falta este dato.</span>}
    </div>
  )
}

/** Confirmación: la ficha tal como saldrá en Inicio y, al lado, qué sigue. */
function Confirmacion({ caso, onCopiar, onOtro, toast }: {
  caso: CasoSoporte; onCopiar: () => void; onOtro: () => void; toast: React.ReactNode
}) {
  const navigate = useNavigate()
  const fecha = useMemo(() => fDate(caso.created_at), [caso.created_at])
  return (
    <section className="page">
      <div {...rise(0, 'head-txt')}>
        <h1>Listo, tu caso quedó radicado</h1>
        <p className="lede">
          Así aparece en tu inicio. Guarda el número por si lo necesitas:{' '}
          <b className="mono" style={{ color: 'var(--b600)' }}>{caso.caso_numero}</b>
        </p>
      </div>
      <div {...rise(1, 'dn-b')}>
        <div className="group" style={{ gap: 14 }}>
          <p className="glabel">Tu caso</p>
          <div className="v4-card just">
            <span className="v4-top"><span className="mono v4-n">{caso.caso_numero}</span><span className="v4-dt">Ahora</span></span>
            <span className="v4-t">{caso.tipo_soporte}</span>
            <span className="v4-d">{caso.descripcion}</span>
            <span className="v4-foot"><Badge estado="pendiente" /><span className="v4-dt num">{fecha}</span></span>
          </div>
          <div><button className="btn btn-sec" onClick={onCopiar}><Ic n="copy" />Copiar número</button></div>
        </div>
        <div className="group" style={{ gap: 14 }}>
          <p className="glabel">Qué sigue</p>
          <div className="dn-next">
            <ol className="dn-steps">
              <li><span className="dn-m dn-ok"><Ic n="check" sw={2.4} /></span><span><b>Radicado</b><span>Soporte ya lo tiene en su lista.</span></span></li>
              <li><span className="dn-m">2</span><span><b>Soporte lo revisa</b><span>Pasa a “En proceso” cuando lo abren.</span></span></li>
              <li><span className="dn-m">3</span><span><b>Te responde aquí</b><span>La ficha en tu inicio se mueve para avisarte.</span></span></li>
            </ol>
            <div className="dn-links">
              <button className="btn btn-pri" onClick={() => navigate(`/mis-casos/${caso.id}`)}>Ver mi caso <Ic n="arrowUR" sw={1.8} /></button>
              <button className="btn btn-sec" onClick={onOtro}>Radicar otro</button>
              <button className="btn btn-sec" onClick={() => navigate('/mis-casos')}>Ir al inicio</button>
            </div>
          </div>
        </div>
      </div>
      {toast}
    </section>
  )
}
