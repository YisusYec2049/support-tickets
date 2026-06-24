import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Selector from './pages/Selector'
import MisCasos from './pages/MisCasos'
import NuevoCaso from './pages/NuevoCaso'
import MisCasosCartera from './pages/MisCasosCartera'
import NuevoCasoCartera from './pages/NuevoCasoCartera'
import Admin from './pages/Admin'
import AdminConsolidados from './pages/AdminConsolidados'
import AdminCartera from './pages/AdminCartera'
import AdminConsolidadosCartera from './pages/AdminConsolidadosCartera'
import AdminSelector from './pages/AdminSelector'
import SuperAdmin from './pages/SuperAdmin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/selector" element={<Selector />} />
          <Route path="/mis-casos" element={<MisCasos />} />
          <Route path="/nuevo-caso" element={<NuevoCaso />} />
          <Route path="/cartera/mis-casos" element={<MisCasosCartera />} />
          <Route path="/cartera/nuevo-caso" element={<NuevoCasoCartera />} />
          <Route path="/admin" element={<AdminSelector />} />
          <Route path="/admin/financiero" element={<Admin />} />
          <Route path="/admin/consolidados" element={<AdminConsolidados />} />
          <Route path="/admin/cartera" element={<AdminCartera />} />
          <Route path="/admin/cartera/consolidados" element={<AdminConsolidadosCartera />} />
          <Route path="/superadmin" element={<SuperAdmin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
