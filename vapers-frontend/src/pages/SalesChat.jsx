// src/pages/SalesChat.jsx
import React, { useEffect, useRef, useState } from 'react';
import { chatVentas } from '../lib/chatVentas';
import AutoTextarea from '../components/AutoTextArea';
import '../styles/SalesChat.css';

export default function SalesChat() {
  // Estado original (sin cambios de lógica)
  const [prompt, setPrompt] = useState('¿Quién ha comprado más?');
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null);
  const [error, setError] = useState(null);

  // Envío de email (igual que antes)
  const [mailLoading, setMailLoading] = useState(false);
  const [mailMsg, setMailMsg] = useState(null);
  const [mailErr, setMailErr] = useState(null);

  // Mantengo tu URL tal cual
  const EMAIL_URL = 'https://n8n-cjps.onrender.com/webhook/resumen-7dias-email';

  // Ref para auto-scroll de mensajes/resultado
  const listRef = useRef(null);

  async function onAsk(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResp(null);
    try {
      const data = await chatVentas({ prompt, days });
      if (!data?.ok) setError(data?.error || 'Error desconocido');
      setResp(data);
    } catch (err) {
      setError(err?.message || 'Error de red');
    } finally {
      setLoading(false);
    }
  }

  async function sendResumenEmail() {
    setMailLoading(true);
    setMailMsg(null);
    setMailErr(null);
    try {
      const body = {
        toEmail: 'rubencereceda23@gmail.com',
        subject: 'Resumen ventas últimos 7 días',
        // from: new Date(Date.now() - 7*24*60*60*1000).toISOString(),
        // to: new Date().toISOString(),
      };

      const r = await fetch(EMAIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok || data.ok === false) {
        throw new Error(data?.error || `HTTP ${r.status}`);
      }
      setMailMsg('✅ Email enviado correctamente');
    } catch (e) {
      setMailErr(`⚠️ No se pudo enviar el email: ${e.message}`);
    } finally {
      setMailLoading(false);
    }
  }

  // Auto-scroll al actualizar el resultado
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [resp]);

  // Atajos de teclado para el textarea:
  // Enter -> enviar; Ctrl/Cmd+Enter -> salto de línea; Esc -> limpiar
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const el = e.target;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const next = prompt.slice(0, start) + '\n' + prompt.slice(end);
        setPrompt(next);
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = start + 1;
        });
        return;
      }
      e.preventDefault();
      if (!loading) onAsk(e);
    } else if (e.key === 'Escape') {
      setPrompt('');
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Sales Chat</h1>
        <div className="page-actions">
          <button
            type="button"
            className="btn"
            onClick={() => setPrompt('¿Quién ha comprado más?')}
            title="Restaurar ejemplo"
          >
            Sugerencia
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setDays((d) => (d === 7 ? 30 : 7))}
            title="Alternar 7/30 días"
          >
            Rango: {days} días
          </button>
          <button
            type="button"
            className="btn"
            disabled={mailLoading}
            onClick={sendResumenEmail}
            title="Enviar resumen de los últimos 7 días al correo"
          >
            {mailLoading ? 'Enviando…' : 'Enviar resumen 7 días'}
          </button>
        </div>
      </div>

      <div className="section card" style={{ padding: 16 }}>
        <form onSubmit={onAsk} className="chat-wrap" role="search">
          <div className="chat-messages" ref={listRef} aria-live="polite">
            {!resp && !error && (
              <div className="help-hint">
                Haz una pregunta sobre tus ventas (por ejemplo: <em>“¿Quién ha comprado más?”</em>).
              </div>
            )}

            {error && (
              <div className="msg">
                <div className="bubble" style={{ borderColor: 'rgba(239,68,68,.45)', background: 'rgba(239,68,68,.12)' }}>
                  {error}
                </div>
              </div>
            )}

            {resp && (
              <div className="msg">
                <div className="bubble" style={{ width: '100%' }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div className="badge">Resultado {resp.intent ? `— ${resp.intent}` : ''}</div>
                    <div><strong>Respuesta:</strong> {resp.answer || '(sin texto)'}</div>

                    {resp.period && (
                      <div>
                        <strong>Periodo:</strong>{' '}
                        {new Date(resp.period.from).toLocaleString('es-ES')} —{' '}
                        {new Date(resp.period.to).toLocaleString('es-ES')}
                      </div>
                    )}

                    {resp.metrics && (
                      <ul style={{ margin: 0 }}>
                        <li>Ingreso total: {Number(resp.metrics.ingresoTotal || 0).toFixed(2)} €</li>
                        <li>Nº ventas: {resp.metrics.numVentas}</li>
                        <li>Unidades: {resp.metrics.unidades}</li>
                        <li>Ticket medio: {Number(resp.metrics.ticketMedio || 0).toFixed(2)} €</li>
                      </ul>
                    )}

                    {resp.topCliente && (
                      <div>
                        <strong>Top cliente:</strong> {resp.topCliente.nombre} —{' '}
                        {Number(resp.topCliente.gasto || 0).toFixed(2)} €
                      </div>
                    )}

                    {Array.isArray(resp.topProductos) && resp.topProductos.length > 0 && (
                      <>
                        <h3 style={{ marginTop: 8 }}>Top productos</h3>
                        <div className="table-wrap">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Producto</th>
                                <th style={{ textAlign: 'right' }}>Unidades</th>
                                <th style={{ textAlign: 'right' }}>Ingresos</th>
                              </tr>
                            </thead>
                            <tbody>
                              {resp.topProductos.map((p, idx) => (
                                <tr key={idx}>
                                  <td>{p.producto}</td>
                                  <td style={{ textAlign: 'right' }}>{p.unidades}</td>
                                  <td style={{ textAlign: 'right' }}>{Number(p.ingresos || 0).toFixed(2)} €</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Barra de entrada con textarea auto-creciente y atajos */}
          <div>
            <div className="chat-inputbar">
              <AutoTextarea
                value={prompt}
                onChange={setPrompt}
                onKeyDown={handleKeyDown}
                minRows={1}
                maxRows={8}
                className="chat-textarea"
                placeholder="Escribe tu mensaje…"
              />
              <button type="submit" className="btn primary send-btn" disabled={loading}>
                {loading ? 'Consultando…' : 'Enviar'}
              </button>
            </div>
            <div className="help-hint" style={{ marginTop: 6 }}>
              Atajos: <span className="kbd">Enter</span> enviar ·{' '}
              <span className="kbd">Ctrl/Cmd + Enter</span> salto de línea · <span className="kbd">Esc</span> limpiar
            </div>
          </div>
        </form>

        {/* Mensajes del envío por email */}
        {mailErr && (
          <div style={{ marginTop: 12, color: '#b91c1c', background: '#fee2e2', padding: 10, borderRadius: 8 }}>
            {mailErr}
          </div>
        )}
        {mailMsg && (
          <div style={{ marginTop: 12, color: '#065f46', background: '#d1fae5', padding: 10, borderRadius: 8 }}>
            {mailMsg}
          </div>
        )}
      </div>
    </div>
  );
}
