import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getUserEmail, clearUserEmail } from '../lib/userSession'
import { clearAdminAuth } from '../lib/adminAuth'
import { supabase } from '../lib/supabase'
import { useSesionCartera } from './useAdminCartera'
import { reloj } from './formato'
import './mesa.css'

/** Marco de las pantallas de la Mesa de Ayuda · Dirección Financiera (rediseño nov. 2026). */
export default function Shell() {
  const { pathname } = useLocation()
  const correo = getUserEmail()
  const navigate = useNavigate()
  const [hora, setHora] = useState(reloj())

  useEffect(() => {
    const t = window.setInterval(() => setHora(reloj()), 30000)
    return () => window.clearInterval(t)
  }, [])

  const entrada = pathname === '/' || pathname === '/admin'
  const adminCar = pathname.startsWith('/admin/cartera')
  const admin = pathname.startsWith('/admin/') && !adminCar
  const cartera = adminCar || pathname.startsWith('/cartera')
  const sesionCar = useSesionCartera()
  const marca = pathname === '/selector' ? 'Mesa de Ayuda · UdeCataluña' : cartera ? 'Mesa de Ayuda · Cartera' : 'Mesa de Ayuda · Dirección Financiera'
  const inicio = adminCar ? '/admin/cartera' : admin ? '/admin/financiero' : pathname === '/selector' ? '/selector'
    : !correo ? '/' : cartera ? '/cartera/mis-casos' : '/mis-casos'

  return (
    <div className="mda">
      <header className="top">
        <div className="top-in">
          <a className="brand" onClick={() => navigate(inicio)}>
            <span className="brand-mark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h12a2.5 2.5 0 0 1 2.5 2.5v1.2a2.3 2.3 0 0 0 0 4.6v1.2A2.5 2.5 0 0 1 18 18H6a2.5 2.5 0 0 1-2.5-2.5v-1.2a2.3 2.3 0 0 0 0-4.6z" />
                <path d="M9.5 6v12" strokeDasharray="1.8 2" />
              </svg>
            </span>
            <span className="brand-name">{marca}</span>
          </a>
          {!entrada && (
            <div className="who">
              <span className="clock">{hora}</span>
              {adminCar ? (
                <>
                  <span className="dot">·</span><span>Cartera{sesionCar.nombre ? ` · ${sesionCar.nombre}` : ''}</span><span className="dot">·</span>
                  <button className="linkbtn" onClick={async () => { await supabase.auth.signOut(); navigate('/admin', { state: { mod: 'car' } }) }}>Cerrar sesión</button>
                </>
              ) : admin ? (
                <>
                  <span className="dot">·</span><span>Administración</span><span className="dot">·</span>
                  <button className="linkbtn" onClick={() => { clearAdminAuth(); navigate('/admin') }}>Cerrar sesión</button>
                </>
              ) : correo ? (
                <>
                  <span className="dot">·</span><span>{correo}</span><span className="dot">·</span>
                  <button className="linkbtn" onClick={() => { clearUserEmail(); navigate('/') }}>Cambiar correo</button>
                </>
              ) : null}
            </div>
          )}
        </div>
      </header>
      <main>
        <Outlet key={pathname} />
      </main>
    </div>
  )
}
