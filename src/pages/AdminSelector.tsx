import { useNavigate } from 'react-router-dom'
import { IconBarChart, IconWallet, IconShieldCheck, IconArrowUpRight } from '../components/icons'

export default function AdminSelector() {
  const navigate = useNavigate()

  const cards = [
    {
      onClick: () => navigate('/admin/financiero'),
      icon: IconBarChart,
      tileClass: 'from-sky-400 to-blue-600',
      label: 'Sistema Financiero',
      desc: 'Casos y consolidados del área financiera.',
    },
    {
      onClick: () => navigate('/admin/cartera'),
      icon: IconWallet,
      tileClass: 'from-emerald-400 to-green-600',
      label: 'Cartera',
      desc: 'Casos, reasignación y consolidados de cartera.',
    },
    {
      onClick: () => navigate('/superadmin'),
      icon: IconShieldCheck,
      tileClass: 'from-fuchsia-400 to-purple-600',
      label: 'Super Admin',
      desc: 'Vista unificada de ambos módulos.',
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-slate-900">Panel de Administración</h1>
        <p className="text-slate-500 text-sm mt-2">Selecciona el módulo que deseas gestionar.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl">
        {cards.map(({ onClick, icon: Icon, tileClass, label, desc }) => (
          <button
            key={label}
            onClick={onClick}
            className="group text-left rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex items-start justify-between">
              <div className={`flex h-14 w-14 items-center justify-center rounded-[14px] bg-gradient-to-br ${tileClass} shadow-inner shadow-white/20 ring-1 ring-black/5`}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <IconArrowUpRight className="w-4 h-4 text-slate-300 transition-colors group-hover:text-brand-600" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">{label}</h3>
            <p className="mt-1 text-sm text-slate-500">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
