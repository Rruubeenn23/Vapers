import { useState, useEffect, useMemo } from 'react';
import '../styles/Vender.css';

function Vender() {
  const [vapers, setVapers] = useState([]);
  const [selectedVaper, setSelectedVaper] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Ordenación + Filtro
  const [sortBy, setSortBy] = useState('nombre-asc'); // nombre-asc | stock-desc | stock-asc
  const [filterText, setFilterText] = useState('');

  const [form, setForm] = useState({
    cantidad: '',
    precio_unitario: '',
    cliente: '',
    order_id: 1, // Default order_id set to 2 as number
    total: '',
  });

  useEffect(() => {
    const fetchVapers = async () => {
      try {
        const res = await fetch('https://api-vapers.onrender.com/');
        const data = await res.json();
        setVapers(data || []);
      } catch (error) {
        console.error('Error fetching vapers:', error);
      }
    };
    fetchVapers();
  }, []);

  const filteredSortedVapers = useMemo(() => {
    const text = filterText.trim().toLowerCase();
    let list = [...vapers];

    // Filtro por nombre
    if (text) {
      list = list.filter((v) => (v.nombre || '').toLowerCase().includes(text));
    }

    // Ordenación
    if (sortBy === 'nombre-asc') {
      list.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    } else if (sortBy === 'stock-desc') {
      list.sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0));
    } else if (sortBy === 'stock-asc') {
      list.sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
    }

    return list;
  }, [vapers, sortBy, filterText]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev };
      if (name === 'cantidad') next.cantidad = parseInt(value || 0, 10);
      else if (name === 'precio_unitario') next.precio_unitario = parseFloat(value || 0);
      else if (name === 'order_id') next.order_id = parseInt(value || 0, 10); // Parse as number immediately
      else next[name] = value;

      next.total = Number((next.precio_unitario || 0) * (next.cantidad || 0)).toFixed(2);
      return next;
    });
  };

  const openModal = (vaper) => {
    setSelectedVaper(vaper);
    const pvp = vaper.precio_unitario || 0;
    const cantidad = 1;
    setForm({
      cantidad,
      precio_unitario: pvp,
      cliente: '',
      order_id: 1, // Default order_id set to 2 as number
      total: Number(pvp * cantidad).toFixed(2),
    });
    setShowModal(true);
  };

  const handleSubmitVenta = async (e) => {
    e.preventDefault();
    if (!selectedVaper) return;

    if (form.cantidad > (selectedVaper.stock ?? 0)) {
      alert('No hay suficiente stock disponible.');
      return;
    }

    // Validate order_id is a number
    if (form.order_id < 1) {
      alert('El número de pedido debe ser mayor a 0');
      return;
    }

    const requestBody = {
      id_vaper: selectedVaper.id,
      cantidad: form.cantidad,
      precio_unitario: form.precio_unitario,
      cliente: form.cliente.trim(),
      order_id: form.order_id
    };
    
    console.log('Sending request with:', JSON.stringify(requestBody, null, 2));

    try {
      const res = await fetch('https://api-vapers.onrender.com/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error ${res.status}: ${text}`);
      }

      alert('Venta registrada correctamente');
      setShowModal(false);

      // Actualizar stock en memoria
      setVapers((prev) =>
        prev.map((v) =>
          v.id === selectedVaper.id
            ? { ...v, stock: (v.stock ?? 0) - form.cantidad }
            : v
        )
      );
    } catch (error) {
      console.error('Error registrando venta:', error);
      alert('Hubo un error al registrar la venta.');
    }
  };

  return (
    <div className="container vender-page">
      <div className="page-header">
        <h1 className="page-title">Vender Vapers</h1>
        <div className="page-actions">
          {/* Buscador */}
          <input
            className="btn"
            placeholder="Buscar producto…"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{ minWidth: 200 }}
          />
          <select
            className="btn"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            title="Ordenar catálogo"
          >
            <option value="nombre-asc">Nombre (A→Z)</option>
            <option value="stock-desc">Stock (mayor primero)</option>
            <option value="stock-asc">Stock (menor primero)</option>
          </select>
          <button className="btn" onClick={() => window.location.reload()}>
            Refrescar
          </button>
        </div>
      </div>

      {/* GRID DE CATÁLOGO */}
      <div className="catalog-grid">
        {filteredSortedVapers.map((vaper) => (
          <div key={vaper.id} className="catalog-card card" onClick={() => openModal(vaper)}>
            <div className="card-media">
              <img src={vaper.imagen} alt={vaper.nombre} loading="lazy" />
              <span className={`stock-badge ${vaper.stock > 0 ? 'ok' : 'ko'}`}>
                {vaper.stock > 0 ? `Stock: ${vaper.stock}` : 'Sin stock'}
              </span>
            </div>
            <div className="card-body">
              <div className="card-title">{vaper.nombre}</div>
              <div className="card-meta">
                {vaper.precio_unitario != null && (
                  <span className="tag">PVP: {vaper.precio_unitario} €</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredSortedVapers.length === 0 && (
          <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--muted)' }}>
            No se encontraron productos
          </p>
        )}
      </div>

      {/* MODAL DE VENTA */}
      {showModal && (
        <>
          <div className="scrim" onClick={() => setShowModal(false)} />
          <div className="modal card">
            <div className="modal-head">
              <h3>Vender {selectedVaper?.nombre}</h3>
            </div>
            <form onSubmit={handleSubmitVenta} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Número de Pedido</label>
                  <input
                    type="number"
                    name="order_id"
                    min="1"
                    inputMode="numeric"
                    value="1"
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Cliente</label>
                  <input
                    type="text"
                    name="cliente"
                    value={form.cliente}
                    onChange={handleInputChange}
                    required
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div className="form-group">
                  <label>Cantidad</label>
                  <input
                    type="number"
                    name="cantidad"
                    min="1"
                    max={selectedVaper?.stock || 1}
                    value={form.cantidad}
                    onChange={handleInputChange}
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
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Total (€)</label>
                  <input type="text" value={form.total} readOnly />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn primary">
                  Confirmar Venta
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export default Vender;
