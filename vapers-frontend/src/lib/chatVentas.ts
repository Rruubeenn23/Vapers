// src/lib/chatVentas.js
const API_BASE = process.env.REACT_APP_API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'https://api-vapers.onrender.com';

export async function chatVentas(req) {
  const r = await fetch(`${API_BASE}/api/chat-ventas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req || {}),
  });
  if (!r.ok) {
    const text = await r.text();
    return { ok: false, error: `HTTP ${r.status}: ${text}` };
    }
  try {
    return await r.json();
  } catch (e) {
    return { ok: false, error: 'Respuesta no JSON' };
  }
}
