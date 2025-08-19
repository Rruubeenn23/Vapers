import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Comprar from './pages/Comprar';
import Vender from './pages/Vender';
import NuevoVaper from './pages/NuevoVaper';
import Finanzas from './pages/Finanzas';
import SalesChat from './pages/SalesChat';
import Estadisticas from './pages/Estadisticas';
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* <Route path="/comprar" element={<Comprar />} /> */}
          <Route path="/vender" element={<Vender />} />
          {/* <Route path="/nuevo-vaper" element={<NuevoVaper />} /> */}
          {/* <Route path="/finanzas" element={<Finanzas />} /> */}
          <Route path="/estadisticas" element={<Estadisticas />} />
          <Route path="/salesChat" element={<SalesChat />} />
          {/* Default */}
          <Route path="*" element={<Estadisticas />} />
        </Routes>
      </Layout>
    </Router>
  );
}
export default App;
