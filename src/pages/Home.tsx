import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserEmail, setUserEmail } from '../lib/userSession'

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
      <div className="w-full max-w-sm">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-brand-800">Bienvenido</h2>
            <p className="text-slate-500 text-sm mt-1">
              Ingresa tu correo para consultar tus casos.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              autoFocus
              placeholder="tucorreo@ejemplo.com"
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="w-full bg-brand-700 hover:bg-brand-800 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
