import { useNavigate } from 'react-router-dom'
import financeIcon from '../assets/Finance.png'
import walletIcon from '../assets/Wallet.png'

export default function AdminSelector() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-brand-800">Panel de Administración</h1>
        <p className="text-slate-500 text-sm mt-2">Selecciona el módulo que deseas gestionar.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        <button
          onClick={() => navigate('/admin/financiero')}
          className="flex flex-col items-center gap-5 bg-brand-800 hover:bg-white border-2 border-brand-800 rounded-2xl p-10 shadow-[0_6px_24px_rgba(30,58,138,0.35)] hover:shadow-[0_6px_24px_rgba(30,58,138,0.2)] transition-all duration-300 group"
        >
          <img
            src={financeIcon}
            alt="Sistema Financiero"
            className="w-20 h-20 object-contain brightness-0 invert group-hover:brightness-100 group-hover:invert-0 transition-all duration-300"
          />
          <span className="text-white group-hover:text-brand-800 font-bold text-base text-center transition-colors duration-300">
            Sistema Financiero
          </span>
        </button>

        <button
          onClick={() => navigate('/admin/cartera')}
          className="flex flex-col items-center gap-5 bg-brand-800 hover:bg-white border-2 border-brand-800 rounded-2xl p-10 shadow-[0_6px_24px_rgba(30,58,138,0.35)] hover:shadow-[0_6px_24px_rgba(30,58,138,0.2)] transition-all duration-300 group"
        >
          <img
            src={walletIcon}
            alt="Cartera"
            className="w-20 h-20 object-contain brightness-0 invert group-hover:brightness-100 group-hover:invert-0 transition-all duration-300"
          />
          <span className="text-white group-hover:text-brand-800 font-bold text-base text-center transition-colors duration-300">
            Cartera
          </span>
        </button>
      </div>
    </div>
  )
}
