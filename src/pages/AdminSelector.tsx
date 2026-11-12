import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { setAdminAuthenticated } from '../lib/adminAuth'
import { setSuperAdminAuthenticated } from '../lib/superAdminAuth'
import { nombreToEmail } from '../lib/adminAuthCartera'
import { Ic, rise } from '../mesa/ui'

// ⚠️ Financiero y Super Admin siguen comparando contra variables VITE_*, que quedan dentro del
// JavaScript que descarga el navegador. Cartera ya usa Supabase Auth. Ver Changelog (nov. 2026).
const ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined) ?? ''
const SUPER_PASSWORD = (import.meta.env.VITE_SUPERADMIN_PASSWORD as string | undefined) ?? ''

type Mod = 'fin' | 'car' | 'sup'
const MODS: Record<Mod, { n: string; d: string; i: string; nota: string }> = {
  fin: { n: 'Sistema Financiero', d: 'Casos y consolidados de esta mesa', i: 'shield', nota: 'La sesión se cierra cuando cierras la pestaña.' },
  car: { n: 'Cartera', d: 'Casos, reasignación y consolidados', i: 'file', nota: 'Cartera usa tu nombre y tu contraseña personal.' },
  sup: { n: 'Super Admin', d: 'Vista unificada de ambos módulos', i: 'lock', nota: 'Super Admin tiene una contraseña distinta a la de Financiero.' },
}

/** Acceso administrativo: el módulo elegido con su acceso ahí mismo; los otros dos, a la vista al lado. */
export default function AdminSelector() {
  const navigate = useNavigate()
  const [sel, setSel] = useState<Mod>('fin')
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [ver, setVer] = useState(false)
  const [err, setErr] = useState(false)
  const [cargando, setCargando] = useState(false)
  const m = MODS[sel]

  function elegir(k: Mod) {
    setSel(k)
    setErr(false)
    setVer(false)
    setPassword('')
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErr(false)
    if (sel === 'fin') {
      if (ADMIN_PASSWORD && password.trim() === ADMIN_PASSWORD.trim()) {
        setAdminAuthenticated()
        navigate('/admin/financiero')
      } else setErr(true)
      return
    }
    if (sel === 'sup') {
      if (SUPER_PASSWORD && password.trim() === SUPER_PASSWORD.trim()) {
        setSuperAdminAuthenticated()
        navigate('/superadmin')
      } else setErr(true)
      return
    }
    setCargando(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email: nombreToEmail(nombre), password: password.trim() })
    setCargando(false)
    if (error || !data.session) setErr(true)
    else navigate('/admin/cartera')
  }

  return (
    <section className="page">
      <div {...rise(0, 'head-txt')}>
        <h1>Administración</h1>
        <p className="lede">Elige el módulo. Cada uno tiene su propia contraseña.</p>
      </div>

      <div {...rise(1, 'ac-mods')}>
        <form key={sel} className="in-card ac-sel" onSubmit={entrar}
          style={{ borderColor: 'var(--b300)', background: 'var(--bg)', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="ac-tile" style={{ width: 44, height: 44, borderRadius: 13 }}><Ic n={m.i} sw={1.7} /></span>
            <span>
              <b style={{ fontSize: 18, fontWeight: 600, display: 'block' }}>{m.n}</b>
              <small style={{ color: 'var(--text2)', fontSize: 13.5 }}>{m.d}</small>
            </span>
          </div>

          {sel === 'car' && (
            <div className={`field ${err ? 'bad' : ''}`}>
              <label htmlFor="f-nom">Nombre</label>
              <input id="f-nom" type="text" required autoComplete="username" autoFocus value={nombre}
                onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre, como te lo asignaron" />
            </div>
          )}

          <div className={`field ${err ? 'bad' : ''}`}>
            <label htmlFor="f-pw">Contraseña</label>
            <div className="pw">
              <input id="f-pw" type={ver ? 'text' : 'password'} required autoComplete="current-password"
                autoFocus={sel !== 'car'} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña de administración" />
              <button type="button" className="pw-t" aria-pressed={ver} onClick={() => setVer((v) => !v)}>{ver ? 'Ocultar' : 'Mostrar'}</button>
            </div>
            {err && <p className="ac-err">{sel === 'car' ? 'Nombre o contraseña incorrectos. Intenta de nuevo.' : 'Contraseña incorrecta. Intenta de nuevo.'}</p>}
          </div>

          <p className="in-hint">{m.nota}</p>
          <div>
            <button className="btn btn-pri" type="submit" disabled={cargando}>
              {cargando ? 'Entrando…' : <>Entrar a {m.n} <Ic n="arrowUR" sw={1.8} /></>}
            </button>
          </div>
        </form>

        <div className="ac-other">
          <p className="glabel">Otros módulos</p>
          {(Object.keys(MODS) as Mod[]).filter((k) => k !== sel).map((k) => (
            <button key={k} type="button" className="ac-mod" onClick={() => elegir(k)}>
              <span className="ib"><Ic n={MODS[k].i} /></span>
              <span><b>{MODS[k].n}</b><small>{MODS[k].d}</small></span>
              <Ic n="arrowUR" sw={1.8} style={{ width: 16, height: 16, color: 'var(--b600)' }} />
            </button>
          ))}
        </div>
      </div>

      <div {...rise(2)}>
        <button className="ac-back" onClick={() => navigate('/')}><Ic n="left" sw={1.8} />Volver a la mesa de ayuda</button>
      </div>
    </section>
  )
}
