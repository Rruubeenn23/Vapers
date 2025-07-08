import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Comprar from './pages/Comprar';
import Vender from './pages/Vender';
import Estadisticas from './pages/Estadisticas';
import NuevoVaper from './pages/NuevoVaper';
import Finanzas from './pages/Finanzas';

function App() {
  return (
    <Router>
      <div style={{ padding: 20 }}>
        <nav style={{ marginBottom: 20 }}>
          <Link to="/comprar" style={{ marginRight: 10 }}>Comprar</Link>
          <Link to="/vender" style={{ marginRight: 10 }}>Vender</Link>
          <Link to="/nuevo-vaper" style={{ marginRight: 10 }}>Nuevo Vaper</Link>
          <Link to="/estadisticas" style={{ marginRight: 10 }}>Estadísticas</Link>
          <Link to="/finanzas">Finanzas</Link>
        </nav>

        <Routes>
          <Route path="/comprar" element={<Comprar />} />
          <Route path="/vender" element={<Vender />} />
          <Route path="/nuevo-vaper" element={<NuevoVaper />} />
          <Route path="/estadisticas" element={<Estadisticas />} />
          <Route path="/finanzas" element={<Finanzas />} />
        </Routes>
      </div>
    </Router>
  );
}
export default App;