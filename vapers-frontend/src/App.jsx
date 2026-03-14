import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Toast from './components/Toast';
import Vender from './pages/Vender';
import Estadisticas from './pages/Estadisticas';
import Productos from './pages/Productos';
import Finanzas from './pages/Finanzas';
import SalesChat from './pages/SalesChat';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/"            element={<Navigate to="/estadisticas" replace />} />
          <Route path="/vender"      element={<Vender />} />
          <Route path="/estadisticas" element={<Estadisticas />} />
          <Route path="/productos"   element={<Productos />} />
          <Route path="/finanzas"    element={<Finanzas />} />
          <Route path="/chat"        element={<SalesChat />} />
          {/* Legacy redirect */}
          <Route path="/salesChat"   element={<Navigate to="/chat" replace />} />
          <Route path="*"            element={<Navigate to="/estadisticas" replace />} />
        </Routes>
      </Layout>
      <Toast />
    </Router>
  );
}

export default App;
