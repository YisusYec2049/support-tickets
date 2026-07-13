import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'

export default function Layout() {
  const location = useLocation()
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ease-spring active:scale-[0.97] ${
      isActive
        ? 'bg-white text-brand-700 shadow-sm'
        : 'text-blue-100 hover:text-white hover:bg-brand-700'
    }`

  const path = location.pathname
  const titulo =
    path.startsWith('/cartera') || path.startsWith('/admin/cartera')
      ? 'Mesa de Ayuda Cartera'
      : path.startsWith('/mis-casos') || path.startsWith('/nuevo-caso') ||
        path.startsWith('/admin/financiero') || path.startsWith('/admin/consolidados')
      ? 'Mesa de Ayuda Sistema Financiero'
      : 'Mesa de Ayuda'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="bg-brand-800 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-sky-400 to-blue-600 shadow-inner shadow-white/20 ring-1 ring-black/5">
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <rect x="3" y="6.5" width="18" height="11" rx="2.5" fill="white" />
                <line x1="9.2" y1="6.5" x2="9.2" y2="17.5" className="text-blue-600" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2 2.2" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-xl leading-tight">
                {titulo}
              </span>
              <span className="text-blue-200 text-sm font-medium tracking-wide">
                UdeCataluña
              </span>
            </div>
          </Link>
          <nav className="flex gap-2">
            <NavLink to="/" className={linkClass} end>
              Home
            </NavLink>
            <NavLink to="/admin" className={linkClass}>
              Administración
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 w-full bg-[#f2f2f4]">
        <div key={location.pathname} className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-page-in">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-brand-900 text-blue-200 text-center text-xs py-4 mt-auto">
        © {new Date().getFullYear()} Universidad de Cataluña — Dirección Financiera. Todos los derechos reservados.
      </footer>
    </div>
  )
}
