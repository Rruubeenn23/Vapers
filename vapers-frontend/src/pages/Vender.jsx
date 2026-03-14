import { useState, useEffect, useMemo } from 'react';
import Modal from '../components/Modal';
import { api } from '../lib/api';
import { toastSuccess, toastError } from '../lib/toast';
import '../styles/Vender.css';

export default function Vender() {
  const [vapers, setVapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState('stock-desc');
  const [selectedVaper, setSelectedVaper] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [restockHint, setRestockHint] = useState(null);

  const [form, setForm] = useState({
    cantidad: 1,
    precio_unitario: '',
    cliente: '',
    order_id: '',
    total: '',
  });

  useEffect(() => {
    Promise.all([
      api.get('/api/vapers'),
      api.get('/api/next-order-id'),
    ]).then(([vapersData, orderData]) => {
      setVapers(Array.isArray(vapersData) ? vapersData : []);
      setForm(prev => ({ ...prev, order_id: orderData?.nextOrderId ?? 1 }));
    }).catch(() => {
      toastError('Error cargando productos');
    }).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const text = filterText.trim().toLowerCase();
    let list = [...vapers];
    if (text) list = list.filter(v => (v.nombre || '').toLowerCase().includes(text));
    if (sortBy === 'nombre-asc') list.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    else if (sortBy === 'stock-desc') list.sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0));
    else if (sortBy === 'stock-asc') list.sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
    return list;
  }, [vapers, sortBy, filterText]);

  function openModal(vaper) {
    const pvp = vaper.precio_unitario || 0;
    setSelectedVaper(vaper);
    setRestockHint(null);
    setForm(prev => ({
      ...prev,
      cantidad: 1,
      precio_unitario: pvp,
      cliente: '',
      total: pvp.toFixed(2),
    }));
    setShowModal(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev };
      if (name === 'cantidad') next.cantidad = parseInt(value || 1, 10);
      else if (name === 'precio_unitario') next.precio_unitario = parseFloat(value || 0);
      else if (name === 'order_id') next.order_id = parseInt(value || 1, 10);
      else next[name] = value;
      next.total = ((next.precio_unitario || 0) * (next.cantidad || 0)).toFixed(2);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedVaper) return;

    if (form.cantidad > (selectedVaper.stock ?? 0)) {
      toastError('No hay suficiente stock disponible');
      return;
    }
    if (!form.cliente?.trim()) {
      toastError('Introduce el nombre del cliente');
      return;
    }
    if (!form.order_id || form.order_id < 1) {
      toastError('El número de pedido debe ser mayor a 0');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/ventas', {
        id_vaper: selectedVaper.id,
        cantidad: form.cantidad,
        precio_unitario: form.precio_unitario,
        cliente: form.cliente.trim(),
        order_id: form.order_id,
      });

      const newStock = (selectedVaper.stock ?? 0) - form.cantidad;
      setVapers(prev => prev.map(v =>
        v.id === selectedVaper.id ? { ...v, stock: newStock } : v
      ));

      toastSuccess('Venta registrada');
      setShowModal(false);

      if (newStock <= 3) {
        setRestockHint(`⚠️ ${selectedVaper.nombre} tiene solo ${newStock} uds. en stock`);
        setTimeout(() => setRestockHint(null), 6000);
      }
    } catch (err) {
      toastError(err.message || 'Error al registrar la venta');
    } finally {
      setSubmitting(false);
    }
  }

  function stockClass(stock) {
    if (stock <= 0) return 'stock-out';
    if (stock <= 3) return 'stock-low';
    return 'stock-ok';
  }
  function stockLabel(stock) {
    if (stock <= 0) return 'Sin stock';
    return `${stock} uds`;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Vender</h1>
      </div>

      {restockHint && (
        <div className="restock-hint" style={{ marginBottom: 14 }}>{restockHint}</div>
      )}

      {/* Controls */}
      <div className="vender-controls">
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            placeholder="Buscar producto…"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 'auto', flex: 'none' }}>
          <option value="nombre-asc">Nombre A→Z</option>
          <option value="stock-desc">Stock ↓</option>
          <option value="stock-asc">Stock ↑</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : (
        <div className="catalog-grid">
          {filtered.map(v => (
            <div
              key={v.id}
              className={`catalog-card card ${v.stock <= 0 ? 'no-stock' : ''}`}
              onClick={() => v.stock > 0 && openModal(v)}
              style={{ cursor: v.stock <= 0 ? 'not-allowed' : 'pointer' }}
            >
              <div className="card-img-wrap">
                <img src={v.imagen} alt={v.nombre} loading="lazy" />
              </div>
              <div className="card-body">
                <div className="card-name">{v.nombre}</div>
                <div className="card-meta">
                  <span className="card-price">€{v.precio_unitario ?? '—'}</span>
                  <span className={`stock-pill ${stockClass(v.stock)}`}>{stockLabel(v.stock)}</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <p>No se encontraron productos</p>
            </div>
          )}
        </div>
      )}

      {/* Sale modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={`Vender ${selectedVaper?.nombre ?? ''}`}
        footer={
          <div className="modal-actions">
            <button className="btn" type="button" onClick={() => setShowModal(false)}>Cancelar</button>
            <button className="btn primary" type="submit" form="sale-form" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Confirmar venta'}
            </button>
          </div>
        }
      >
        {selectedVaper && (
          <form id="sale-form" onSubmit={handleSubmit}>
            <div className="sale-preview">
              <img src={selectedVaper.imagen} alt={selectedVaper.nombre} />
              <div>
                <div className="sale-preview-name">{selectedVaper.nombre}</div>
                <div className="sale-preview-stock">Stock disponible: {selectedVaper.stock} uds</div>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Nº Pedido</label>
                <input
                  type="number"
                  name="order_id"
                  min="1"
                  inputMode="numeric"
                  value={form.order_id}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Cliente</label>
                <input
                  type="text"
                  name="cliente"
                  value={form.cliente}
                  onChange={handleChange}
                  placeholder="Nombre del cliente"
                  required
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label>Cantidad</label>
                <input
                  type="number"
                  name="cantidad"
                  min="1"
                  max={selectedVaper.stock}
                  value={form.cantidad}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Precio unitario (€)</label>
                <input
                  type="number"
                  name="precio_unitario"
                  min="0"
                  step="0.01"
                  value={form.precio_unitario}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="total-row">
              <span className="total-label">Total</span>
              <span className="total-value">€{form.total}</span>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
