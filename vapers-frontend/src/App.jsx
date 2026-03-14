import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Toast from './components/Toast';
import Dashboard from './pages/Dashboard';
import Vender from './pages/Vender';
import Estadisticas from './pages/Estadisticas';
import Productos from './pages/Productos';
import SalesChat from './pages/SalesChat';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/"             element={<Dashboard />} />
          <Route path="/vender"       element={<Vender />} />
          <Route path="/estadisticas" element={<Estadisticas />} />
          <Route path="/productos"    element={<Productos />} />
          <Route path="/chat"         element={<SalesChat />} />
          {/* Legacy redirects */}
          <Route path="/salesChat"    element={<Navigate to="/chat" replace />} />
          <Route path="/finanzas"     element={<Navigate to="/" replace />} />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <Toast />
    </Router>
  );
}

export default App;
