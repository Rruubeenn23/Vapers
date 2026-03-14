import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { api } from '../lib/api';
import { toastSuccess, toastError } from '../lib/toast';
import '../styles/Productos.css';

const EMPTY_FORM = { nombre: '', imagen: '', stock: '' };

export default function Productos() {
  const [vapers, setVapers] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function loadData() {
    try {
      const [vapersData, lowData] = await Promise.all([
        api.get('/api/vapers'),
        api.get('/api/low-stock?threshold=3'),
      ]);
      setVapers(Array.isArray(vapersData) ? vapersData : []);
      setLowStock(lowData?.data ?? []);
    } catch {
      toastError('Error cargando productos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(vaper) {
    setEditTarget(vaper);
    setForm({
      nombre: vaper.nombre ?? '',
      imagen: vaper.imagen ?? '',
      stock: vaper.stock ?? '',
    });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.nombre.trim()) { toastError('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await api.put(`/api/vapers/${editTarget.id}`, form);
        toastSuccess('Producto actualizado');
      } else {
        await api.post('/vapers', form);
        toastSuccess('Producto creado');
      }
      setShowForm(false);
      loadData();
    } catch (err) {
      toastError(err.message || 'Error guardando producto');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.del(`/api/vapers/${deleteTarget.id}`);
      toastSuccess('Producto eliminado');
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      toastError(err.message || 'Error eliminando producto');
    }
  }

  function shareList() {
    const inStock = vapers.filter(v => v.stock > 0);
    const lines = inStock.map(v => `✅ ${v.nombre} · €${v.precio_unitario} · ${v.stock} uds`).join('\n');
    const text = `🛒 *Productos disponibles - Vapers de Rubén*\n\n${lines}\n\n_Contáctame para pedir_ 📲`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener');
  }

  function stockClass(stock) {
    if (stock <= 0) return 'stock-out';
    if (stock <= 3) return 'stock-low';
    return 'stock-ok';
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Productos</h1>
        <div className="page-actions">
          <button className="btn share-btn" onClick={shareList}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            Compartir lista
          </button>
        </div>
      </div>

      {/* Low stock banner */}
      {lowStock.length > 0 && (
        <div className="alert alert-warning low-stock-banner">
          ⚠️ Stock bajo: {lowStock.map(v => `${v.nombre} (${v.stock})`).join(' · ')}
        </div>
      )}

      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : vapers.length === 0 ? (
        <div className="empty-state">
          <p>No hay productos. Añade el primero.</p>
        </div>
      ) : (
        <div className="products-grid">
          {vapers.map(v => (
            <div key={v.id} className="product-card card">
              <div className="product-card-actions">
                <button className="btn btn-icon" title="Editar" onClick={() => openEdit(v)}>✏️</button>
                <button className="btn btn-icon danger" title="Eliminar" onClick={() => setDeleteTarget(v)}>🗑</button>
              </div>
              <div className="product-card-img">
                <img src={v.imagen} alt={v.nombre} loading="lazy" />
              </div>
              <div className="product-card-body">
                <div className="product-card-name">{v.nombre}</div>
                <div className="product-card-footer">
                  <span className="product-card-price">{v.precio_unitario != null ? `€${v.precio_unitario}` : ''}</span>
                  <span className={`stock-pill ${stockClass(v.stock)}`}>{v.stock} uds</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button className="fab" onClick={openCreate} aria-label="Añadir producto">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Create / Edit modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editTarget ? 'Editar producto' : 'Nuevo producto'}
        footer={
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button className="btn" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn primary" form="product-form" type="submit" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Guardando…' : editTarget ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        }
      >
        <form id="product-form" onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Nombre</label>
              <input
                type="text"
                value={form.nombre}
                onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Elfbar 600, Lost Mary…"
                required
              />
            </div>
            <div className="form-group">
              <label>Stock inicial</label>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={e => setForm(p => ({ ...p, stock: e.target.value }))}
                required
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>URL de imagen</label>
              <input
                type="url"
                value={form.imagen}
                onChange={e => setForm(p => ({ ...p, imagen: e.target.value }))}
                placeholder="https://…"
              />
              {form.imagen && (
                <img className="img-preview" src={form.imagen} alt="preview" onError={e => { e.target.style.display = 'none'; }} />
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar producto"
        footer={
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button className="btn" onClick={() => setDeleteTarget(null)}>Cancelar</button>
            <button className="btn danger" onClick={confirmDelete} style={{ flex: 1 }}>Eliminar</button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-muted)' }}>
          ¿Seguro que quieres eliminar <strong style={{ color: 'var(--text)' }}>{deleteTarget?.nombre}</strong>? Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
