import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserEmail, setUserEmail } from '../lib/userSession'
import { IconMail } from '../components/icons'

export default function Home() {
  const [correo, setCorreo] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (getUserEmail()) navigate('/selector', { replace: true })
  }, [navigate])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setUserEmail(correo)
    navigate('/selector')
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm animate-pop-in">
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_1px_rgba(0,0,0,0.03),0_16px_40px_-16px_rgba(0,0,0,0.18)] p-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-inner shadow-white/20 ring-1 ring-black/5 flex items-center justify-center mb-4">
              <IconMail className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Bienvenido</h2>
            <p className="text-slate-500 text-sm mt-1">
              Ingresa tu correo para consultar tus casos.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
                autoFocus
                placeholder="tucorreo@ejemplo.com"
                className="w-full border border-black/10 bg-slate-50/60 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/50 focus:border-brand-400 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-brand-700 hover:bg-brand-800 hover:brightness-105 text-white font-semibold py-2.5 rounded-full shadow-sm transition-all duration-200 ease-spring active:scale-[0.97] text-sm"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
