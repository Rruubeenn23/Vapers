import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Comprar from './pages/Comprar';
import Vender from './pages/Vender';
import NuevoVaper from './pages/NuevoVaper';
import Finanzas from './pages/Finanzas';
import SalesChat from './components/SalesChat';


function App() {
  return (
    <Router>
      <div style={{ padding: 20 }}>
        <nav style={{ marginBottom: 20 }}>
          <Link to="/comprar" style={{ marginRight: 10 }}>Comprar</Link>
          <Link to="/vender" style={{ marginRight: 10 }}>Vender</Link>
          <Link to="/nuevo-vaper" style={{ marginRight: 10 }}>Nuevo Vaper</Link>
          <Link to="/finanzas">Finanzas</Link>
          <Link to="/salesChat">Chat con IA</Link>
        </nav>

        <Routes>
          <Route path="/comprar" element={<Comprar />} />
          <Route path="/vender" element={<Vender />} />
          <Route path="/nuevo-vaper" element={<NuevoVaper />} />
          <Route path="/finanzas" element={<Finanzas />} />
          <Route path="/salesChat" element={<SalesChat />} />
        </Routes>
      </div>
    </Router>
  );
}
export default App;