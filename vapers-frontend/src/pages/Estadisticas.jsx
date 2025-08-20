import React, { useEffect, useMemo, useState } from 'react';
import '../styles/Estadisticas.css';

const Estadisticas = () => {
  const [ventas, setVentas] = useState([]);
  const [productosMap, setProductosMap] = useState({});
  const [vapers, setVapers] = useState([]);

  // Filtro & Ordenación tabla
  const [filterText, setFilterText] = useState('');
  const [sort, setSort] = useState({ key: 'fecha', dir: 'desc' }); // key: id|cliente|producto|precio_unitario|cantidad|total|fecha

  useEffect(() => {
    // Ventas
    fetch('https://api-vapers.onrender.com/api/ventas')
      .then(res => res.json())
      .then(data => setVentas(Array.isArray(data) ? data : []));

    // Productos
    fetch('https://api-vapers.onrender.com/')
      .then(res => res.json())
      .then(data => {
        const map = (data || []).reduce((acc, producto) => {
          acc[producto.id] = producto.nombre;
          return acc;
        }, {});
        setProductosMap(map);
        setVapers(data || []);
      });
  }, []);

  const productoNombre = (id) => productosMap[id] || id;

  // === KPIs ===
  const totalVentas = ventas.length;
  const totalProductosVendidos = ventas.reduce((acc, v) => acc + v.cantidad, 0);
  const ingresosTotales = ventas.reduce((acc, v) => acc + v.total, 0);
  const ticketMedioPorProducto = totalProductosVendidos ? (ingresosTotales / totalProductosVendidos).toFixed(2) : 0;

  const clienteMasComprador = () => {
    const conteo = {};
    ventas.forEach(v => { conteo[v.cliente] = (conteo[v.cliente] || 0) + v.cantidad; });
    return Object.entries(conteo).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  };

  const clienteQueMasGasta = () => {
    const gastos = {};
    ventas.forEach(v => { gastos[v.cliente] = (gastos[v.cliente] || 0) + v.total; });
    return Object.entries(gastos).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  };

  const productoMasVendido = () => {
    const conteo = {};
    ventas.forEach(v => { conteo[v.id_vaper] = (conteo[v.id_vaper] || 0) + v.cantidad; });
    const [id] = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0] || ['N/A'];
    return productoNombre(id);
  };

  const productoMasRentable = () => {
    const totales = {};
    ventas.forEach(v => { totales[v.id_vaper] = (totales[v.id_vaper] || 0) + v.total; });
    const [id] = Object.entries(totales).sort((a, b) => b[1] - a[1])[0] || ['N/A'];
    return productoNombre(id);
  };

  const productosRestantes = vapers.reduce((acc, p) => acc + (p.stock ?? 0), 0);

  // === Filtrado + Ordenación tabla ===
  const filteredSorted = useMemo(() => {
    const text = filterText.trim().toLowerCase();
    let rows = ventas;

    if (text) {
      rows = rows.filter((v) => {
        const cliente = (v.cliente || '').toLowerCase();
        const prod = (productoNombre(v.id_vaper) || '').toLowerCase();
        return cliente.includes(text) || prod.includes(text);
      });
    }

    const sorted = [...rows].sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      const val = (key) => {
        if (key === 'producto') return productoNombre((a.id_vaper)).localeCompare(productoNombre(b.id_vaper));
        if (key === 'cliente') return (a.cliente || '').localeCompare(b.cliente || '');
        if (key === 'fecha') return new Date(a.fecha) - new Date(b.fecha);
        return (a[key] ?? 0) - (b[key] ?? 0);
      };
      return dir * (val(sort.key));
    });

    return sorted;
  }, [ventas, filterText, sort]);

  const toggleSort = (key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const arrow = (key) => sort.key === key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕';

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Estadísticas de Ventas</h1>
        <div className="page-actions">
          <input
            className="btn"
            placeholder="Filtrar por cliente o producto…"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{ minWidth: 260 }}
          />
          <button className="btn" onClick={() => window.location.reload()}>Actualizar</button>
        </div>
      </div>

      {/* KPIs como cards con título y valor */}
      <div className="section kpis-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total ventas</div>
          <div className="kpi-value">{totalVentas}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total productos vendidos</div>
          <div className="kpi-value">{totalProductosVendidos}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Productos restantes</div>
          <div className="kpi-value">{productosRestantes}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ingresos totales</div>
          <div className="kpi-value">€{ingresosTotales.toFixed(2)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ticket medio por producto</div>
          <div className="kpi-value">€{ticketMedioPorProducto}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Producto más vendido</div>
          <div className="kpi-value">{productoMasVendido()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Producto más rentable</div>
          <div className="kpi-value">{productoMasRentable()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Cliente que más compra</div>
          <div className="kpi-value">{clienteMasComprador()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Cliente que más gasta</div>
          <div className="kpi-value">{clienteQueMasGasta()}</div>
        </div>
      </div>

      {/* Historial con ordenación y filtro */}
      <div className="section">
        <h2>Historial de ventas</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('cliente')} className="th-sort">Cliente {arrow('cliente')}</th>
                <th onClick={() => toggleSort('producto')} className="th-sort">Producto {arrow('producto')}</th>
                <th onClick={() => toggleSort('cantidad')} className="th-sort" style={{ textAlign: 'right' }}>
                  Cantidad {arrow('cantidad')}
                </th>
                <th onClick={() => toggleSort('total')} className="th-sort" style={{ textAlign: 'right' }}>
                  Total (€) {arrow('total')}
                </th>
                <th onClick={() => toggleSort('fecha')} className="th-sort">Fecha {arrow('fecha')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSorted.map((venta) => (
                <tr key={venta.id}>
                  <td>{venta.cliente}</td>
                  <td>{productoNombre(venta.id_vaper)}</td>
                  <td style={{ textAlign: 'right' }}>{venta.cantidad}</td>
                  <td style={{ textAlign: 'right' }}>{venta.total}</td>
                  <td>{new Date(venta.fecha).toLocaleString()}</td>
                </tr>
              ))}
              {filteredSorted.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 16, color: 'var(--muted)' }}>
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Estadisticas;
