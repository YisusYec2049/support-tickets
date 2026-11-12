import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserEmail } from '../lib/userSession'
import { Ic, rise } from '../mesa/ui'

/** Elige módulo: dos fichas grandes lado a lado (opción B aprobada 12/11/2026). Compartida con Cartera. */
export default function Selector() {
  const navigate = useNavigate()
  const correo = getUserEmail()

  useEffect(() => {
    if (!correo) navigate('/', { replace: true })
  }, [correo, navigate])

  return (
    <section className="page">
      <div {...rise(0, 'head-txt')}>
        <h1>¿Qué módulo necesitas?</h1>
        <p className="lede">{correo}</p>
      </div>
      <div {...rise(1, 'sl-b')}>
        <button className="sl-card" onClick={() => navigate('/mis-casos')}>
          <span className="ib"><Ic n="sheet" /></span>
          <h2>Sistema Financiero</h2>
          <p>Inscripciones, comprobantes de ingreso y egreso, acuerdos de pago, órdenes de trabajo, conciliaciones, reportes y links de pago.</p>
          <span className="go">Entrar <Ic n="arrowUR" sw={1.8} /></span>
        </button>
        <button className="sl-card" onClick={() => navigate('/cartera/mis-casos')}>
          <span className="ib"><Ic n="file" /></span>
          <h2>Cartera</h2>
          <p>Fechas y valores de cuotas, pagos mal aplicados o cruzados con otro cliente.</p>
          <span className="go">Entrar <Ic n="arrowUR" sw={1.8} /></span>
        </button>
      </div>
    </section>
  )
}
