import React, { useEffect, useState } from 'react';
import '../styles/Estadisticas.css';

const Estadisticas = () => {
  const [ventas, setVentas] = useState([]);

  useEffect(() => {
    fetch('https://api-vapers.onrender.com/api/ventas')
      .then(res => res.json())
      .then(data => setVentas(data));
  }, []);

  // Total ventas es la cantidad de registros
  const totalVentas = ventas.length;

  // Ingresos totales sumando el total de cada venta
  const ingresosTotales = ventas.reduce((acc, v) => acc + v.total, 0);

  // Ticket medio = ingresos totales dividido por total de ventas
  const ticketMedio = totalVentas ? (ingresosTotales / totalVentas).toFixed(2) : 0;

  // Producto más vendido según la suma de cantidades por id_vaper
  const productoMasVendido = () => {
    const conteo = {};
    ventas.forEach(v => {
      conteo[v.id_vaper] = (conteo[v.id_vaper] || 0) + v.cantidad;
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
          <h3>Producto más vendido (ID)</h3>
          <p>{productoMasVendido()}</p>
        </div>
      </div>

      <h3>Historial de ventas</h3>
      <table className="ventas-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Producto (ID)</th>
            <th>Precio Unitario (€)</th>
            <th>Cantidad</th>
            <th>Total (€)</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {ventas.map((venta, i) => (
            <tr key={i}>
              <td>{venta.id}</td>
              <td>{venta.cliente}</td>
              <td>{venta.id_vaper}</td>
              <td>{venta.precio_unitario}</td>
              <td>{venta.cantidad}</td>
              <td>{venta.total}</td>
              <td>{new Date(venta.fecha).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Estadisticas;
