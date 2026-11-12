import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserEmail, setUserEmail } from '../lib/userSession'
import { getLastEmail, setLastEmail } from '../mesa/datos'
import { Ic, rise } from '../mesa/ui'

/** Ingreso: lo que se hace en la mesa a la izquierda y la ficha para entrar a la derecha. */
export default function Home() {
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const ultimo = getLastEmail()

  useEffect(() => {
    if (getUserEmail()) navigate('/selector', { replace: true })
  }, [navigate])

  function entrar(email: string) {
    setUserEmail(email)
    setLastEmail(email)
    navigate('/selector')
  }

  return (
    <section className="page">
      <div className="in-b">
        <div {...rise(0, 'group', { gap: 28 })}>
          <h1 style={{ fontSize: 44, lineHeight: 1.1 }}>Consulta y radica tus casos</h1>
          <ul className="in-pts">
            <li><span className="ib"><Ic n="pen" /></span><span><b>Radica un caso</b><span>Reporta un problema o pide un trámite.</span></span></li>
            <li><span className="ib"><Ic n="chat" /></span><span><b>Conversa con Soporte</b><span>Te respondemos por esta misma mesa.</span></span></li>
            <li><span className="ib"><Ic n="file" /></span><span><b>Revisa tu historial</b><span>Todos tus casos, abiertos y resueltos.</span></span></li>
          </ul>
        </div>

        <form {...rise(1, 'in-card')} onSubmit={(e) => { e.preventDefault(); if (correo.trim()) entrar(correo) }}>
          <p className="glabel">Entrar</p>
          {ultimo && (
            <>
              <button type="button" className="in-me" onClick={() => entrar(ultimo)}>
                <span className="av">{ultimo.charAt(0).toUpperCase()}</span>
                <span><b>Continuar como</b><small>{ultimo}</small></span>
                <Ic n="arrowUR" sw={1.8} style={{ width: 18, height: 18, color: 'var(--b600)' }} />
              </button>
              <div className="in-or">o entra con otro correo</div>
            </>
          )}
          <div className="field">
            <label htmlFor="f-ingreso">Correo electrónico</label>
            <input
              id="f-ingreso"
              type="email"
              required
              autoComplete="email"
              autoFocus={!ultimo}
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              style={{ fontSize: 16, padding: '14px 16px' }}
            />
          </div>
          <p className="in-hint">Usa el mismo correo con el que radicas tus solicitudes. Ahí verás tus casos y las respuestas de Soporte.</p>
          <div>
            <button className={`btn ${ultimo ? 'btn-sec' : 'btn-pri'}`} type="submit">
              {ultimo ? 'Continuar con este correo' : <>Continuar <Ic n="arrowUR" sw={1.8} /></>}
            </button>
          </div>
        </form>
      </div>

      <div {...rise(2, 'group')}>
        <p className="glabel">Equipo de soporte</p>
        <button className="v4-admin" onClick={() => navigate('/admin')}>
          <Ic n="chat" className="v4-aico" />
          <span className="v4-atxt">
            <span className="v4-ah">Administración</span>
            <span className="v4-ap">Atender y responder los casos radicados</span>
          </span>
          <Ic n="arrowUR" className="v4-aar" sw={1.8} />
        </button>
      </div>
    </section>
  )
}
