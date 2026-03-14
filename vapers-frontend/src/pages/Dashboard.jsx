import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import '../styles/Dashboard.css';

function greeting() {
  const h = new Date().getHours();
  if (h < 13) return 'Buenos días';
  if (h < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function growthLabel(current, previous) {
  if (!previous) return null;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? '+' : '';
  const cls  = pct > 0 ? 'dash-growth-pos' : pct < 0 ? 'dash-growth-neg' : 'dash-growth-neu';
  return <span className={cls}>{sign}{pct.toFixed(0)}% vs semana ant.</span>;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [restock, setRestock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    try {
      const [dash, sug] = await Promise.all([
        api.get('/api/dashboard'),
        api.get('/api/restock-suggestions'),
      ]);
      if (dash.ok) setData(dash);
      setRestock(sug?.data ?? []);
      setLastRefresh(new Date());
    } catch {
      // fail silently — show stale data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh every 5 minutes
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  const today    = data?.today    ?? { ingresoTotal: 0, unidades: 0, numVentas: 0 };
  const thisWeek = data?.thisWeek ?? { ingresoTotal: 0, unidades: 0 };
  const lastWeek = data?.lastWeek ?? { ingresoTotal: 0, unidades: 0 };
  const lowStock = data?.lowStock ?? [];
  const recent   = data?.recentSales ?? [];

  return (
    <div className="page">
      {/* Greeting */}
      <div className="dash-greeting">
        <div className="dash-greeting-title">{greeting()}, Rubén 👋</div>
        <div className="dash-greeting-sub">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Refresh indicator */}
      {lastRefresh && (
        <div className="dash-refresh">
          Actualizado {timeAgo(lastRefresh)}
          <button onClick={load}>↻ Actualizar</button>
        </div>
      )}

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="alert alert-warning section">
          ⚠️ Stock bajo: {lowStock.map(v => `${v.nombre} (${v.stock})`).join(' · ')}
        </div>
      )}

      {/* Today hero */}
      <div className="section">
        <div className="section-title">Hoy</div>
        <div className="dash-today">
          <div className="dash-today-item">
            <div className="dash-today-label">Ingresos</div>
            <div className="dash-today-value money">€{today.ingresoTotal.toFixed(2)}</div>
          </div>
          <div className="dash-today-item">
            <div className="dash-today-label">Ventas</div>
            <div className="dash-today-value">{today.numVentas}</div>
          </div>
          <div className="dash-today-item">
            <div className="dash-today-label">Unidades</div>
            <div className="dash-today-value">{today.unidades}</div>
          </div>
          <div className="dash-today-item">
            <div className="dash-today-label">Stock total</div>
            <div className="dash-today-value">{data?.totalStock ?? '—'}</div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="section">
        <div className="section-title">Acciones rápidas</div>
        <div className="dash-quick">
          <Link to="/vender" className="dash-quick-btn">
            <span className="dash-quick-icon">🛒</span>
            Vender
          </Link>
          <Link to="/productos" className="dash-quick-btn">
            <span className="dash-quick-icon">📦</span>
            Productos
          </Link>
          <Link to="/chat" className="dash-quick-btn">
            <span className="dash-quick-icon">💬</span>
            Preguntar al chat
          </Link>
          <Link to="/estadisticas" className="dash-quick-btn">
            <span className="dash-quick-icon">📊</span>
            Ver estadísticas
          </Link>
        </div>
      </div>

      {/* Week comparison */}
      <div className="section">
        <div className="section-title">Esta semana vs semana anterior</div>
        <div className="dash-week">
          <div className="dash-week-card">
            <div className="dash-week-label">Ingresos 7 días</div>
            <div className="dash-week-value" style={{ color: 'var(--success)' }}>€{thisWeek.ingresoTotal.toFixed(2)}</div>
            <div className="dash-week-sub">{growthLabel(thisWeek.ingresoTotal, lastWeek.ingresoTotal)}</div>
          </div>
          <div className="dash-week-card">
            <div className="dash-week-label">Unidades 7 días</div>
            <div className="dash-week-value">{thisWeek.unidades}</div>
            <div className="dash-week-sub">{growthLabel(thisWeek.unidades, lastWeek.unidades)}</div>
          </div>
        </div>
      </div>

      {/* Recent sales */}
      {recent.length > 0 && (
        <div className="section">
          <div className="dash-section-header">
            <span className="section-title" style={{ margin: 0 }}>Actividad reciente</span>
            <Link to="/estadisticas">Ver todo →</Link>
          </div>
          <div className="dash-feed">
            {recent.map(v => (
              <div key={v.id} className="dash-feed-row">
                <div>
                  <div className="dash-feed-name">{v.cliente}</div>
                  <div className="dash-feed-product">{v.producto_nombre ?? '—'} · {v.cantidad} uds</div>
                </div>
                <div className="dash-feed-right">
                  <div className="dash-feed-amount">€{(v.total ?? 0).toFixed(2)}</div>
                  <div className="dash-feed-time">{timeAgo(v.fecha)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Restock suggestions */}
      {restock.length > 0 && (
        <div className="section">
          <div className="dash-section-header">
            <span className="section-title" style={{ margin: 0 }}>Reponer pronto</span>
            <Link to="/productos">Ver productos →</Link>
          </div>
          <div className="dash-restock">
            {restock.slice(0, 5).map(v => (
              <div key={v.id} className="dash-restock-row">
                <div>
                  <div className="dash-restock-name">{v.nombre}</div>
                  <div className="dash-restock-detail">Stock: {v.stock} · {v.totalSold} vendidos</div>
                </div>
                <div className="dash-restock-velocity">{v.velocity} ud/día</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && !data && (
        <div className="empty-state"><div className="spinner" /></div>
      )}
    </div>
  );
}
