
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/Finanzas.css';

const Finanzas = () => {
    const API_BASE = import.meta.env.PROD
    ? 'https://api-vapers.onrender.com/api'
    : 'http://localhost:3000';

  const [modalOpen, setModalOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [precio, setPrecio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tag, setTag] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [finanzas, setFinanzas] = useState([]);
  const [mesActivo, setMesActivo] = useState('');
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [ingresoVentas, setIngresoVentas] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    ingresos: { key: null, direction: 'asc' },
    gastos: { key: null, direction: 'asc' },
    ahorro: { key: null, direction: 'asc' },
  });

  const categorias = [
    'Nómina',
    'Compra de vapers',
    'Gasto general',
    'Gasolina',
    'Comida',
    'Chuches',
    'Comida a Domicilio',
    'Ahorro - Ingreso',
    'Ahorro - Retiro',
    'Otro'
  ];

  const fetchFinanzas = async () => {
    try {
      const res = await axios.get(`${API_BASE}/finanzas`);
      setFinanzas(res.data);
      const meses = [...new Set(res.data.map(f => f.mes))].sort().reverse();
      setMesesDisponibles(meses);
      setMesActivo(meses[0]);
    } catch (err) {
      console.error('Error al obtener finanzas:', err);
    }
  };

  const fetchIngresosVentas = async () => {
    const urls = [
      'http://localhost:3000/api/ventas',
      'https://api-vapers.onrender.com/api/ventas'
    ];
    for (const url of urls) {
      try {
        const res = await axios.get(url);
        const total = res.data.reduce((acc, v) => acc + v.total, 0);
        setIngresoVentas(total);
        break;
      } catch {}
    }
  };

  useEffect(() => {
    fetchFinanzas();
    fetchIngresosVentas();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    try {
      const response = await axios.post(`${API_BASE}/finanzas`, {
        titulo,
        precio: parseFloat(precio),
        descripcion: descripcion || null,
        tag
      });
      if (response.status === 201) {
        setMensaje('Registro guardado correctamente');
        setTitulo('');
        setPrecio('');
        setDescripcion('');
        setTag('');
        setModalOpen(false);
        fetchFinanzas();
      }
    } catch (error) {
      setMensaje('Error al guardar: ' + (error.response?.data?.error || error.message));
    }
  };

  const sortData = (data, configKey) => {
    const config = sortConfig[configKey];
    return [...data].sort((a, b) => {
      if (!config.key) return 0;
      const fieldA = a[config.key];
      const fieldB = b[config.key];
      if (typeof fieldA === 'string') {
        return config.direction === 'asc'
          ? fieldA.localeCompare(fieldB)
          : fieldB.localeCompare(fieldA);
      } else {
        return config.direction === 'asc' ? fieldA - fieldB : fieldB - fieldA;
      }
    });
  };

  const handleSort = (key, section) => {
    let direction = 'asc';
    if (sortConfig[section].key === key && sortConfig[section].direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig(prev => ({
      ...prev,
      [section]: { key, direction }
    }));
  };

  const finanzasMes = finanzas.filter(f => f.mes === mesActivo);

  const ahorrosGlobales = finanzas.filter(f =>
    f.tag === 'Ahorro - Ingreso' || f.tag === 'Ahorro - Retiro'
  );

  const ahorroPorMes = {};

  finanzas.forEach((f) => {
    if (f.tag === 'Ahorro - Ingreso' || f.tag === 'Ahorro - Retiro') {
      if (!ahorroPorMes[f.mes]) ahorroPorMes[f.mes] = 0;
      ahorroPorMes[f.mes] += f.tag === 'Ahorro - Ingreso' ? f.precio : -f.precio;
    }
  });

  const ordenMeses = Object.keys(ahorroPorMes).sort();
  const mesActual = ordenMeses[ordenMeses.length - 1];
  const mesAnterior = ordenMeses[ordenMeses.length - 2];

  const saldoActual = ahorroPorMes[mesActual] ?? 0;
  const saldoAnterior = ahorroPorMes[mesAnterior] ?? 0;

  const colorSaldo = saldoActual > saldoAnterior ? 'green' : (saldoActual < saldoAnterior ? 'red' : 'inherit');


  const ingresos = [
    ...finanzasMes.filter(f => f.tag === 'Nómina'),
    ...(ingresoVentas !== null ? [{
      id: 'ventas-virtual',
      titulo: 'Ingresos por ventas',
      descripcion: 'Total de ventas acumuladas',
      precio: ingresoVentas,
      tag: 'Venta'
    }] : [])
  ];

  const gastos = finanzasMes.filter(f =>
    f.tag !== 'Nómina' &&
    f.tag !== 'Ahorro - Ingreso' &&
    f.tag !== 'Ahorro - Retiro'
  );

  const ahorros = finanzasMes.filter(f =>
    f.tag === 'Ahorro - Ingreso' || f.tag === 'Ahorro - Retiro'
  );

  const sortedIngresos = sortData(ingresos, 'ingresos');
  const sortedGastos = sortData(gastos, 'gastos');
  const sortedAhorros = sortData(ahorros, 'ahorro');

  const renderTabla = (data, section) => (
    <table border="1" cellPadding="8" cellSpacing="0" className="finanzas-table">
      <thead>
        <tr>
          <th onClick={() => handleSort('titulo', section)} style={{ cursor: 'pointer' }}>Título</th>
          <th onClick={() => handleSort('descripcion', section)} style={{ cursor: 'pointer' }}>Descripción</th>
          <th onClick={() => handleSort('precio', section)} style={{ cursor: 'pointer' }}>Precio</th>
          <th onClick={() => handleSort('tag', section)} style={{ cursor: 'pointer' }}>Categoría</th>
        </tr>
      </thead>
      <tbody>
        {data.map((f) => (
          <tr key={f.id}>
            <td>{f.titulo}</td>
            <td>{f.descripcion || '-'}</td>
            <td>${f.precio}</td>
            <td>{f.tag}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="finanzas-container">
      <h1>Finanzas</h1>

      <div className="finanzas-header">
        <label>Mes: </label>
        <select value={mesActivo} onChange={(e) => setMesActivo(e.target.value)}>
          {mesesDisponibles.map((mes, idx) => (
            <option key={idx} value={mes}>{mes}</option>
          ))}
        </select>
        <button onClick={() => setModalOpen(true)} className="finanzas-button">Agregar Movimiento</button>
      </div>

      {modalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="finanzas-modal-content">
            <h2>Nuevo Movimiento</h2>
            <form onSubmit={handleSubmit}>
              <div>
                <label>Título:</label>
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
              </div>
              <div>
                <label>Precio:</label>
                <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} required />
              </div>
              <div>
                <label>Descripción:</label>
                <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
              </div>
              <div>
                <label>Categoría:</label>
                <select value={tag} onChange={(e) => setTag(e.target.value)} required>
                  <option value="">Seleccionar</option>
                  {categorias.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button type="submit">Guardar</button>
                <button type="button" onClick={() => setModalOpen(false)} style={{ marginLeft: 10 }}>Cancelar</button>
              </div>
            </form>
            {mensaje && <p>{mensaje}</p>}
          </div>
        </div>
      )}

      <div className="finanzas-section">
        <h2>Ingresos</h2>
        {sortedIngresos.length === 0 ? <p>No hay ingresos.</p> : renderTabla(sortedIngresos, 'ingresos')}
      </div>

      <div className="finanzas-section">
        <h2>Gastos</h2>
        {sortedGastos.length === 0 ? <p>No hay gastos.</p> : renderTabla(sortedGastos, 'gastos')}
      </div>

      <div className="finanzas-section">
        <h2>Movimientos de Ahorro</h2>
        {ahorrosGlobales.length === 0 ? (
          <p>No hay movimientos de ahorro.</p>
        ) : (
          <>
            {renderTabla(ahorrosGlobales, 'ahorro')}
            <div style={{ marginTop: '1rem', textAlign: 'right', fontWeight: '600', fontSize: '1.1rem', color: colorSaldo }}>
              Saldo actual en cuenta de ahorro: ${saldoActual}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Finanzas;
