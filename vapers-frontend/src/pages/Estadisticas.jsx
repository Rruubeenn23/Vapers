import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import '../styles/Estadisticas.css';

export default function Estadisticas() {
  const [ventas, setVentas] = useState([]);
  const [vapers, setVapers] = useState([]);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filterText, setFilterText] = useState('');
  const [sort, setSort] = useState({ key: 'fecha', dir: 'desc' });
  const [selectedOrder, setSelectedOrder] = useState('all');

  useEffect(() => {
    Promise.all([
      api.get('/api/ventas'),
      api.get('/api/vapers'),
      api.get('/api/weekly-summary?days=7'),
    ]).then(([v, vp, ws]) => {
      setVentas(Array.isArray(v) ? v : []);
      setVapers(Array.isArray(vp) ? vp : []);
      setWeeklySummary(ws?.ok ? ws : null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const nameMap = useMemo(() => Object.fromEntries(vapers.map(v => [v.id, v.nombre])), [vapers]);
  const nombre = (id) => nameMap[id] || id;

  const orderIds = useMemo(() => {
    const ids = ventas.map(v => v.order_id).filter(id => id != null);
    return [...new Set(ids)].sort((a, b) => a - b);
  }, [ventas]);

  const latestOrderId = useMemo(() => {
    const withOrder = ventas.filter(v => v.order_id != null);
    if (!withOrder.length) return null;
    const withFecha = withOrder.filter(v => v.fecha);
    if (withFecha.length)
      return withFecha.reduce((acc, v) => new Date(v.fecha) > new Date(acc.fecha) ? v : acc).order_id;
    return withOrder.reduce((max, v) => v.order_id > max ? v.order_id : max, withOrder[0].order_id);
  }, [ventas]);

  useEffect(() => {
    if (selectedOrder === 'all' && latestOrderId != null)
      setSelectedOrder(String(latestOrderId));
  }, [latestOrderId, selectedOrder]);

  const filteredVentas = useMemo(() => {
    if (selectedOrder === 'all') return ventas;
    return ventas.filter(v => Number(v.order_id) === Number(selectedOrder));
  }, [ventas, selectedOrder]);

  // KPIs
  const totalVentas = filteredVentas.length;
  const totalUnidades = filteredVentas.reduce((s, v) => s + (v.cantidad ?? 0), 0);
  const ingresoTotal = filteredVentas.reduce((s, v) => s + (v.total ?? 0), 0);
  const ticketMedio = totalUnidades ? (ingresoTotal / totalUnidades).toFixed(2) : '0.00';
  const stockTotal = vapers.reduce((s, v) => s + (v.stock ?? 0), 0);

  function topBy(fn) {
    const map = {};
    filteredVentas.forEach(v => {
      const key = fn(v);
      if (key) map[key] = (map[key] || 0) + (v.total ?? 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  }
  const topCliente = topBy(v => v.cliente);
  const topProducto = topBy(v => nombre(v.id_vaper));

  // Table
  const filteredSorted = useMemo(() => {
    const text = filterText.trim().toLowerCase();
    let rows = filteredVentas;
    if (text) rows = rows.filter(v =>
      (v.cliente || '').toLowerCase().includes(text) ||
      (nombre(v.id_vaper) || '').toLowerCase().includes(text)
    );
    return [...rows].sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      if (sort.key === 'producto') return dir * nombre(a.id_vaper).localeCompare(nombre(b.id_vaper));
      if (sort.key === 'cliente')  return dir * (a.cliente || '').localeCompare(b.cliente || '');
      if (sort.key === 'fecha')    return dir * (new Date(a.fecha) - new Date(b.fecha));
      return dir * ((a[sort.key] ?? 0) - (b[sort.key] ?? 0));
    });
  }, [filteredVentas, filterText, sort, nameMap]);

  const toggleSort = (key) => setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  const arrow = (key) => sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';

  const exportUrl = api.downloadUrl('/api/export/ventas.csv');

  return (
    <div className="page">
      <div className="page-header">
        <h1>Estadísticas</h1>
        <div className="page-actions">
          <a className="btn export-btn" href={exportUrl} download="ventas.csv">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            CSV
          </a>
        </div>
      </div>

      {/* Weekly snapshot */}
      {weeklySummary && (
        <div className="weekly-card section">
          <div className="weekly-card-title">Últimos 7 días</div>
          <div className="weekly-stats">
            <div>
              <div className="weekly-stat-label">Ingresos</div>
              <div className="weekly-stat-value" style={{ color: 'var(--success)' }}>€{weeklySummary.metrics?.ingresoTotal?.toFixed(2)}</div>
            </div>
            <div>
              <div className="weekly-stat-label">Unidades</div>
              <div className="weekly-stat-value">{weeklySummary.metrics?.unidades}</div>
            </div>
            <div>
              <div className="weekly-stat-label">Top cliente</div>
              <div className="weekly-stat-value" style={{ fontSize: 15 }}>{weeklySummary.topCliente?.nombre ?? '—'}</div>
            </div>
            <div>
              <div className="weekly-stat-label">Top producto</div>
              <div className="weekly-stat-value" style={{ fontSize: 15 }}>{weeklySummary.topProductos?.[0]?.producto ?? '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-grid section">
        <div className="kpi-card">
          <div className="kpi-label">Ventas</div>
          <div className="kpi-value">{totalVentas}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Unidades</div>
          <div className="kpi-value">{totalUnidades}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ingresos</div>
          <div className="kpi-value success">€{ingresoTotal.toFixed(2)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ticket medio</div>
          <div className="kpi-value">€{ticketMedio}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Stock total</div>
          <div className="kpi-value">{stockTotal} uds</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Top cliente</div>
          <div className="kpi-value accent" style={{ fontSize: 15 }}>{topCliente}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Top producto</div>
          <div className="kpi-value accent" style={{ fontSize: 15 }}>{topProducto}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="stats-controls">
        <select
          className="order-select"
          value={selectedOrder}
          onChange={e => setSelectedOrder(e.target.value)}
        >
          <option value="all">Todos los pedidos</option>
          {orderIds.map(id => (
            <option key={id} value={id}>Pedido {id}</option>
          ))}
        </select>
        <input
          style={{ flex: 1, minWidth: 160 }}
          placeholder="Filtrar cliente o producto…"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="section">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="th-sort" onClick={() => toggleSort('cliente')}>Cliente{arrow('cliente')}</th>
                <th className="th-sort" onClick={() => toggleSort('producto')}>Producto{arrow('producto')}</th>
                <th className="th-sort" onClick={() => toggleSort('cantidad')} style={{ textAlign: 'right' }}>Uds{arrow('cantidad')}</th>
                <th className="th-sort" onClick={() => toggleSort('total')} style={{ textAlign: 'right' }}>Total{arrow('total')}</th>
                <th className="th-sort" onClick={() => toggleSort('fecha')}>Fecha{arrow('fecha')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24 }}><div className="spinner" /></td></tr>
              ) : filteredSorted.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Sin resultados</td></tr>
              ) : filteredSorted.map(v => (
                <tr key={v.id}>
                  <td>{v.cliente}</td>
                  <td>{nombre(v.id_vaper)}</td>
                  <td style={{ textAlign: 'right' }}>{v.cantidad}</td>
                  <td style={{ textAlign: 'right' }}>€{(v.total ?? 0).toFixed(2)}</td>
                  <td>{v.fecha ? new Date(v.fecha).toLocaleDateString('es-ES') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
