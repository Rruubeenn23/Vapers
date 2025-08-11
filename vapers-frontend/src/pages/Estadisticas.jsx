import React, { useEffect, useState } from 'react';
import '../styles/Estadisticas.css';

const Estadisticas = () => {
  const [ventas, setVentas] = useState([]);
  const [productosMap, setProductosMap] = useState({});
  const [vapers, setVapers] = useState([]);

  useEffect(() => {
    // Ventas
    fetch('https://api-vapers.onrender.com/api/ventas')
      .then(res => res.json())
      .then(data => setVentas(data));

    // Productos
    fetch('https://api-vapers.onrender.com/')
      .then(res => res.json())
      .then(data => {
        const map = data.reduce((acc, producto) => {
          acc[producto.id] = producto.nombre;
          return acc;
        }, {});
        setProductosMap(map);
        setVapers(data); // Guardamos los productos para calcular el stock total
      });
  }, []);

  const obtenerNombreProducto = (id) => productosMap[id] || id;

  // === Cálculos ===
  const totalVentas = ventas.length;
  const totalProductosVendidos = ventas.reduce((acc, v) => acc + v.cantidad, 0);
  const ingresosTotales = ventas.reduce((acc, v) => acc + v.total, 0);

  const ticketMedioPorProducto = totalProductosVendidos ? (ingresosTotales / totalProductosVendidos).toFixed(2) : 0;

  // Cliente que más ha comprado (por cantidad)
  const clienteMasComprador = () => {
    const conteo = {};
    ventas.forEach(v => {
      conteo[v.cliente] = (conteo[v.cliente] || 0) + v.cantidad;
    });
    return Object.entries(conteo).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  };

  // Cliente que más ha gastado (por total €)
  const clienteQueMasGasta = () => {
    const gastos = {};
    ventas.forEach(v => {
      gastos[v.cliente] = (gastos[v.cliente] || 0) + v.total;
    });
    return Object.entries(gastos).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  };

  // Producto más vendido (por cantidad)
  const productoMasVendido = () => {
    const conteo = {};
    ventas.forEach(v => {
      conteo[v.id_vaper] = (conteo[v.id_vaper] || 0) + v.cantidad;
    });
    const [id] = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0] || ['N/A'];
    return obtenerNombreProducto(id);
  };

  // Producto que más ingresos generó
  const productoMasRentable = () => {
    const totales = {};
    ventas.forEach(v => {
      totales[v.id_vaper] = (totales[v.id_vaper] || 0) + v.total;
    });
    const [id] = Object.entries(totales).sort((a, b) => b[1] - a[1])[0] || ['N/A'];
    return obtenerNombreProducto(id);
  };

  // === Nuevo cálculo: Productos restantes ===
  const productosRestantes = vapers.reduce((acc, producto) => acc + producto.stock, 0);

  return (
    <div className="estadisticas-container">
      <h2>Estadísticas de Ventas</h2>

      <div className="stats-resumen">
        <div className="stat-card"><h3>Total ventas</h3><p>{totalVentas}</p></div>
        <div className="stat-card"><h3>Total productos vendidos</h3><p>{totalProductosVendidos}</p></div>
        <div className="stat-card"><h3>Productos restantes</h3><p>{productosRestantes}</p></div>
        <div className="stat-card"><h3>Ingresos totales</h3><p>€{ingresosTotales.toFixed(2)}</p></div>
        <div className="stat-card"><h3>Ticket medio por producto</h3><p>€{ticketMedioPorProducto}</p></div>
        <div className="stat-card"><h3>Producto más vendido</h3><p>{productoMasVendido()}</p></div>
        <div className="stat-card"><h3>Producto más rentable</h3><p>{productoMasRentable()}</p></div>
        <div className="stat-card"><h3>Cliente que más compra</h3><p>{clienteMasComprador()}</p></div>
        <div className="stat-card"><h3>Cliente que más gasta</h3><p>{clienteQueMasGasta()}</p></div>
      </div>

      <h3>Historial de ventas</h3>
      <table className="ventas-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Producto</th>
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
              <td>{obtenerNombreProducto(venta.id_vaper)}</td>
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
