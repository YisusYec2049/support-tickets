import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserEmail, clearUserEmail } from '../lib/userSession'
import { IconBarChart, IconWallet, IconArrowUpRight } from '../components/icons'

export default function Selector() {
  const navigate = useNavigate()
  const correo = getUserEmail()

  useEffect(() => {
    if (!correo) navigate('/', { replace: true })
  }, [correo, navigate])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-slate-900">¿Qué módulo necesitas?</h1>
        <p className="text-slate-500 text-sm mt-2">{correo}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
        <button
          onClick={() => navigate('/mis-casos')}
          className="group text-left rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-gradient-to-br from-sky-400 to-blue-600 shadow-inner shadow-white/20 ring-1 ring-black/5">
              <IconBarChart className="w-7 h-7 text-white" />
            </div>
            <IconArrowUpRight className="w-4 h-4 text-slate-300 transition-colors group-hover:text-brand-600" />
          </div>
          <h3 className="mt-4 font-semibold text-slate-900">Soporte Sistema Financiero</h3>
          <p className="mt-1 text-sm text-slate-500">Inscripciones, comprobantes, acuerdos de pago y más.</p>
        </button>

        <button
          onClick={() => navigate('/cartera/mis-casos')}
          className="group text-left rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-gradient-to-br from-emerald-400 to-green-600 shadow-inner shadow-white/20 ring-1 ring-black/5">
              <IconWallet className="w-7 h-7 text-white" />
            </div>
            <IconArrowUpRight className="w-4 h-4 text-slate-300 transition-colors group-hover:text-brand-600" />
          </div>
          <h3 className="mt-4 font-semibold text-slate-900">Soporte Cartera</h3>
          <p className="mt-1 text-sm text-slate-500">Cuotas, pagos mal aplicados y cruces de cartera.</p>
        </button>
      </div>

      <button
        onClick={() => { clearUserEmail(); navigate('/') }}
        className="mt-10 text-sm text-slate-400 hover:text-slate-600 transition-colors"
      >
        Cambiar correo
      </button>
    </div>
  )
}
