import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'

export default function Layout() {
  const location = useLocation()
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-white text-brand-700 shadow-sm'
        : 'text-blue-100 hover:text-white hover:bg-brand-700'
    }`

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-brand-800 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
            <div className="flex flex-col">
              <span className="text-white font-bold text-xl leading-tight">
                Mesa de Ayuda Financiera
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
      <main className="flex-1 w-full bg-slate-50">
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
