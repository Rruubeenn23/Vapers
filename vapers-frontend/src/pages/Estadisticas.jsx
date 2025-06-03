import React, { useEffect, useState } from 'react';
import '../styles/Estadisticas.css';

const Estadisticas = () => {
  const [ventas, setVentas] = useState([]);

  useEffect(() => {
    fetch('https://vapers-api.onrender.com/api/ventas')
      .then(res => res.json())
      .then(data => setVentas(data));
  }, []);

  // Cálculos de estadísticas
  const totalVentas = ventas.length;
  const ingresosTotales = ventas.reduce((acc, v) => acc + v.precio, 0);
  const ticketMedio = totalVentas ? (ingresosTotales / totalVentas).toFixed(2) : 0;

  const productoMasVendido = () => {
    const conteo = {};
    ventas.forEach(v => {
      conteo[v.producto] = (conteo[v.producto] || 0) + 1;
    });
    return Object.entries(conteo).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  };

  return (
    <div className="estadisticas-container">
      <h2>Estadísticas de Ventas</h2>

      <div className="stats-resumen">
        <div className="stat-card">
          <h3>Total ventas</h3>
          <p>{totalVentas}</p>
        </div>
        <div className="stat-card">
          <h3>Ingresos totales</h3>
          <p>€{ingresosTotales.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h3>Ticket medio</h3>
          <p>€{ticketMedio}</p>
        </div>
        <div className="stat-card">
          <h3>Producto más vendido</h3>
          <p>{productoMasVendido()}</p>
        </div>
      </div>

      <h3>Historial de ventas</h3>
      <table className="ventas-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Producto</th>
            <th>Precio (€)</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {ventas.map((venta, i) => (
            <tr key={i}>
              <td>{venta.id}</td>
              <td>{venta.cliente}</td>
              <td>{venta.producto}</td>
              <td>{venta.precio}</td>
              <td>{new Date(venta.fecha).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Estadisticas;
