import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FarmerDashboard } from '../dashboards/farmer/FarmerDashboard';
import { GadDashboard } from '../dashboards/institutional/GadDashboard';
import { ScientificDashboard } from '../dashboards/scientific/ScientificDashboard';
import { Home } from './Home';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/cientifico" element={<ScientificDashboard />} />
        <Route path="/gad" element={<GadDashboard />} />
        <Route path="/agricultor" element={<FarmerDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
