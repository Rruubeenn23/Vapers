import { useEffect, useRef, useState } from 'react';
import AutoTextarea from '../components/AutoTextArea';
import { api } from '../lib/api';
import { toastSuccess, toastError } from '../lib/toast';
import '../styles/SalesChat.css';

const SESSION_KEY = 'vapers_chat_messages';
const BRIEFING_KEY = 'vapers_chat_briefing_date';

const QUICK_QUERIES = [
  { label: '📊 Ventas hoy', query: '¿Cuánto he vendido hoy y cuántas unidades?' },
  { label: '📅 Resumen semana', query: 'Dame el resumen completo de ventas de los últimos 7 días: ingresos, top cliente y top producto.' },
  { label: '🏆 Mejor cliente', query: '¿Quién es mi mejor cliente por gasto total?' },
  { label: '🔝 Top productos', query: '¿Cuáles son mis productos más vendidos?' },
  { label: '📦 Stock crítico', query: '¿Qué productos necesito reponer urgentemente según las ventas?' },
  { label: '📈 Comparativa', query: '¿Cómo han sido las ventas de esta semana comparado con la semana anterior?' },
  { label: '💡 Consejo', query: '¿Qué producto debería promocionar más esta semana para maximizar ingresos?' },
  { label: '👥 Clientes activos', query: '¿Cuántos clientes distintos han comprado en los últimos 7 días?' },
];

function loadMessages() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveMessages(msgs) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(msgs.slice(-40))); } catch {}
}

export default function SalesChat() {
  const [prompt, setPrompt] = useState('');
  const [days, setDays] = useState(7);
  const [messages, setMessages] = useState(() => loadMessages());
  const [loading, setLoading] = useState(false);
  const [mailLoading, setMailLoading] = useState(false);
  const [showQueries, setShowQueries] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Persist messages to sessionStorage
  useEffect(() => { saveMessages(messages); }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto morning briefing — once per day on first open
  useEffect(() => {
    const today = new Date().toDateString();
    const lastBriefing = localStorage.getItem(BRIEFING_KEY);
    if (lastBriefing === today) return;

    const h = new Date().getHours();
    if (h >= 8 && h <= 23) {
      // delay slightly so UI renders first
      const id = setTimeout(() => {
        localStorage.setItem(BRIEFING_KEY, today);
        askQuery('Dame un briefing rápido del negocio: ventas de hoy, mejor cliente de la semana y cualquier producto con stock bajo.');
      }, 600);
      return () => clearTimeout(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function askQuery(text) {
    if (!text?.trim() || loading) return;
    const userMsg = { role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setShowQueries(false);
    setLoading(true);
    try {
      const data = await api.post('/api/ventas-chat', { prompt: text.trim(), days });
      setMessages(prev => [...prev, { role: 'ai', data }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', error: err.message || 'Error desconocido' }]);
    } finally {
      setLoading(false);
    }
  }

  async function onAsk(e) {
    e?.preventDefault();
    await askQuery(prompt);
  }

  async function sendEmail() {
    setMailLoading(true);
    try {
      await api.post('/api/resumen-7dias-email', { days: 7 });
      toastSuccess('Email enviado correctamente');
    } catch (err) {
      toastError('No se pudo enviar: ' + err.message);
    } finally {
      setMailLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
    sessionStorage.removeItem(SESSION_KEY);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      onAsk(e);
    } else if (e.key === 'Escape') {
      setPrompt('');
      setShowQueries(false);
    }
  }

  return (
    <div className="chat-layout">
      {/* Messages area */}
      <div className="chat-messages">
        {messages.length === 0 && !loading && (
          <div className="chat-hint">
            <div className="chat-hint-title">Sales Chat ✨</div>
            <p>Tu asistente personal para el negocio. Pregunta lo que quieras sobre ventas, stock y clientes.</p>
            <p className="chat-hint-sub">Cargando briefing del día…</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`msg-row ${msg.role}`}>
            {msg.role === 'user' ? (
              <div className="bubble">{msg.text}</div>
            ) : msg.error ? (
              <div className="bubble">
                <div className="alert alert-danger" style={{ fontSize: 13 }}>{msg.error}</div>
              </div>
            ) : (
              <div className="bubble">
                <AIResponse data={msg.data} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="msg-row ai">
            <div className="bubble chat-typing">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick queries panel */}
      {showQueries && (
        <div className="quick-queries">
          <div className="quick-queries-title">Consultas rápidas</div>
          <div className="quick-queries-grid">
            {QUICK_QUERIES.map(q => (
              <button key={q.query} className="quick-query-btn" onClick={() => askQuery(q.query)}>
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="chat-actions">
        <button
          className={`btn ${showQueries ? 'primary' : ''}`}
          style={{ fontSize: 13 }}
          onClick={() => setShowQueries(v => !v)}
        >
          ⚡ Consultas
        </button>
        <div className="days-selector">
          {[7, 30].map(d => (
            <button
              key={d}
              className={`days-btn ${days === d ? 'active' : ''}`}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
        <button className="btn" style={{ fontSize: 13 }} onClick={sendEmail} disabled={mailLoading}>
          {mailLoading ? '…' : '✉️ Email'}
        </button>
        {messages.length > 0 && (
          <button className="btn ghost" style={{ fontSize: 13 }} onClick={clearChat}>
            Limpiar
          </button>
        )}
      </div>

      {/* Input bar */}
      <form onSubmit={onAsk} className="chat-inputbar">
        <AutoTextarea
          ref={inputRef}
          value={prompt}
          onChange={setPrompt}
          onKeyDown={handleKeyDown}
          minRows={1}
          maxRows={5}
          className="chat-textarea"
          placeholder="Pregunta sobre ventas, stock, clientes…"
        />
        <button type="submit" className="btn primary send-btn" disabled={loading || !prompt.trim()}>
          ↑
        </button>
      </form>
      <div className="kbd-hint">
        <span className="kbd">Enter</span> enviar · <span className="kbd">Shift+Enter</span> nueva línea
      </div>
    </div>
  );
}

function AIResponse({ data }) {
  if (!data) return null;
  return (
    <div>
      {data.answer && <div className="resp-answer">{data.answer}</div>}

      {data.metrics && (data.metrics.numVentas > 0 || data.metrics.ingresoTotal > 0) && (
        <div className="resp-metrics">
          <div className="resp-metric">
            <div className="resp-metric-label">Ingresos</div>
            <div className="resp-metric-value" style={{ color: 'var(--success)' }}>€{(data.metrics.ingresoTotal || 0).toFixed(2)}</div>
          </div>
          <div className="resp-metric">
            <div className="resp-metric-label">Ventas</div>
            <div className="resp-metric-value">{data.metrics.numVentas ?? 0}</div>
          </div>
          <div className="resp-metric">
            <div className="resp-metric-label">Unidades</div>
            <div className="resp-metric-value">{data.metrics.unidades ?? 0}</div>
          </div>
          <div className="resp-metric">
            <div className="resp-metric-label">Ticket</div>
            <div className="resp-metric-value">€{(data.metrics.ticketMedio || 0).toFixed(2)}</div>
          </div>
        </div>
      )}

      {data.topCliente && (
        <div style={{ marginTop: 10 }}>
          <div className="resp-section-title">Top cliente</div>
          <div style={{ fontSize: 14 }}>
            <strong>{data.topCliente.nombre}</strong> — €{(data.topCliente.gasto || 0).toFixed(2)}
          </div>
        </div>
      )}

      {data.topProductos?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className="resp-section-title">Top productos</div>
          <div className="table-wrap" style={{ marginTop: 6 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style={{ textAlign: 'right' }}>Uds</th>
                  <th style={{ textAlign: 'right' }}>€</th>
                </tr>
              </thead>
              <tbody>
                {data.topProductos.map((p, i) => (
                  <tr key={i}>
                    <td>{p.producto}</td>
                    <td style={{ textAlign: 'right' }}>{p.unidades}</td>
                    <td style={{ textAlign: 'right' }}>€{(p.ingresos || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
