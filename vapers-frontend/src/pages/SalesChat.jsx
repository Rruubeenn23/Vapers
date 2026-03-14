import { useEffect, useRef, useState } from 'react';
import AutoTextarea from '../components/AutoTextArea';
import { api } from '../lib/api';
import { toastSuccess, toastError } from '../lib/toast';
import '../styles/SalesChat.css';

export default function SalesChat() {
  const [prompt, setPrompt] = useState('');
  const [days, setDays] = useState(7);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mailLoading, setMailLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function onAsk(e) {
    e?.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMsg = { role: 'user', text: prompt.trim() };
    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    try {
      const data = await api.post('/api/ventas-chat', { prompt: userMsg.text, days });
      setMessages(prev => [...prev, { role: 'ai', data }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', error: err.message || 'Error desconocido' }]);
    } finally {
      setLoading(false);
    }
  }

  async function sendEmail() {
    setMailLoading(true);
    try {
      await api.post('/api/resumen-7dias-email', { days: 7 });
      toastSuccess('Email enviado correctamente');
    } catch (err) {
      toastError('No se pudo enviar el email: ' + err.message);
    } finally {
      setMailLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      onAsk(e);
    } else if (e.key === 'Escape') {
      setPrompt('');
    }
  }

  return (
    <div className="chat-layout">
      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-hint">
            <strong>Sales Chat</strong>
            <p>Pregunta sobre tus ventas, stock o finanzas.</p>
            <p style={{ marginTop: 12 }}>
              {['¿Quién ha comprado más?', '¿Qué producto se vende más?', '¿Cuál es el ingreso de esta semana?'].map(s => (
                <button key={s} className="btn ghost" style={{ margin: '4px 4px 0 0', fontSize: 13 }} onClick={() => setPrompt(s)}>
                  {s}
                </button>
              ))}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`msg-row ${msg.role}`}>
            {msg.role === 'user' ? (
              <div className="bubble">{msg.text}</div>
            ) : msg.error ? (
              <div className="bubble">
                <div className="alert alert-danger">{msg.error}</div>
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
            <div className="bubble" style={{ padding: '14px 20px' }}>
              <div className="spinner" style={{ width: 18, height: 18 }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Actions bar */}
      <div className="chat-actions">
        <button
          className="btn"
          style={{ fontSize: 13 }}
          onClick={() => setDays(d => d === 7 ? 30 : 7)}
        >
          Rango: {days} días
        </button>
        <button
          className="btn"
          style={{ fontSize: 13 }}
          onClick={sendEmail}
          disabled={mailLoading}
        >
          {mailLoading ? 'Enviando…' : 'Enviar resumen 7d'}
        </button>
      </div>

      {/* Input bar */}
      <form onSubmit={onAsk} className="chat-inputbar">
        <AutoTextarea
          value={prompt}
          onChange={setPrompt}
          onKeyDown={handleKeyDown}
          minRows={1}
          maxRows={6}
          className="chat-textarea"
          placeholder="Escribe tu pregunta…"
        />
        <button type="submit" className="btn primary send-btn" disabled={loading || !prompt.trim()}>
          Enviar
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

      {data.metrics && (
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
