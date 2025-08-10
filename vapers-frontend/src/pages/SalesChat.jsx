// src/components/SalesChat.jsx
import React, { useState } from 'react';
import { chatVentas } from '../lib/chatVentas';

export default function SalesChat() {
  const [prompt, setPrompt] = useState('¿Quién ha comprado más?');
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null);
  const [error, setError] = useState(null);

  async function onAsk(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResp(null);
    try {
      const data = await chatVentas({ prompt, days });
      if (!data.ok) setError(data.error || 'Error desconocido');
      setResp(data);
    } catch (err) {
      setError(err?.message || 'Error de red');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '2rem auto', fontFamily: 'system-ui, Arial, sans-serif' }}>
      <h2>Chat de Ventas</h2>
      <form onSubmit={onAsk} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Escribe tu pregunta (p. ej., ¿Quién ha comprado más?)"
          style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd' }}
        />
        <input
          type="number"
          min={1}
          max={90}
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value || '7', 10))}
          style={{ width: 100, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd' }}
          title="Días a analizar"
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 16px', borderRadius: 8, border: '1px solid #111',
            background: loading ? '#999' : '#111', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Consultando…' : 'Preguntar'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 16, color: '#b91c1c', background: '#fee2e2', padding: 12, borderRadius: 8 }}>
          {error}
        </div>
      )}

      {resp && (
        <div style={{ marginTop: 24, border: '1px solid #eee', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ background: '#111', color: '#fff', padding: 12 }}>
            Resultado {resp.intent ? `— ${resp.intent}` : ''}
          </div>
          <div style={{ padding: 16 }}>
            <p><strong>Respuesta:</strong> {resp.answer || '(sin texto)'}</p>

            {resp.period && (
              <p>
                <strong>Periodo:</strong>{' '}
                {new Date(resp.period.from).toLocaleString('es-ES')} — {new Date(resp.period.to).toLocaleString('es-ES')}
              </p>
            )}

            {resp.metrics && (
              <ul>
                <li>Ingreso total: {Number(resp.metrics.ingresoTotal || 0).toFixed(2)} €</li>
                <li>Nº ventas: {resp.metrics.numVentas}</li>
                <li>Unidades: {resp.metrics.unidades}</li>
                <li>Ticket medio: {Number(resp.metrics.ticketMedio || 0).toFixed(2)} €</li>
              </ul>
            )}

            {resp.topCliente && (
              <p><strong>Top cliente:</strong> {resp.topCliente.nombre} — {Number(resp.topCliente.gasto || 0).toFixed(2)} €</p>
            )}

            {Array.isArray(resp.topProductos) && resp.topProductos.length > 0 && (
              <>
                <h4>Top productos</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6' }}>
                      <th style={{ border: '1px solid #e5e7eb', padding: 8, textAlign: 'left' }}>Producto</th>
                      <th style={{ border: '1px solid #e5e7eb', padding: 8, textAlign: 'right' }}>Unidades</th>
                      <th style={{ border: '1px solid #e5e7eb', padding: 8, textAlign: 'right' }}>Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resp.topProductos.map((p, idx) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #e5e7eb', padding: 8 }}>{p.producto}</td>
                        <td style={{ border: '1px solid #e5e7eb', padding: 8, textAlign: 'right' }}>{p.unidades}</td>
                        <td style={{ border: '1px solid #e5e7eb', padding: 8, textAlign: 'right' }}>{Number(p.ingresos || 0).toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
