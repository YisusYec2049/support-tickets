import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import MisCasos from './pages/MisCasos'
import NuevoCaso from './pages/NuevoCaso'
import Admin from './pages/Admin'
import AdminConsolidados from './pages/AdminConsolidados'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/mis-casos" element={<MisCasos />} />
          <Route path="/nuevo-caso" element={<NuevoCaso />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/consolidados" element={<AdminConsolidados />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
