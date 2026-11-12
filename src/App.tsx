import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Shell from './mesa/Shell'
import Home from './pages/Home'
import Selector from './pages/Selector'
import MisCasos from './pages/MisCasos'
import MisCasosLista from './pages/MisCasosLista'
import CasoUsuario from './pages/CasoUsuario'
import NuevoCaso from './pages/NuevoCaso'
import NuevoCasoCartera from './pages/NuevoCasoCartera'
import Admin from './pages/Admin'
import CasoAdmin from './pages/CasoAdmin'
import AdminConsolidados from './pages/AdminConsolidados'
import AdminCartera from './pages/AdminCartera'
import CasoAdminCartera from './pages/CasoAdminCartera'
import { CAR } from './mesa/modulos'
import AdminConsolidadosCartera from './pages/AdminConsolidadosCartera'
import AdminSelector from './pages/AdminSelector'
import SuperAdmin from './pages/SuperAdmin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Mesa de Ayuda — rediseño nov. 2026 */}
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/selector" element={<Selector />} />
          <Route path="/mis-casos" element={<MisCasos />} />
          <Route path="/mis-casos/todos" element={<MisCasosLista />} />
          <Route path="/mis-casos/:id" element={<CasoUsuario />} />
          <Route path="/nuevo-caso" element={<NuevoCaso />} />
          <Route path="/admin" element={<AdminSelector />} />
          <Route path="/admin/financiero" element={<Admin />} />
          <Route path="/admin/financiero/:id" element={<CasoAdmin />} />
          <Route path="/admin/consolidados" element={<AdminConsolidados />} />

          {/* Cartera — mismo diseño (nov. 2026) */}
          <Route path="/cartera/mis-casos" element={<MisCasos mod={CAR} />} />
          <Route path="/cartera/mis-casos/todos" element={<MisCasosLista mod={CAR} />} />
          <Route path="/cartera/mis-casos/:id" element={<CasoUsuario mod={CAR} />} />
          <Route path="/cartera/nuevo-caso" element={<NuevoCasoCartera />} />
          <Route path="/admin/cartera" element={<AdminCartera />} />
          <Route path="/admin/cartera/consolidados" element={<AdminConsolidadosCartera />} />
          <Route path="/admin/cartera/:id" element={<CasoAdminCartera />} />
        </Route>

        {/* Super Admin conserva su diseño */}
        <Route element={<Layout />}>
          <Route path="/superadmin" element={<SuperAdmin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
