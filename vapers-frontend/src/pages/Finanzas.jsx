import { useState, useEffect, useMemo } from 'react';
import Modal from '../components/Modal';
import { api } from '../lib/api';
import { toastSuccess, toastError } from '../lib/toast';
import '../styles/Finanzas.css';

export default function Finanzas() {
  const [tab, setTab] = useState('finanzas'); // 'finanzas' | 'compras'

  return (
    <div className="page">
      <div className="page-header">
        <h1>Finanzas</h1>
      </div>
      <div className="fin-tabs">
        <button className={`fin-tab ${tab === 'finanzas' ? 'active' : ''}`} onClick={() => setTab('finanzas')}>
          Ingresos / Gastos
        </button>
        <button className={`fin-tab ${tab === 'compras' ? 'active' : ''}`} onClick={() => setTab('compras')}>
          Reposiciones
        </button>
      </div>
      {tab === 'finanzas' ? <FinanzasTab /> : <ComprasTab />}
    </div>
  );
}

// ─── Finanzas tab ─────────────────────────────────────────────────────────────
function FinanzasTab() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titulo: '', precio: '', descripcion: '', tag: 'ingreso' });
  const [saving, setSaving] = useState(false);
  const [filterTag, setFilterTag] = useState('all');

  async function load() {
    try {
      const data = await api.get('/api/finanzas');
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      toastError('Error cargando finanzas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filterTag === 'all') return entries;
    return entries.filter(e => e.tag === filterTag);
  }, [entries, filterTag]);

  const totalIngresos = entries.filter(e => e.tag === 'ingreso').reduce((s, e) => s + (e.precio ?? 0), 0);
  const totalGastos   = entries.filter(e => e.tag === 'gasto').reduce((s, e) => s + (e.precio ?? 0), 0);
  const neto = totalIngresos - totalGastos;

  async function handleSave(e) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.precio) { toastError('Faltan campos'); return; }
    setSaving(true);
    try {
      await api.post('/api/finanzas', form);
      toastSuccess('Registro añadido');
      setShowForm(false);
      setForm({ titulo: '', precio: '', descripcion: '', tag: 'ingreso' });
      load();
    } catch (err) {
      toastError(err.message || 'Error guardando');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.del(`/api/finanzas/${id}`);
      toastSuccess('Eliminado');
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      toastError(err.message || 'Error eliminando');
    }
  }

  const exportUrl = api.downloadUrl('/api/export/finanzas.csv');

  return (
    <>
      {/* Summary */}
      <div className="fin-summary">
        <div className="fin-card income">
          <div className="fin-card-label">Ingresos</div>
          <div className="fin-card-value">€{totalIngresos.toFixed(2)}</div>
        </div>
        <div className="fin-card expense">
          <div className="fin-card-label">Gastos</div>
          <div className="fin-card-value">€{totalGastos.toFixed(2)}</div>
        </div>
        <div className="fin-card net">
          <div className="fin-card-label">Beneficio neto</div>
          <div className="fin-card-value">€{neto.toFixed(2)}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="page-actions" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <select style={{ width: 'auto' }} value={filterTag} onChange={e => setFilterTag(e.target.value)}>
          <option value="all">Todos</option>
          <option value="ingreso">Ingresos</option>
          <option value="gasto">Gastos</option>
        </select>
        <button className="btn" onClick={() => setShowForm(true)}>+ Añadir</button>
        <a className="btn" href={exportUrl} download="finanzas.csv">CSV</a>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Título</th>
              <th style={{ textAlign: 'right' }}>Importe</th>
              <th>Tag</th>
              <th>Mes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24 }}><div className="spinner" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Sin registros</td></tr>
            ) : filtered.map(e => (
              <tr key={e.id} className={e.tag === 'ingreso' ? 'row-income' : 'row-expense'}>
                <td>
                  <div>{e.titulo}</div>
                  {e.descripcion && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.descripcion}</div>}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: e.tag === 'ingreso' ? 'var(--success)' : 'var(--danger)' }}>
                  {e.tag === 'ingreso' ? '+' : '−'}€{(e.precio ?? 0).toFixed(2)}
                </td>
                <td>
                  <span className={`badge ${e.tag === 'ingreso' ? 'badge-success' : 'badge-danger'}`}>{e.tag}</span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{e.mes}</td>
                <td>
                  <button className="btn btn-icon" style={{ fontSize: 14 }} onClick={() => handleDelete(e.id)}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Nuevo registro"
        footer={
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button className="btn" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn primary" form="fin-form" type="submit" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Guardando…' : 'Añadir'}
            </button>
          </div>
        }
      >
        <form id="fin-form" onSubmit={handleSave}>
          {/* Tag selector */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Tipo</label>
            <div className="tag-select">
              <button
                type="button"
                className={`tag-btn ${form.tag === 'ingreso' ? 'active-income' : ''}`}
                onClick={() => setForm(p => ({ ...p, tag: 'ingreso' }))}
              >
                + Ingreso
              </button>
              <button
                type="button"
                className={`tag-btn ${form.tag === 'gasto' ? 'active-expense' : ''}`}
                onClick={() => setForm(p => ({ ...p, tag: 'gasto' }))}
              >
                − Gasto
              </button>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Título</label>
              <input
                type="text"
                value={form.titulo}
                onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                placeholder="Ej: Venta al por mayor, Compra caja…"
                required
              />
            </div>
            <div className="form-group">
              <label>Importe (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.precio}
                onChange={e => setForm(p => ({ ...p, precio: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Descripción (opcional)</label>
              <input
                type="text"
                value={form.descripcion}
                onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              />
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ─── Compras (restock) tab ────────────────────────────────────────────────────
function ComprasTab() {
  const [compras, setCompras] = useState([]);
  const [vapers, setVapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id_vaper: '', cantidad: '', precio_unitario: '', fecha: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [c, v] = await Promise.all([api.get('/api/compras'), api.get('/api/vapers')]);
      setCompras(Array.isArray(c) ? c : []);
      setVapers(Array.isArray(v) ? v : []);
    } catch {
      toastError('Error cargando reposiciones');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totalInvertido = compras.reduce((s, c) => s + (c.total ?? 0), 0);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.id_vaper || !form.cantidad || !form.precio_unitario) { toastError('Faltan campos'); return; }
    const total = parseFloat(form.cantidad) * parseFloat(form.precio_unitario);
    setSaving(true);
    try {
      await api.post('/compras', { ...form, total, cantidad: parseInt(form.cantidad), precio_unitario: parseFloat(form.precio_unitario) });
      toastSuccess('Reposición registrada');
      setShowForm(false);
      setForm({ id_vaper: '', cantidad: '', precio_unitario: '', fecha: new Date().toISOString().slice(0, 10) });
      load();
    } catch (err) {
      toastError(err.message || 'Error guardando');
    } finally {
      setSaving(false);
    }
  }

  const exportUrl = api.downloadUrl('/api/export/compras.csv');

  return (
    <>
      <div className="fin-summary">
        <div className="fin-card expense" style={{ gridColumn: '1 / -1' }}>
          <div className="fin-card-label">Total invertido en stock</div>
          <div className="fin-card-value">€{totalInvertido.toFixed(2)}</div>
        </div>
      </div>

      <div className="page-actions" style={{ marginBottom: 16 }}>
        <button className="btn" onClick={() => setShowForm(true)}>+ Registrar reposición</button>
        <a className="btn" href={exportUrl} download="compras.csv">CSV</a>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Producto</th>
              <th style={{ textAlign: 'right' }}>Cantidad</th>
              <th style={{ textAlign: 'right' }}>Precio u.</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24 }}><div className="spinner" /></td></tr>
            ) : compras.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Sin reposiciones</td></tr>
            ) : compras.map(c => (
              <tr key={c.id}>
                <td>{c.producto_nombre ?? c.id_vaper}</td>
                <td style={{ textAlign: 'right' }}>{c.cantidad}</td>
                <td style={{ textAlign: 'right' }}>€{(c.precio_unitario ?? 0).toFixed(2)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>€{(c.total ?? 0).toFixed(2)}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{c.fecha ? new Date(c.fecha).toLocaleDateString('es-ES') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Registrar reposición"
        footer={
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button className="btn" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn primary" form="compra-form" type="submit" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Guardando…' : 'Registrar'}
            </button>
          </div>
        }
      >
        <form id="compra-form" onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Producto</label>
              <select value={form.id_vaper} onChange={e => setForm(p => ({ ...p, id_vaper: e.target.value }))} required>
                <option value="">Selecciona un producto…</option>
                {vapers.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Cantidad</label>
              <input type="number" min="1" value={form.cantidad} onChange={e => setForm(p => ({ ...p, cantidad: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Precio unitario (€)</label>
              <input type="number" min="0" step="0.01" value={form.precio_unitario} onChange={e => setForm(p => ({ ...p, precio_unitario: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Fecha</label>
              <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} />
            </div>
            {form.cantidad && form.precio_unitario && (
              <div className="form-group">
                <label>Total</label>
                <input type="text" readOnly value={`€${(parseFloat(form.cantidad || 0) * parseFloat(form.precio_unitario || 0)).toFixed(2)}`} />
              </div>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
}
