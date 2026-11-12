import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Shell from './mesa/Shell'
import Home from './pages/Home'
import Selector from './pages/Selector'
import MisCasos from './pages/MisCasos'
import MisCasosLista from './pages/MisCasosLista'
import CasoUsuario from './pages/CasoUsuario'
import NuevoCaso from './pages/NuevoCaso'
import MisCasosCartera from './pages/MisCasosCartera'
import NuevoCasoCartera from './pages/NuevoCasoCartera'
import Admin from './pages/Admin'
import CasoAdmin from './pages/CasoAdmin'
import AdminConsolidados from './pages/AdminConsolidados'
import AdminCartera from './pages/AdminCartera'
import AdminConsolidadosCartera from './pages/AdminConsolidadosCartera'
import AdminSelector from './pages/AdminSelector'
import SuperAdmin from './pages/SuperAdmin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Mesa de Ayuda · Dirección Financiera — rediseño nov. 2026 */}
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
        </Route>

        {/* Cartera y Super Admin conservan su diseño */}
        <Route element={<Layout />}>
          <Route path="/cartera/mis-casos" element={<MisCasosCartera />} />
          <Route path="/cartera/nuevo-caso" element={<NuevoCasoCartera />} />
          <Route path="/admin/cartera" element={<AdminCartera />} />
          <Route path="/admin/cartera/consolidados" element={<AdminConsolidadosCartera />} />
          <Route path="/superadmin" element={<SuperAdmin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
